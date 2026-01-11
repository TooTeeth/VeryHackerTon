// services/voting.service.ts
// On-chain first + Supabase caching hybrid version

import { getSupabaseClient } from "../lib/supabaseClient";
const supabase = getSupabaseClient();

// ========== TYPES ==========
export interface VotingSession {
  id: number;
  stage_id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // On-chain data
  proposalId?: number;
  isOnChain?: boolean;
}

export interface VotingOption {
  id: number;
  session_id: number;
  choice_id: number;
  choice_text: string;
  vote_count: number;
  created_at: string;
}

export interface Vote {
  id: number;
  session_id: number;
  option_id: number;
  wallet_address: string;
  character_id?: number;
  created_at: string;
}

export interface VotingSessionWithOptions extends VotingSession {
  options: VotingOption[];
  totalVotes: number;
  eligibleVoters: number;
  userVote?: number;
  winningOptionId?: number;
  needsRevote?: boolean;
  game_id?: string;
  // Deletion info
  is_deleted?: boolean;
  delete_reason?: string;
  deleted_by?: string;
  deleted_at?: string;
}

// ========== PROPOSAL TYPES ==========
export interface Proposal {
  id: number;
  game_id: string;
  stage_slug?: string;
  title: string;
  description?: string;
  proposer_wallet: string;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  upvotes: number;
  downvotes: number;
  admin_notes?: string;
  converted_session_id?: number;
  created_at: string;
  updated_at: string;
  userVote?: 'up' | 'down' | null;
}

// Official game list
export const OFFICIAL_GAMES = ['vygddrasil', 'vpunk', 'obfuscate'] as const;
export type OfficialGame = typeof OFFICIAL_GAMES[number];

