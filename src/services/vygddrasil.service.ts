// services/vygddrasil.service.ts

import {
  GameProgress,
  ChoiceItem,
  StageMeta,
  CharacterWithProgress,
  Enemy,
  BattleChoice,
  BattleRewardConfig,
  BattleLogEntry,
  BattleMode,
  BattleRewards,
} from "../types/vygddrasil.types";
import { supabase } from "../lib/supabaseClient";

export class VygddrasilService {
  /**
   * Load game progress for a specific character
   */
  static async loadProgress(walletAddress: string, characterId?: number): Promise<GameProgress | null> {
    try {
      // characterId가 없으면 저장 데이터를 불러오지 않음 (새 캐릭터는 처음부터 시작)
      if (!characterId) {
        console.log("No characterId provided, starting fresh");
        return null;
      }

      const { data, error } = await supabase
        .from("game_progress")
        .select("*")
        .eq("wallet_address", walletAddress)
        .eq("game_id", "vygddrasil")
        .eq("character_id", characterId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        console.log("Error loading progress:", error);
        return null;
      }

      // 결과가 없으면 null 반환
      if (!data || data.length === 0) {
        console.log("No saved progress found for character:", characterId);
        return null;
      }

      return data[0] as GameProgress;
    } catch (error) {
      console.error("Error loading progress:", error);
      return null;
    }
  }

