// services/voting.service.ts
// 온체인 우선 + Supabase 캐싱 하이브리드 버전

import { supabase } from "../lib/supabaseClient";

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
  // 온체인 데이터 추가
  proposalId?: number; // 온체인 proposal ID
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
  eligibleVoters: number; // 총 투표 가능자 수
  userVote?: number;
  winningOptionId?: number;
  needsRevote?: boolean; // 과반수 미달 시 재투표 필요
  game_id?: string;
}

// ========== 제안 관련 TYPES ==========
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
  // 추가 정보
  userVote?: 'up' | 'down' | null;
}

// 공식 게임 목록
export const OFFICIAL_GAMES = ['vygddrasil', 'vpunk', 'obfuscate'] as const;
export type OfficialGame = typeof OFFICIAL_GAMES[number];

// ========== VOTING SERVICE ==========
export class VotingService {
  /**
   * 모든 활성 투표 세션 가져오기
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

      // 총 투표 가능자 수 = 비그드라실에 캐릭터를 하나라도 생성한 고유 지갑 수
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

          const isEnded = new Date(session.end_time) < new Date();
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
   * 특정 세션의 상세 정보 가져오기
   */
  static async getSessionById(sessionId: number, walletAddress?: string): Promise<VotingSessionWithOptions | null> {
    // Supabase에서 세션 로드
    return this.getSessionByIdFromSupabase(sessionId, walletAddress);
  }

  /**
   * Supabase에서 세션 가져오기 (fallback)
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

      // 총 투표 가능자 수 = 비그드라실에 캐릭터를 하나라도 생성한 고유 지갑 수
      const { data: uniqueWallets } = await supabase
        .from("vygddrasilclass")
        .select("wallet_address");

      // 고유 지갑 주소만 카운트
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

      const isEnded = new Date(session.end_time) < new Date();
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
   * 투표하기 - 온체인 우선
   */
  static async vote(
    sessionId: number,
    optionId: number,
    walletAddress: string,
    characterId?: number
  ): Promise<{ success: boolean; error?: string }> {
    // 온체인 투표는 VotingModal.tsx에서 직접 처리
    // 이 함수는 Supabase 캐싱용으로 유지

    try {
      // 세션 확인
      const { data: session } = await supabase
        .from("voting_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (!session) {
        return { success: false, error: "투표 세션을 찾을 수 없습니다" };
      }

      const now = new Date();
      if (now < new Date(session.start_time)) {
        return { success: false, error: "투표가 아직 시작되지 않았습니다" };
      }
      if (now > new Date(session.end_time)) {
        return { success: false, error: "투표가 종료되었습니다" };
      }

      // 중복 투표 확인
      const { data: existingVote } = await supabase
        .from("votes")
        .select("id")
        .eq("session_id", sessionId)
        .eq("wallet_address", walletAddress)
        .single();

      if (existingVote) {
        return { success: false, error: "이미 투표하셨습니다" };
      }

      // 투표 기록 (캐싱용)
      const { error: voteError } = await supabase.from("votes").insert({
        session_id: sessionId,
        option_id: optionId,
        wallet_address: walletAddress,
        character_id: characterId,
      });

      if (voteError) throw voteError;

      // 투표 수 증가
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
      return { success: false, error: "투표 중 오류가 발생했습니다" };
    }
  }