// ========== VOTING SERVICE ==========
export class VotingService {
  /**
   * Get all active voting sessions
   */
  static async getActiveSessions(): Promise<VotingSessionWithOptions[]> {
    try {
      const now = new Date().toISOString();

      const { data: sessions, error } = await supabase
        .from("voting_sessions")
        .select("*")
        .eq("is_active", true)
        .lte("start_time", now)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!sessions || sessions.length === 0) return [];

      // Total eligible voters = unique wallets that created at least one character
      const { data: uniqueWallets } = await supabase
        .from("vygddrasilclass")
        .select("wallet_address");

      const uniqueWalletSet = new Set((uniqueWallets || []).map(w => w.wallet_address?.toLowerCase()));
      const eligibleVoters = uniqueWalletSet.size;

      const sessionsWithOptions = await Promise.all(
        sessions.map(async (session) => {
          const { data: options } = await supabase
            .from("voting_options")
            .select("*")
            .eq("session_id", session.id)
            .order("id", { ascending: true });

          const totalVotes = (options || []).reduce((sum, opt) => sum + (opt.vote_count || 0), 0);

          // Fix timezone: ensure end_time is parsed as UTC
          const endTimeStr = session.end_time.endsWith('Z') ? session.end_time : session.end_time + 'Z';
          const isEnded = new Date(endTimeStr) < new Date();
          const { winnerId, needsRevote } = this.findWinningOptionWithRevote(
            (options || []).map(opt => ({ id: opt.id, voteCount: opt.vote_count || 0 })),
            totalVotes,
            eligibleVoters,
            isEnded
          );

          return {
            ...session,
            isOnChain: false,
            options: options || [],
            totalVotes,
            eligibleVoters,
            winningOptionId: winnerId,
            needsRevote,
          } as VotingSessionWithOptions;
        })
      );

      return sessionsWithOptions;
    } catch (error) {
      console.error("Error fetching voting sessions:", error);
      return [];
    }
  }

  /**
   * Get session details by ID
   */
  static async getSessionById(sessionId: number, walletAddress?: string): Promise<VotingSessionWithOptions | null> {
    return this.getSessionByIdFromSupabase(sessionId, walletAddress);
  }

  /**
   * Get session from Supabase (fallback)
   */
  private static async getSessionByIdFromSupabase(
    sessionId: number,
    walletAddress?: string
  ): Promise<VotingSessionWithOptions | null> {
    try {
      const { data: session, error } = await supabase
        .from("voting_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error || !session) return null;

      const { data: options } = await supabase
        .from("voting_options")
        .select("*")
        .eq("session_id", sessionId)
        .order("id", { ascending: true });

      const totalVotes = (options || []).reduce((sum, opt) => sum + (opt.vote_count || 0), 0);

      // Total eligible voters = unique wallets that created at least one character
      const { data: uniqueWallets } = await supabase
        .from("vygddrasilclass")
        .select("wallet_address");

      // Count only unique wallet addresses
      const uniqueWalletSet = new Set((uniqueWallets || []).map(w => w.wallet_address?.toLowerCase()));
      const eligibleVoters = uniqueWalletSet.size;

      let userVote: number | undefined;
      if (walletAddress) {
        const { data: vote } = await supabase
          .from("votes")
          .select("option_id")
          .eq("session_id", sessionId)
          .eq("wallet_address", walletAddress)
          .single();

        userVote = vote?.option_id;
      }

      // Fix timezone: ensure end_time is parsed as UTC
      const endTimeStr = session.end_time.endsWith('Z') ? session.end_time : session.end_time + 'Z';
      const isEnded = new Date(endTimeStr) < new Date();
      const { winnerId, needsRevote } = this.findWinningOptionWithRevote(
        (options || []).map(opt => ({ id: opt.id, voteCount: opt.vote_count || 0 })),
        totalVotes,
        eligibleVoters,
        isEnded
      );

      return {
        ...session,
        proposalId: session.proposal_id,
        isOnChain: !!session.proposal_id,
        options: options || [],
        totalVotes,
        eligibleVoters,
        userVote,
        winningOptionId: winnerId,
        needsRevote,
      };
    } catch (error) {
      console.error("Error fetching session:", error);
      return null;
    }
  }

  /**
   * Vote - on-chain first
   */
  static async vote(
    sessionId: number,
    optionId: number,
    walletAddress: string,
    characterId?: number
  ): Promise<{ success: boolean; error?: string }> {
    // On-chain voting is handled directly in VotingModal.tsx
    // This function is maintained for Supabase caching

    try {
      // Verify session
      const { data: session } = await supabase
        .from("voting_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!session) {
        return { success: false, error: "Voting session not found" };
      }

      const now = new Date();
      // Fix timezone: ensure times are parsed as UTC
      const startTimeStr = session.start_time.endsWith('Z') ? session.start_time : session.start_time + 'Z';
      const endTimeStr = session.end_time.endsWith('Z') ? session.end_time : session.end_time + 'Z';
      if (now < new Date(startTimeStr)) {
        return { success: false, error: "Voting has not started yet" };
      }
      if (now > new Date(endTimeStr)) {
        return { success: false, error: "Voting has ended" };
      }

      // Check duplicate vote
      const { data: existingVote } = await supabase
        .from("votes")
        .select("id")
        .eq("session_id", sessionId)
        .eq("wallet_address", walletAddress)
        .single();

      if (existingVote) {
        return { success: false, error: "You have already voted" };
      }

      // Record vote (for caching)
      const { error: voteError } = await supabase.from("votes").insert({
        session_id: sessionId,
        option_id: optionId,
        wallet_address: walletAddress,
        character_id: characterId,
      });

      if (voteError) throw voteError;

      // Increment vote count
      const { error: updateError } = await supabase.rpc("increment_vote_count", {
        p_option_id: optionId,
      });

      if (updateError) {
        const { data: option } = await supabase
          .from("voting_options")
          .select("vote_count")
          .eq("id", optionId)
          .single();

        await supabase
          .from("voting_options")
          .update({ vote_count: (option?.vote_count || 0) + 1 })
          .eq("id", optionId);
      }

      return { success: true };
    } catch (error) {
      console.error("Error voting:", error);
      return { success: false, error: "Error occurred while voting" };
    }
  }

  /**
   * Delete voting session - marks session as deleted with reason
   * Only admin or session creator can delete
   */
  static async deleteSession(
    sessionId: number,
    walletAddress: string,
    deleteReason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check permission (admin or game operator)
      const isAdminUser = await this.isAdmin(walletAddress);

      // Get session info to check game_id for operator permission
      const { data: session } = await supabase
        .from("voting_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!session) {
        return { success: false, error: "Voting session not found" };
      }

      // Check if user is game operator for this game
      let hasPermission = isAdminUser;
      if (!hasPermission && session.game_id) {
        hasPermission = await this.isGameOperator(session.game_id, walletAddress);
      }

      if (!hasPermission) {
        return { success: false, error: "Permission denied. Only admin or game operator can delete voting sessions." };
      }

      // Mark session as deleted (soft delete) with reason
      const { error: updateError } = await supabase
        .from("voting_sessions")
        .update({
          is_active: false,
          is_deleted: true,
          delete_reason: deleteReason,
          deleted_by: walletAddress,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error("Error deleting session:", error);
      return { success: false, error: "Error occurred while deleting voting session" };
    }
  }

  /**
   * Check if user can delete a voting session
   */
  static async canDeleteSession(
    sessionId: number,
    walletAddress: string
  ): Promise<boolean> {
    try {
      const isAdminUser = await this.isAdmin(walletAddress);
      if (isAdminUser) return true;

      // Get session to check game_id
      const { data: session } = await supabase
        .from("voting_sessions")
        .select("game_id")
        .eq("id", sessionId)
        .single();

      if (session?.game_id) {
        return this.isGameOperator(session.game_id, walletAddress);
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check active voting session for stage
   */
  static async getActiveSessionForStage(stageId: number): Promise<VotingSessionWithOptions | null> {
    try {
      const now = new Date().toISOString();

      const { data: session, error } = await supabase
        .from("voting_sessions")
        .select("*")
        .eq("stage_id", stageId)
        .eq("is_active", true)
        .lte("start_time", now)
        .single();

      if (error || !session) return null;

      return this.getSessionById(session.id);
    } catch (error) {
      console.error("Error fetching session for stage:", error);
      return null;
    }
  }

  /**
   * Check if choice won the vote
   */
  static async isChoiceWinner(choiceId: number, _proposalId?: number): Promise<boolean> {
    try {
      const { data: option } = await supabase
        .from("voting_options")
        .select("id, session_id, vote_count")
        .eq("choice_id", choiceId)
        .single();

      if (!option) return true;

      const session = await this.getSessionById(option.session_id);
      if (!session) return true;

      // Fix timezone: ensure end_time is parsed as UTC
      const endTimeStr = session.end_time.endsWith('Z') ? session.end_time : session.end_time + 'Z';
      if (new Date(endTimeStr) > new Date()) {
        return false;
      }

      const halfVotes = session.totalVotes / 2;
      return option.vote_count > halfVotes;
    } catch (error) {
      console.error("Error checking choice winner:", error);
      return true;
    }
  }

  /**
   * Create voting session (for operators)
   */
  static async createSession(
    stageId: number,
    title: string,
    description: string,
    startTime: Date,
    endTime: Date,
    choiceIds: number[],
    _useOnChain: boolean = false
  ): Promise<{ success: boolean; sessionId?: number; proposalId?: number; error?: string }> {
    // Get choice texts
    const { data: choices } = await supabase
      .from("Vygddrasilchoice")
      .select("id, choice")
      .in("id", choiceIds);

    if (!choices || choices.length === 0) {
      return { success: false, error: "Choices not found" };
    }

    try {
      const { data: session, error: sessionError } = await supabase
        .from("voting_sessions")
        .insert({
          stage_id: stageId,
          title,
          description,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (sessionError || !session) throw sessionError;

      const options = choices.map((choice) => ({
        session_id: session.id,
        choice_id: choice.id,
        choice_text: choice.choice,
        vote_count: 0,
      }));

      await supabase.from("voting_options").insert(options);

      return { success: true, sessionId: session.id };
    } catch (error) {
      console.error("Error creating session:", error);
      return { success: false, error: "Error occurred while creating session" };
    }
  }

  /**
   * Start revote - extends end_time and resets votes
   * Keeps existing votes but extends the voting period
   */
  static async startRevote(
    sessionId: number,
    walletAddress: string,
    durationMinutes: number = 1 // 기본 1분 (60초)
  ): Promise<{ success: boolean; newEndTime?: string; error?: string }> {
    try {
      // Check permission
      const canDelete = await this.canDeleteSession(sessionId, walletAddress);
      if (!canDelete) {
        return { success: false, error: "Permission denied" };
      }

      // Calculate new end time
      const now = new Date();
      const newEndTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

      // Update session with new end_time
      const { error: updateError } = await supabase
        .from("voting_sessions")
        .update({
          end_time: newEndTime.toISOString(),
          is_active: true,
          updated_at: now.toISOString(),
        })
        .eq("id", sessionId);

      if (updateError) throw updateError;

      return { success: true, newEndTime: newEndTime.toISOString() };
    } catch (error) {
      console.error("Error starting revote:", error);
      return { success: false, error: "Failed to start revote" };
    }
  }

  /**
   * End voting session (for operators)
   */
  static async endSession(sessionId: number): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from("voting_sessions")
        .update({
          is_active: false,
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error ending session:", error);
      return { success: false };
    }
  }

  // ========== HELPER FUNCTIONS ==========

  /**
   * Find majority winner
   * @returns { winnerId, needsRevote }
   * - winnerId: Choice ID that won majority (undefined if none)
   * - needsRevote: Voting ended but no majority, revote needed
   */
  static findWinningOptionWithRevote(
    options: { id: number; voteCount: number }[],
    totalVotes: number,
    eligibleVoters: number,
    isEnded: boolean
  ): { winnerId?: number; needsRevote: boolean } {
    // If voting hasn't ended yet, no winner and no revote needed
    if (!isEnded) {
      return { winnerId: undefined, needsRevote: false };
    }

    // Voting ended - check participation rate
    // Need at least 50% of eligible voters to participate for valid result
    const participationRate = eligibleVoters > 0 ? totalVotes / eligibleVoters : 0;
    const MIN_PARTICIPATION = 0.5; // 50% minimum participation

    if (totalVotes === 0 || participationRate < MIN_PARTICIPATION) {
      // Not enough participation - revote needed
      return { winnerId: undefined, needsRevote: true };
    }

    // Enough participation - check for majority winner
    // Majority = more than half of total votes cast
    const halfVotes = totalVotes / 2;
    const winner = options.find(opt => opt.voteCount > halfVotes);

    if (winner) {
      return { winnerId: winner.id, needsRevote: false };
    }

    // No majority winner - revote needed
    return { winnerId: undefined, needsRevote: true };
  }

  private static findWinningOption(
    options: { id: number; voteCount: number }[],
    totalVotes: number
  ): number | undefined {
    if (totalVotes === 0) return undefined;

    const halfVotes = totalVotes / 2;
    const winner = options.find(opt => opt.voteCount > halfVotes);
    return winner?.id;
  }

  // ========== PERMISSION FUNCTIONS ==========

  /**
   * Check if user is admin
   */
  static async isAdmin(walletAddress: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from("admins")
        .select("id")
        .eq("wallet_address", walletAddress.toLowerCase())
        .single();

      return !!data;
    } catch {
      return false;
    }
  }

  /**
   * Check if user is game operator
   */
  static async isGameOperator(gameId: string, walletAddress: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from("game_operators")
        .select("id")
        .eq("game_id", gameId)
        .eq("wallet_address", walletAddress.toLowerCase())
        .single();

      return !!data;
    } catch {
      return false;
    }
  }

  /**
   * Check if user is stream creator
   */
  static async isStreamCreator(streamId: number, walletAddress: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from("Stream")
        .select("Creator")
        .eq("id", streamId)
        .single();

      return data?.Creator?.toLowerCase() === walletAddress.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Check voting creation permission
   * - Official games: admin only
   * - User created games: game operator or stream creator
   */
  static async canCreateVoting(gameId: string, walletAddress: string): Promise<boolean> {
    const isOfficial = OFFICIAL_GAMES.includes(gameId as OfficialGame);

    if (isOfficial) {
      return this.isAdmin(walletAddress);
    } else {
      // Check from game_operators table
      const isOperator = await this.isGameOperator(gameId, walletAddress);
      if (isOperator) return true;

      // Check Creator from Stream table for stream_123 format
      if (gameId.startsWith("stream_")) {
        const streamId = parseInt(gameId.replace("stream_", ""), 10);
        if (!isNaN(streamId)) {
          return this.isStreamCreator(streamId, walletAddress);
        }
      }

      return false;
    }
  }

  // ========== PROPOSAL FUNCTIONS ==========

  /**
   * Get proposal list
   */
  static async getProposals(
    gameId: string,
    status?: string,
    walletAddress?: string
  ): Promise<Proposal[]> {
    try {
      let query = supabase
        .from("proposals")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data: proposals, error } = await query;

      if (error) throw error;

      // 사용자의 투표 정보 추가
      if (walletAddress && proposals) {
        const { data: votes } = await supabase
          .from("proposal_votes")
          .select("proposal_id, vote_type")
          .eq("wallet_address", walletAddress.toLowerCase())
          .in("proposal_id", proposals.map(p => p.id));

        const voteMap = new Map(votes?.map(v => [v.proposal_id, v.vote_type]));

        return proposals.map(p => ({
          ...p,
          userVote: voteMap.get(p.id) || null,
        }));
      }

      return proposals || [];
    } catch (error) {
      console.error("Error fetching proposals:", error);
      return [];
    }
  }

  /**
   * Get my proposals only
   */
  static async getMyProposals(
    gameId: string,
    walletAddress: string
  ): Promise<Proposal[]> {
    try {
      const { data: proposals, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("game_id", gameId)
        .eq("proposer_wallet", walletAddress.toLowerCase())
        .order("created_at", { ascending: false });

      if (error) throw error;

      return proposals || [];
    } catch (error) {
      console.error("Error fetching my proposals:", error);
      return [];
    }
  }

  /**
   * Get proposals from all games (for DAO view)
   */
  static async getAllProposals(
    status?: 'pending' | 'approved' | 'rejected' | 'converted',
    walletAddress?: string
  ): Promise<Proposal[]> {
    try {
      let query = supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data: proposals, error } = await query;

      if (error) throw error;

      // Add user vote info
      if (walletAddress && proposals) {
        const { data: votes } = await supabase
          .from("proposal_votes")
          .select("proposal_id, vote_type")
          .eq("wallet_address", walletAddress.toLowerCase())
          .in("proposal_id", proposals.map(p => p.id));

        const voteMap = new Map(votes?.map(v => [v.proposal_id, v.vote_type]));

        return proposals.map(p => ({
          ...p,
          userVote: voteMap.get(p.id) || null,
        }));
      }

      return proposals || [];
    } catch (error) {
      console.error("Error fetching all proposals:", error);
      return [];
    }
  }

  /**
   * Create proposal
   */
  static async createProposal(
    gameId: string,
    title: string,
    description: string,
    proposerWallet: string,
    stageSlug?: string
  ): Promise<{ success: boolean; proposalId?: number; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("proposals")
        .insert({
          game_id: gameId,
          title,
          description,
          proposer_wallet: proposerWallet.toLowerCase(),
          stage_slug: stageSlug,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, proposalId: data.id };
    } catch (error) {
      console.error("Error creating proposal:", error);
      return { success: false, error: "Failed to create proposal" };
    }
  }

  /**
   * Vote on proposal (upvote/downvote)
   */
  static async voteOnProposal(
    proposalId: number,
    walletAddress: string,
    voteType: "up" | "down"
  ): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase.rpc("vote_on_proposal", {
        p_proposal_id: proposalId,
        p_wallet_address: walletAddress.toLowerCase(),
        p_vote_type: voteType,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error voting on proposal:", error);
      return { success: false };
    }
  }

  /**
   * Update proposal status (for admin/operators)
   * Automatically creates voting session on approval
   */
  static async updateProposalStatus(
    proposalId: number,
    status: "approved" | "rejected",
    adminNotes?: string,
    durationMinutes: number = 7 * 24 * 60
  ): Promise<{ success: boolean; sessionId?: number; error?: string }> {
    try {
      // Get proposal info
      const { data: proposal, error: propError } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", proposalId)
        .single();

      if (propError || !proposal) {
        return { success: false, error: "Proposal not found" };
      }

      // Auto-create voting session on approval
      if (status === "approved" && proposal.stage_slug) {
        // Get stage ID
        const { data: stage } = await supabase
          .from("Vygddrasilstage")
          .select("id")
          .eq("slug", proposal.stage_slug)
          .single();

        if (stage) {
          // Get choices for this stage
          const { data: choices } = await supabase
            .from("Vygddrasilchoice")
            .select("id, choice")
            .eq("mainstream_slug", proposal.stage_slug);

          if (choices && choices.length > 0) {
            // Create voting session (specified duration in minutes)
            const now = new Date();
            const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

            const { data: session, error: sessionError } = await supabase
              .from("voting_sessions")
              .insert({
                stage_id: stage.id,
                title: proposal.title,
                description: proposal.description,
                start_time: now.toISOString(),
                end_time: endTime.toISOString(),
                is_active: true,
                game_id: proposal.game_id,
              })
              .select()
              .single();

            if (!sessionError && session) {
              // Add choices
              const options = choices.map((choice) => ({
                session_id: session.id,
                choice_id: choice.id,
                choice_text: choice.choice,
                vote_count: 0,
              }));

              await supabase.from("voting_options").insert(options);

              // Update proposal status (converted)
              await supabase
                .from("proposals")
                .update({
                  status: "converted",
                  converted_session_id: session.id,
                  admin_notes: adminNotes,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", proposalId);

              return { success: true, sessionId: session.id };
            }
          }
        }
      }

      // Simple status update for rejection or missing stage
      const { error } = await supabase
        .from("proposals")
        .update({
          status,
          admin_notes: adminNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposalId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error updating proposal:", error);
      return { success: false, error: "Failed to update status" };
    }
  }

  /**
   * Convert proposal to voting session (for admin/operators)
   */
  static async convertProposalToVoting(
    proposalId: number,
    stageId: number,
    choiceIds: number[],
    durationMinutes: number,
    gameId: string
  ): Promise<{ success: boolean; sessionId?: number; error?: string }> {
    try {
      // Get proposal info
      const { data: proposal, error: propError } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", proposalId)
        .single();

      if (propError || !proposal) {
        return { success: false, error: "Proposal not found" };
      }

      // Get choice info
      const { data: choices } = await supabase
        .from("Vygddrasilchoice")
        .select("id, choice")
        .in("id", choiceIds);

      if (!choices || choices.length === 0) {
        return { success: false, error: "Choices not found" };
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

      // Create voting session
      const { data: session, error: sessionError } = await supabase
        .from("voting_sessions")
        .insert({
          stage_id: stageId,
          title: proposal.title,
          description: proposal.description,
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          is_active: true,
          game_id: gameId,
        })
        .select()
        .single();

      if (sessionError || !session) {
        return { success: false, error: "Failed to create voting session" };
      }

      // Add choices
      const options = choices.map((choice) => ({
        session_id: session.id,
        choice_id: choice.id,
        choice_text: choice.choice,
        vote_count: 0,
      }));

      await supabase.from("voting_options").insert(options);

      // Update proposal status
      await supabase
        .from("proposals")
        .update({
          status: "converted",
          converted_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposalId);

      return { success: true, sessionId: session.id };
    } catch (error) {
      console.error("Error converting proposal:", error);
      return { success: false, error: "Failed to convert to voting" };
    }
  }

  /**
   * Create voting session directly (for admin/operators)
   */
  static async createVotingSession(
    gameId: string,
    stageId: number,
    title: string,
    description: string,
    choiceIds: number[],
    durationMinutes: number
  ): Promise<{ success: boolean; sessionId?: number; error?: string }> {
    try {
      // Get choice info
      const { data: choices } = await supabase
        .from("Vygddrasilchoice")
        .select("id, choice")
        .in("id", choiceIds);

      if (!choices || choices.length === 0) {
        return { success: false, error: "Choices not found" };
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

      // Create voting session
      console.log("[createVotingSession] Creating session:", {
        gameId,
        durationMinutes,
        now: now.toISOString(),
        endTime: endTime.toISOString()
      });
      const { data: session, error: sessionError } = await supabase
        .from("voting_sessions")
        .insert({
          stage_id: stageId,
          title,
          description,
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          is_active: true,
          game_id: gameId,
        })
        .select()
        .single();

      console.log("[createVotingSession] Result:", { session, error: sessionError });
      if (sessionError || !session) {
        return { success: false, error: "Failed to create voting session" };
      }

      // Add choices
      const options = choices.map((choice) => ({
        session_id: session.id,
        choice_id: choice.id,
        choice_text: choice.choice,
        vote_count: 0,
      }));

      await supabase.from("voting_options").insert(options);

      return { success: true, sessionId: session.id };
    } catch (error) {
      console.error("Error creating voting session:", error);
      return { success: false, error: "Failed to create voting" };
    }
  }

  /**
   * Create voting session by stage (auto-fetches all choices for the stage)
   */
  static async createVotingSessionByStage(
    gameId: string,
    stageId: number,
    stageSlug: string,
    title: string,
    description: string,
    durationMinutes: number,
    proposalId?: number
  ): Promise<{ success: boolean; sessionId?: number; error?: string }> {
    try {
      // Get all choices for this stage
      const { data: choices } = await supabase
        .from("Vygddrasilchoice")
        .select("id, choice")
        .eq("mainstream_slug", stageSlug)
        .order("id", { ascending: true });

      if (!choices || choices.length < 2) {
        return { success: false, error: "스테이지에 최소 2개의 선택지가 필요합니다" };
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

      // Create voting session
      console.log("[createVotingSessionByStage] Creating session:", {
        gameId,
        stageSlug,
        choiceCount: choices.length,
        durationMinutes,
        proposalId,
        now: now.toISOString(),
        endTime: endTime.toISOString()
      });

      const { data: session, error: sessionError } = await supabase
        .from("voting_sessions")
        .insert({
          stage_id: stageId,
          title,
          description,
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          is_active: true,
          game_id: gameId,
          proposal_id: proposalId,
        })
        .select()
        .single();

      if (sessionError || !session) {
        console.error("[createVotingSessionByStage] Error:", sessionError);
        return { success: false, error: "Failed to create voting session" };
      }

      // Add all choices from the stage
      const options = choices.map((choice) => ({
        session_id: session.id,
        choice_id: choice.id,
        choice_text: choice.choice,
        vote_count: 0,
      }));

      await supabase.from("voting_options").insert(options);

      console.log("[createVotingSessionByStage] Created session:", session.id, "with", choices.length, "options");
      return { success: true, sessionId: session.id };
    } catch (error) {
      console.error("Error creating voting session by stage:", error);
      return { success: false, error: "Failed to create voting" };
    }
  }

  /**
   * Get choices by stage
   */
  static async getChoicesByStage(stageSlug: string): Promise<{ id: number; choice: string }[]> {
    try {
      const { data, error } = await supabase
        .from("Vygddrasilchoice")
        .select("id, choice")
        .eq("mainstream_slug", stageSlug)
        .order("id", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching choices:", error);
      return [];
    }
  }

  /**
   * Get stage list
   */
  static async getStages(): Promise<{ id: number; slug: string; title: string }[]> {
    try {
      const { data, error } = await supabase
        .from("Vygddrasilstage")
        .select("id, slug, title")
        .order("id", { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching stages:", error);
      return [];
    }
  }

  /**
   * Get user created games (from Stream table)
   */
  static async getUserCreatedGames(): Promise<{ id: number; title: string }[]> {
    try {
      const { data, error } = await supabase
        .from("Stream")
        .select("id, Title")
        .order("id", { ascending: false });

      if (error) {
        console.error("Error fetching user created games:", error.message, error.code, error.details);
        return [];
      }

      return (data || []).map(g => ({
        id: g.id,
        title: g.Title,
      }));
    } catch (error) {
      console.error("Error fetching user created games (catch):", error);
      return [];
    }
  }

  // Cache: eligible voters count (valid for 10 minutes)
  private static eligibleVotersCache: { count: number; timestamp: number } | null = null;
  private static CACHE_TTL = 10 * 60 * 1000;

  /**
   * Get voting sessions by game (optimized: parallel query execution)
   */
  static async getSessionsByGame(gameId: string, walletAddress?: string): Promise<VotingSessionWithOptions[]> {
    try {
      console.log("[getSessionsByGame] Loading sessions for game:", gameId);
      const now = Date.now();
      const useCache = this.eligibleVotersCache && (now - this.eligibleVotersCache.timestamp) < this.CACHE_TTL;

      // Execute all queries in parallel
      const [sessionsResult, eligibleResult, userVotesResult] = await Promise.all([
        // 1. Sessions + options
        supabase
          .from("voting_sessions")
          .select(`*, voting_options (*)`)
          .eq("game_id", gameId)
          .order("created_at", { ascending: false }),
        // 2. Eligible voters - unique wallet count (query only when cache is empty)
        useCache
          ? Promise.resolve({ count: this.eligibleVotersCache!.count })
          : supabase.from("vygddrasilclass").select("wallet_address"),
        // 3. User votes (fetch all then filter - faster)
        walletAddress
          ? supabase.from("votes").select("session_id, option_id").eq("wallet_address", walletAddress)
          : Promise.resolve({ data: [] })
      ]);

      // Update cache - calculate unique wallet count
      let eligibleVoters = 0;
      if (useCache) {
        eligibleVoters = this.eligibleVotersCache!.count;
      } else {
        const wallets = (eligibleResult as { data: Array<{ wallet_address: string }> }).data || [];
        const uniqueWallets = new Set(wallets.map(w => w.wallet_address?.toLowerCase()));
        eligibleVoters = uniqueWallets.size;
        this.eligibleVotersCache = { count: eligibleVoters, timestamp: now };
      }

      const sessions = sessionsResult.data;
      console.log("[getSessionsByGame] Query result:", { error: sessionsResult.error, count: sessions?.length, gameId });
      if (sessionsResult.error || !sessions?.length) return [];

      // User vote map
      const userVoteMap = new Map<number, number>();
      ((userVotesResult as { data: Array<{ session_id: number; option_id: number }> }).data || [])
        .forEach(v => userVoteMap.set(v.session_id, v.option_id));

      // Result mapping (synchronous for speed)
      return sessions.map((session) => {
        const options = session.voting_options || [];
        const totalVotes = options.reduce((sum: number, opt: VotingOption) => sum + (opt.vote_count || 0), 0);
        // Fix timezone: ensure end_time is parsed as UTC
        const endTimeStr = session.end_time.endsWith('Z') ? session.end_time : session.end_time + 'Z';
        const isEnded = new Date(endTimeStr) < new Date();

        const { winnerId, needsRevote } = this.findWinningOptionWithRevote(
          options.map((opt: VotingOption) => ({ id: opt.id, voteCount: opt.vote_count || 0 })),
          totalVotes,
          eligibleVoters,
          isEnded
        );

        return {
          ...session,
          proposalId: session.proposal_id,
          isOnChain: !!session.proposal_id,
          options,
          totalVotes,
          eligibleVoters,
          userVote: userVoteMap.get(session.id),
          winningOptionId: winnerId,
          needsRevote,
        } as VotingSessionWithOptions;
      });
    } catch (error) {
      console.error("Error fetching sessions by game:", error);
      return [];
    }
  }
}

export default VotingService;
