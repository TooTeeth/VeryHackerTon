// services/voting.service.ts

import { supabase } from "../lib/supabaseClient";

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
  userVote?: number; // 사용자가 투표한 option_id
  winningOptionId?: number; // 과반수 득표한 옵션
}

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

      // 각 세션의 옵션과 투표 수 가져오기
      const sessionsWithOptions = await Promise.all(
        sessions.map(async (session) => {
          const { data: options } = await supabase
            .from("voting_options")
            .select("*")
            .eq("session_id", session.id)
            .order("id", { ascending: true });

          const totalVotes = (options || []).reduce((sum, opt) => sum + (opt.vote_count || 0), 0);

          // 과반수 옵션 찾기 (투표 종료 후에만)
          let winningOptionId: number | undefined;
          if (new Date(session.end_time) < new Date() && totalVotes > 0) {
            const halfVotes = totalVotes / 2;
            const winner = (options || []).find(opt => opt.vote_count > halfVotes);
            winningOptionId = winner?.id;
          }

          return {
            ...session,
            options: options || [],
            totalVotes,
            winningOptionId,
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

      // 사용자 투표 확인
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

      // 과반수 옵션 찾기
      let winningOptionId: number | undefined;
      if (new Date(session.end_time) < new Date() && totalVotes > 0) {
        const halfVotes = totalVotes / 2;
        const winner = (options || []).find(opt => opt.vote_count > halfVotes);
        winningOptionId = winner?.id;
      }

      return {
        ...session,
        options: options || [],
        totalVotes,
        userVote,
        winningOptionId,
      };
    } catch (error) {
      console.error("Error fetching session:", error);
      return null;
    }
  }

  /**
   * 투표하기
   */
  static async vote(
    sessionId: number,
    optionId: number,
    walletAddress: string,
    characterId?: number
  ): Promise<{ success: boolean; error?: string }> {
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

      // 투표 기록
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

      // RPC가 없으면 직접 업데이트
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
  static async isChoiceWinner(choiceId: number): Promise<boolean> {
    try {
      // 해당 choice_id가 포함된 투표 옵션 찾기
      const { data: option } = await supabase
        .from("voting_options")
        .select("id, session_id, vote_count")
        .eq("choice_id", choiceId)
        .single();

      if (!option) return true; // 투표 대상이 아니면 선택 가능

      // 세션 정보 확인
      const session = await this.getSessionById(option.session_id);
      if (!session) return true;

      // 투표가 아직 진행 중이면 선택 불가
      if (new Date(session.end_time) > new Date()) {
        return false;
      }

      // 해당 옵션이 과반수를 획득했는지 확인
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
    choiceIds: number[]
  ): Promise<{ success: boolean; sessionId?: number; error?: string }> {
    try {
      // 세션 생성
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

      // 선택지에서 옵션 가져오기
      const { data: choices } = await supabase
        .from("Vygddrasilchoice")
        .select("id, choice")
        .in("id", choiceIds);

      if (choices && choices.length > 0) {
        // 옵션 생성
        const options = choices.map((choice) => ({
          session_id: session.id,
          choice_id: choice.id,
          choice_text: choice.choice,
          vote_count: 0,
        }));

        await supabase.from("voting_options").insert(options);
      }

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
}