  /**
   * Save game progress for a specific character
   */
  static async saveProgress(progressData: Omit<GameProgress, "id" | "created_at" | "updated_at">): Promise<{ success: boolean; error?: string }> {
    try {
      // character_id가 필수
      if (!progressData.character_id) {
        console.log("No character_id provided, skipping save");
        return { success: true }; // 에러는 아니지만 저장하지 않음
      }

      const dataToSave = {
        ...progressData,
        updated_at: new Date().toISOString(),
      };

      // Check if progress exists (use array result to avoid single() errors)
      const { data: existingList, error: selectError } = await supabase
        .from("game_progress")
        .select("id")
        .eq("wallet_address", progressData.wallet_address)
        .eq("game_id", progressData.game_id)
        .eq("character_id", progressData.character_id)
        .limit(1);

      if (selectError) {
        throw selectError;
      }

      const existing = existingList && existingList.length > 0 ? existingList[0] : null;

      if (existing) {
        // Update existing progress
        const { error } = await supabase.from("game_progress").update(dataToSave).eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new progress
        const { error } = await supabase.from("game_progress").insert(dataToSave);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Error saving progress:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete game progress for a specific character
   */
  static async deleteProgress(walletAddress: string, characterId?: number): Promise<{ success: boolean }> {
    try {
      let query = supabase.from("game_progress").delete().eq("wallet_address", walletAddress).eq("game_id", "vygddrasil");

      if (characterId) {
        query = query.eq("character_id", characterId);
      }

      const { error } = await query;

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error deleting progress:", error);
      return { success: false };
    }
  }

  /**
   * Check if user has any saved progress
   */
  static async hasProgress(walletAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.from("game_progress").select("id").eq("wallet_address", walletAddress).eq("game_id", "vygddrasil").limit(1);

      if (error) {
        console.error("Error checking progress:", error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error("Error checking progress:", error);
      return false;
    }
  }

  /**
   * Fetch stage data (choices and metadata)
   */
  static async fetchStageData(stageSlug: string): Promise<{
    choices: ChoiceItem[];
    stageMeta: StageMeta | null;
  }> {
    try {
      console.log("Fetching stage data for slug:", stageSlug);

      // Fetch choices for this stage
      const { data: choicesData, error: choicesError } = await supabase.from("Vygddrasilchoice").select("*").eq("mainstream_slug", stageSlug).order("id", { ascending: true });

      if (choicesError) {
        console.error("Error fetching choices:", choicesError);
      }

      // Fetch stage metadata
      const { data: stageData, error: stageError } = await supabase.from("Vygddrasilstage").select("*").eq("slug", stageSlug).single();

      if (stageError) {
        console.error("Error fetching stage for slug:", stageSlug, "Error:", stageError);
      }

      // 투표 상태 확인하여 선택지 업데이트
      let choices = (choicesData as ChoiceItem[]) || [];
      choices = await this.applyVotingStatusToChoices(choices);

      return {
        choices,
        stageMeta: (stageData as StageMeta) || null,
      };
    } catch (error) {
      console.error("Error fetching stage data:", error);
      return { choices: [], stageMeta: null };
    }
  }

  /**
   * 투표 상태를 선택지에 적용 (최적화: 단일 쿼리로 모든 데이터 가져오기)
   */
  static async applyVotingStatusToChoices(choices: ChoiceItem[]): Promise<ChoiceItem[]> {
    try {
      // 현재 선택지의 ID 목록
      const choiceIds = choices.map(c => c.id);
      if (choiceIds.length === 0) return choices;

      // 필요한 투표 옵션만 가져오기 (현재 선택지에 해당하는 것만)
      const { data: votingOptions } = await supabase
        .from("voting_options")
        .select("choice_id, session_id, vote_count")
        .in("choice_id", choiceIds);

      if (!votingOptions || votingOptions.length === 0) {
        return choices;
      }

      // 관련 세션 ID 추출
      const sessionIds = [...new Set(votingOptions.map(opt => opt.session_id))];

      // 병렬로 세션 정보와 해당 세션의 모든 옵션 가져오기
      const [sessionsResult, allSessionOptionsResult] = await Promise.all([
        supabase
          .from("voting_sessions")
          .select("id, end_time")
          .in("id", sessionIds),
        supabase
          .from("voting_options")
          .select("choice_id, session_id, vote_count")
          .in("session_id", sessionIds)
      ]);

      const sessions = sessionsResult.data || [];
      const allSessionOptions = allSessionOptionsResult.data || [];

      // 세션 정보 맵
      const sessionMap = new Map<number, { endTime: Date }>();
      sessions.forEach(s => {
        sessionMap.set(s.id, { endTime: new Date(s.end_time) });
      });

      // 세션별 옵션 그룹화 및 결과 계산
      const sessionResults = new Map<number, { totalVotes: number; winnerChoiceId: number | null }>();
      const optionsBySession = new Map<number, typeof allSessionOptions>();

      allSessionOptions.forEach(opt => {
        const existing = optionsBySession.get(opt.session_id) || [];
        existing.push(opt);
        optionsBySession.set(opt.session_id, existing);
      });

      optionsBySession.forEach((options, sessionId) => {
        const totalVotes = options.reduce((sum, o) => sum + (o.vote_count || 0), 0);
        const halfVotes = totalVotes / 2;
        const winner = options.find(o => (o.vote_count || 0) > halfVotes);

        const sessionInfo = sessionMap.get(sessionId);
        const isEnded = sessionInfo && sessionInfo.endTime < new Date();

        sessionResults.set(sessionId, {
          totalVotes,
          winnerChoiceId: isEnded && winner ? winner.choice_id : null,
        });
      });

      // choice_id별 투표 정보 매핑
      const votingMap = new Map<number, { sessionId: number; voteCount: number }>();
      votingOptions.forEach((opt) => {
        votingMap.set(opt.choice_id, {
          sessionId: opt.session_id,
          voteCount: opt.vote_count || 0,
        });
      });

      // 선택지에 투표 상태 적용
      return choices.map((choice) => {
        const votingInfo = votingMap.get(choice.id);

        if (!votingInfo) {
          return choice;
        }

        const sessionResult = sessionResults.get(votingInfo.sessionId);

        // 투표가 종료되고 과반수 승자가 있는 경우
        if (sessionResult?.winnerChoiceId !== null && sessionResult?.winnerChoiceId !== undefined) {
          const isWinner = sessionResult.winnerChoiceId === choice.id;
          return {
            ...choice,
            isVotingChoice: true,
            isDisabledByVote: !isWinner,
            votingSessionId: votingInfo.sessionId,
          };
        }

        // 투표 진행 중이거나 과반수 없음
        return {
          ...choice,
          isVotingChoice: true,
          isDisabledByVote: false,
          votingSessionId: votingInfo.sessionId,
        };
      });
    } catch (error) {
      console.error("Error applying voting status:", error);
      return choices;
    }
  }

  /**
   * Get all characters for a wallet
   */
  static async getCharacters(walletAddress: string): Promise<CharacterWithProgress[]> {
    try {
      const { data: charactersData, error: charError } = await supabase.from("vygddrasilclass").select("*").eq("wallet_address", walletAddress).order("created_at", { ascending: false });

      if (charError) throw charError;

      if (!charactersData || charactersData.length === 0) {
        return [];
      }

      // Load progress for each character
      const charactersWithProgress = await Promise.all(
        charactersData.map(async (char) => {
          const { data: progressData } = await supabase.from("game_progress").select("*").eq("wallet_address", walletAddress).eq("game_id", "vygddrasil").eq("character_id", char.id).order("updated_at", { ascending: false }).limit(1).single();

          return {
            ...char,
            progress: progressData ? (progressData as GameProgress) : undefined,
          } as CharacterWithProgress;
        })
      );

      return charactersWithProgress;
    } catch (error) {
      console.error("Error loading characters:", error);
      throw error;
    }
  }

  /**
   * Delete a character and its progress
   */
  static async deleteCharacter(characterId: number): Promise<{ success: boolean }> {
    try {
      // Delete character progress first
      await supabase.from("game_progress").delete().eq("character_id", characterId).eq("game_id", "vygddrasil");

      // Delete character
      const { error } = await supabase.from("vygddrasilclass").delete().eq("id", characterId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error deleting character:", error);
      return { success: false };
    }
  }

  // ============================================
  // 전투 시스템 관련 메서드
  // ============================================

  /**
   * 스테이지 slug로 적 정보 가져오기
   */
  static async getEnemyByStage(stageSlug: string): Promise<Enemy | null> {
    try {
      const { data, error } = await supabase
        .from("enemies")
        .select("*")
        .eq("stage_slug", stageSlug)
        .single();

      if (error) {
        console.log("No enemy found for stage:", stageSlug);
        return null;
      }

      return data as Enemy;
    } catch (error) {
      console.error("Error fetching enemy:", error);
      return null;
    }
  }

  /**
   * 적 ID로 적 정보 가져오기
   */
  static async getEnemyById(enemyId: number): Promise<Enemy | null> {
    try {
      const { data, error } = await supabase
        .from("enemies")
        .select("*")
        .eq("id", enemyId)
        .single();

      if (error) {
        console.error("Error fetching enemy by id:", error);
        return null;
      }

      return data as Enemy;
    } catch (error) {
      console.error("Error fetching enemy:", error);
      return null;
    }
  }

  /**
   * 적의 전투 보상 설정 가져오기
   */
  static async getBattleRewardConfig(enemyId: number): Promise<BattleRewardConfig | null> {
    try {
      const { data, error } = await supabase
        .from("battle_rewards")
        .select("*")
        .eq("enemy_id", enemyId)
        .single();

      if (error) {
        console.log("No reward config for enemy:", enemyId);
        return null;
      }

      return data as BattleRewardConfig;
    } catch (error) {
      console.error("Error fetching reward config:", error);
      return null;
    }
  }

  /**
   * 적의 전투 선택지 가져오기 (choice 모드용)
   */
  static async getBattleChoices(enemyId: number): Promise<BattleChoice[]> {
    try {
      const { data, error } = await supabase
        .from("battle_choices")
        .select("*")
        .eq("enemy_id", enemyId)
        .order("id", { ascending: true });

      if (error) {
        console.error("Error fetching battle choices:", error);
        return [];
      }

      return (data as BattleChoice[]) || [];
    } catch (error) {
      console.error("Error fetching battle choices:", error);
      return [];
    }
  }

  /**
   * 전투 기록 저장
   */
  static async saveBattleHistory(
    characterId: number,
    enemyId: number,
    battleMode: BattleMode,
    result: string,
    turnsTaken: number,
    expGained: number,
    goldGained: number,
    battleLog: BattleLogEntry[]
  ): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase.from("battle_history").insert({
        character_id: characterId,
        enemy_id: enemyId,
        battle_mode: battleMode,
        result,
        turns_taken: turnsTaken,
        exp_gained: expGained,
        gold_gained: goldGained,
        battle_log: battleLog,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error saving battle history:", error);
      return { success: false };
    }
  }

  /**
   * 캐릭터에게 보상 적용 (exp, gold, stat bonus)
   */
  static async applyBattleRewards(
    characterId: number,
    rewards: BattleRewards
  ): Promise<{ success: boolean; leveledUp?: boolean; newLevel?: number }> {
    try {
      // 현재 캐릭터 정보 가져오기
      const { data: character, error: fetchError } = await supabase
        .from("vygddrasilclass")
        .select("exp, gold, level, str, agi, int, hp, mp, luck")
        .eq("id", characterId)
        .single();

      if (fetchError || !character) {
        throw fetchError || new Error("Character not found");
      }

      // 새 exp, gold 계산
      let newExp = (character.exp || 0) + rewards.exp;
      const newGold = (character.gold || 0) + rewards.gold;
      let newLevel = character.level || 1;
      let leveledUp = false;

      // 레벨업 체크 (100 EXP per level)
      const EXP_PER_LEVEL = 100;
      while (newExp >= EXP_PER_LEVEL) {
        newExp -= EXP_PER_LEVEL;
        newLevel++;
        leveledUp = true;
      }

      // 업데이트할 데이터
      const updateData: Record<string, number> = {
        exp: newExp,
        gold: newGold,
        level: newLevel,
      };

      // 레벨업 보너스 (모든 스탯 +1, HP +10, MP +5)
      if (leveledUp) {
        const levelsGained = newLevel - (character.level || 1);
        updateData.str = character.str + levelsGained;
        updateData.agi = character.agi + levelsGained;
        updateData.int = character.int + levelsGained;
        updateData.hp = character.hp + levelsGained * 10;
        updateData.mp = character.mp + levelsGained * 5;
        updateData.luck = character.luck + levelsGained;
      }

      // 전투 보상 스탯 보너스
      if (rewards.statBonus) {
        const stat = rewards.statBonus.stat as keyof typeof character;
        if (stat in character) {
          updateData[stat] = (updateData[stat] || character[stat]) + rewards.statBonus.value;
        }
      }

      // 캐릭터 업데이트
      const { error: updateError } = await supabase
        .from("vygddrasilclass")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", characterId);

      if (updateError) throw updateError;

      return { success: true, leveledUp, newLevel };
    } catch (error) {
      console.error("Error applying battle rewards:", error);
      return { success: false };
    }
  }

  /**
   * 캐릭터의 전투 기록 가져오기
   */
  static async getBattleHistory(
    characterId: number,
    limit: number = 10
  ): Promise<{ id: number; enemy_id: number; result: string; created_at: string }[]> {
    try {
      const { data, error } = await supabase
        .from("battle_history")
        .select("id, enemy_id, result, created_at")
        .eq("character_id", characterId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching battle history:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching battle history:", error);
      return [];
    }
  }

  // ============================================
  // 골드 관련 메서드
  // ============================================

  /**
   * 캐릭터의 골드 조회
   */
  static async getCharacterGold(characterId: number): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("vygddrasilclass")
        .select("gold")
        .eq("id", characterId)
        .single();

      if (error) {
        console.error("Error fetching character gold:", error);
        return 0;
      }

      return data?.gold || 0;
    } catch (error) {
      console.error("Error fetching character gold:", error);
      return 0;
    }
  }

  /**
   * 캐릭터의 골드를 0으로 초기화 (처음부터 다시 시작 시)
   */
  static async resetCharacterGold(characterId: number): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from("vygddrasilclass")
        .update({
          gold: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", characterId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error resetting character gold:", error);
      return { success: false };
    }
  }

  /**
   * 캐릭터의 골드 차감
   */
  static async deductCharacterGold(
    characterId: number,
    amount: number
  ): Promise<{ success: boolean; newGold?: number }> {
    try {
      // 현재 골드 조회
      const { data: character, error: fetchError } = await supabase
        .from("vygddrasilclass")
        .select("gold")
        .eq("id", characterId)
        .single();

      if (fetchError || !character) {
        throw fetchError || new Error("Character not found");
      }

      const currentGold = character.gold || 0;
      if (currentGold < amount) {
        return { success: false };
      }

      const newGold = currentGold - amount;

      // 골드 업데이트
      const { error: updateError } = await supabase
        .from("vygddrasilclass")
        .update({
          gold: newGold,
          updated_at: new Date().toISOString(),
        })
        .eq("id", characterId);

      if (updateError) throw updateError;

      return { success: true, newGold };
    } catch (error) {
      console.error("Error deducting gold:", error);
      return { success: false };
    }
  }

  // ============================================
  // 캐릭터 NFT 관련 메서드
  // ============================================

  /**
   * 캐릭터가 NFT를 획득했음을 기록
   */
  static async recordCharacterNFT(
    characterId: number,
    contractAddress: string,
    tokenId: string
  ): Promise<{ success: boolean }> {
    try {
      const { error } = await supabase
        .from("character_nfts")
        .upsert(
          {
            character_id: characterId,
            nft_contract_address: contractAddress.toLowerCase(),
            nft_token_id: tokenId,
            acquired_at: new Date().toISOString(),
          },
          { onConflict: "character_id,nft_contract_address,nft_token_id" }
        );

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error("Error recording character NFT:", error);
      return { success: false };
    }
  }

  /**
   * 캐릭터가 획득한 NFT 목록 조회
   */
  static async getCharacterNFTs(
    characterId: number
  ): Promise<{ contractAddress: string; tokenId: string }[]> {
    try {
      const { data, error } = await supabase
        .from("character_nfts")
        .select("nft_contract_address, nft_token_id")
        .eq("character_id", characterId);

      if (error) {
        console.error("Error fetching character NFTs:", error);
        return [];
      }

      return (data || []).map((item) => ({
        contractAddress: item.nft_contract_address,
        tokenId: item.nft_token_id,
      }));
    } catch (error) {
      console.error("Error fetching character NFTs:", error);
      return [];
    }
  }

  /**
   * 캐릭터가 특정 NFT를 획득했는지 확인
   */
  static async hasCharacterNFT(
    characterId: number,
    contractAddress: string,
    tokenId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("character_nfts")
        .select("id")
        .eq("character_id", characterId)
        .eq("nft_contract_address", contractAddress.toLowerCase())
        .eq("nft_token_id", tokenId)
        .limit(1);

      if (error) {
        console.error("Error checking character NFT:", error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error("Error checking character NFT:", error);
      return false;
    }
  }
}