  /**
   * 스테이지에 대한 활성 투표 세션 확인
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
   * 선택지가 투표에서 승리했는지 확인
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

      if (new Date(session.end_time) > new Date()) {
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
   * 투표 세션 생성 (운영자용)
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
    // 선택지 텍스트 가져오기
    const { data: choices } = await supabase
      .from("Vygddrasilchoice")
      .select("id, choice")
      .in("id", choiceIds);

    if (!choices || choices.length === 0) {
      return { success: false, error: "선택지를 찾을 수 없습니다" };
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
      return { success: false, error: "세션 생성 중 오류가 발생했습니다" };
    }
  }

  /**
   * 투표 세션 종료 (운영자용)
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
   * 과반수 승자 찾기
   * @returns { winnerId, needsRevote }
   * - winnerId: 과반수 획득한 선택지 ID (없으면 undefined)
   * - needsRevote: 투표가 종료되었지만 과반수가 없어서 재투표 필요
   */
  static findWinningOptionWithRevote(
    options: { id: number; voteCount: number }[],
    totalVotes: number,
    eligibleVoters: number,
    isEnded: boolean
  ): { winnerId?: number; needsRevote: boolean } {
    if (totalVotes === 0) {
      return { winnerId: undefined, needsRevote: isEnded };
    }

    // 과반수 = 투표자의 절반 초과
    const halfVotes = totalVotes / 2;
    const winner = options.find(opt => opt.voteCount > halfVotes);

    if (winner) {
      return { winnerId: winner.id, needsRevote: false };
    }

    // 투표 종료 시 과반수가 없으면 재투표 필요
    return { winnerId: undefined, needsRevote: isEnded };
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

  // ========== 권한 관련 함수 ==========

  /**
   * 관리자 여부 확인
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
   * 게임 운영자 여부 확인
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
   * 투표 생성 권한 확인
   * - 공식 게임: 관리자만
   * - 유저 생성 게임: 해당 게임 운영자
   */
  static async canCreateVoting(gameId: string, walletAddress: string): Promise<boolean> {
    const isOfficial = OFFICIAL_GAMES.includes(gameId as OfficialGame);

    if (isOfficial) {
      return this.isAdmin(walletAddress);
    } else {
      return this.isGameOperator(gameId, walletAddress);
    }
  }

  // ========== 제안 관련 함수 ==========

  /**
   * 제안 목록 가져오기
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
   * 제안 생성
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
      return { success: false, error: "제안 생성에 실패했습니다" };
    }
  }

  /**
   * 제안 투표 (좋아요/싫어요)
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
   * 제안 상태 변경 (관리자/운영자용)
   */
  static async updateProposalStatus(
    proposalId: number,
    status: "approved" | "rejected",
    adminNotes?: string
  ): Promise<{ success: boolean }> {
    try {
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
      return { success: false };
    }
  }

  /**
   * 제안을 투표 세션으로 전환 (관리자/운영자용)
   */
  static async convertProposalToVoting(
    proposalId: number,
    stageId: number,
    choiceIds: number[],
    durationMinutes: number,
    gameId: string
  ): Promise<{ success: boolean; sessionId?: number; error?: string }> {
    try {
      // 제안 정보 가져오기
      const { data: proposal, error: propError } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", proposalId)
        .single();

      if (propError || !proposal) {
        return { success: false, error: "제안을 찾을 수 없습니다" };
      }

      // 선택지 정보 가져오기
      const { data: choices } = await supabase
        .from("Vygddrasilchoice")
        .select("id, choice")
        .in("id", choiceIds);

      if (!choices || choices.length === 0) {
        return { success: false, error: "선택지를 찾을 수 없습니다" };
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

      // 투표 세션 생성
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
        return { success: false, error: "투표 세션 생성에 실패했습니다" };
      }

      // 선택지 추가
      const options = choices.map((choice) => ({
        session_id: session.id,
        choice_id: choice.id,
        choice_text: choice.choice,
        vote_count: 0,
      }));

      await supabase.from("voting_options").insert(options);

      // 제안 상태 업데이트
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
      return { success: false, error: "투표 전환에 실패했습니다" };
    }
  }

  /**
   * 직접 투표 세션 생성 (관리자/운영자용)
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
      // 선택지 정보 가져오기
      const { data: choices } = await supabase
        .from("Vygddrasilchoice")
        .select("id, choice")
        .in("id", choiceIds);

      if (!choices || choices.length === 0) {
        return { success: false, error: "선택지를 찾을 수 없습니다" };
      }

      const now = new Date();
      const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

      // 투표 세션 생성
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

      if (sessionError || !session) {
        return { success: false, error: "투표 세션 생성에 실패했습니다" };
      }

      // 선택지 추가
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
      return { success: false, error: "투표 생성에 실패했습니다" };
    }
  }

  /**
   * 스테이지별 선택지 가져오기
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
   * 스테이지 목록 가져오기
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
   * 유저 생성 게임 목록 가져오기 (Stream 테이블에서)
   */
  static async getUserCreatedGames(): Promise<{ id: number; title: string }[]> {
    try {
      const { data, error } = await supabase
        .from("Stream")
        .select("id, Title")
        .order("id", { ascending: false });

      if (error) throw error;

      return (data || []).map(g => ({
        id: g.id,
        title: g.Title,
      }));
    } catch (error) {
      console.error("Error fetching user created games:", error);
      return [];
    }
  }

  /**
   * 게임별 투표 세션 가져오기
   */
  static async getSessionsByGame(gameId: string): Promise<VotingSessionWithOptions[]> {
    try {
      const { data: sessions, error } = await supabase
        .from("voting_sessions")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!sessions || sessions.length === 0) return [];

      // 총 투표 가능자 수
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
          const isEnded = new Date(session.end_time) < new Date();
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
      console.error("Error fetching sessions by game:", error);
      return [];
    }
  }
}

export default VotingService;
