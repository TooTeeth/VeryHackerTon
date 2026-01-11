// ============================================
// GAMIFICATION SERVICE
// Vygddrasil Game - Achievements, Daily Quests, Ranking, Statistics, Notifications
// ============================================

import { getSupabaseClient } from "../lib/supabaseClient";
const supabase = getSupabaseClient();
import type {
  Achievement,
  AchievementProgress,
  DailyQuest,
  DailyQuestProgress,
  LeaderboardEntry,
  LeaderboardFilter,
  CharacterStatistics,
  Notification,
  NotificationCounts,
  NotificationType,
  CreateNotificationParams,
  BattleStatisticsUpdate,
} from "../types/gamification.types";

export class GamificationService {
  // ============================================
  // 업적 관련 메서드 (ACHIEVEMENTS)
  // ============================================

  /**
   * 캐릭터의 업적 목록과 진행도 조회
   */
  static async getAchievementsWithProgress(
    characterId: number
  ): Promise<AchievementProgress[]> {
    try {
      // 모든 업적 조회
      const { data: achievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .order("sort_order", { ascending: true });

      if (achievementsError) throw achievementsError;

      // 캐릭터가 획득한 업적 조회
      const { data: unlocked, error: unlockedError } = await supabase
        .from("character_achievements")
        .select("*")
        .eq("character_id", characterId);

      if (unlockedError) throw unlockedError;

      // 통계 조회
      const stats = await this.getCharacterStatistics(characterId);

      // 캐릭터 레벨 조회
      const { data: character } = await supabase
        .from("vygddrasilclass")
        .select("level")
        .eq("id", characterId)
        .single();

      // 업적 진행도 계산
      return (achievements || []).map((achievement) => {
        const unlockedAchievement = unlocked?.find(
          (u) => u.achievement_id === achievement.id
        );
        const requirementKey = Object.keys(achievement.requirement_value)[0];
        const targetValue = achievement.requirement_value[requirementKey];

        let currentValue = 0;
        if (requirementKey === "level") {
          currentValue = character?.level || 1;
        } else if (stats) {
          currentValue =
            (stats[requirementKey as keyof CharacterStatistics] as number) || 0;
        }

        return {
          achievement,
          current_value: currentValue,
          target_value: targetValue,
          percentage: Math.min(
            100,
            Math.floor((currentValue / targetValue) * 100)
          ),
          is_unlocked: !!unlockedAchievement,
          unlocked_at: unlockedAchievement?.unlocked_at,
          reward_claimed: unlockedAchievement?.reward_claimed || false,
        };
      });
    } catch (error) {
      console.error("Error fetching achievements:", error);
      return [];
    }
  }

  /**
   * 업적 달성 확인 및 해금
   */
  static async checkAndUnlockAchievements(
    characterId: number
  ): Promise<Achievement[]> {
    try {
      const progressList = await this.getAchievementsWithProgress(characterId);
      const newlyUnlocked: Achievement[] = [];

      for (const progress of progressList) {
        if (!progress.is_unlocked && progress.percentage >= 100) {
          // 업적 해금
          const { error } = await supabase
            .from("character_achievements")
            .insert({
              character_id: characterId,
              achievement_id: progress.achievement.id,
            });

          if (!error) {
            newlyUnlocked.push(progress.achievement);

            // 알림 생성
            await this.createNotification(characterId, {
              type: "achievement",
              title: "업적 달성!",
              message: `"${progress.achievement.name}" 업적을 달성했습니다!`,
              icon: "🏆",
              data: { achievement_id: progress.achievement.id },
            });
          }
        }
      }

      return newlyUnlocked;
    } catch (error) {
      console.error("Error checking achievements:", error);
      return [];
    }
  }

  /**
   * 업적 보상 수령
   */
  static async claimAchievementReward(
    characterId: number,
    achievementId: number
  ): Promise<{ success: boolean; reward?: Achievement["reward_value"] }> {
    try {
      // 업적 정보 조회
      const { data: achievement, error: achievementError } = await supabase
        .from("achievements")
        .select("*")
        .eq("id", achievementId)
        .single();

      if (achievementError || !achievement)
        throw achievementError || new Error("Achievement not found");

      // 해금 여부 확인
      const { data: charAchievement, error: charError } = await supabase
        .from("character_achievements")
        .select("*")
        .eq("character_id", characterId)
        .eq("achievement_id", achievementId)
        .single();

      if (charError || !charAchievement) return { success: false };
      if (charAchievement.reward_claimed) return { success: false };

      // 보상 적용
      if (achievement.reward_value) {
        await this.applyReward(characterId, achievement.reward_value);
      }

      // 수령 완료 표시
      await supabase
        .from("character_achievements")
        .update({ reward_claimed: true })
        .eq("id", charAchievement.id);

      return { success: true, reward: achievement.reward_value };
    } catch (error) {
      console.error("Error claiming achievement reward:", error);
      return { success: false };
    }
  }

  // ============================================
  // 일일 퀘스트 관련 메서드 (DAILY QUESTS)
  // ============================================

  /**
   * 오늘의 일일 퀘스트 조회
   */
  static async getDailyQuests(
    characterId: number
  ): Promise<DailyQuestProgress[]> {
    try {
      const today = new Date().toISOString().split("T")[0];

      // 활성화된 일일 퀘스트 조회
      const { data: quests, error: questsError } = await supabase
        .from("daily_quests")
        .select("*")
        .eq("is_active", true)
        .order("difficulty", { ascending: true });

      if (questsError) throw questsError;

      // 오늘의 진행도 조회
      const { data: progress, error: progressError } = await supabase
        .from("character_daily_quests")
        .select("*")
        .eq("character_id", characterId)
        .eq("quest_date", today);

      if (progressError) throw progressError;

      // 퀘스트와 진행도 매핑
      return (quests || []).map((quest) => {
        const questProgress = progress?.find((p) => p.quest_id === quest.id);
        return {
          quest,
          current_count: questProgress?.current_count || 0,
          is_completed: questProgress?.is_completed || false,
          reward_claimed: questProgress?.reward_claimed || false,
          percentage: Math.min(
            100,
            Math.floor(
              ((questProgress?.current_count || 0) / quest.target_count) * 100
            )
          ),
        };
      });
    } catch (error) {
      console.error("Error fetching daily quests:", error);
      return [];
    }
  }

  /**
   * 일일 퀘스트 진행도 업데이트
   */
  static async updateDailyQuestProgress(
    characterId: number,
    questType: string,
    incrementBy: number = 1
  ): Promise<DailyQuest[]> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const completedQuests: DailyQuest[] = [];

      // 해당 타입의 퀘스트 조회
      const { data: quests, error: questsError } = await supabase
        .from("daily_quests")
        .select("*")
        .eq("quest_type", questType)
        .eq("is_active", true);

      if (questsError || !quests) return [];

      for (const quest of quests) {
        // 기존 진행도 조회
        const { data: existing } = await supabase
          .from("character_daily_quests")
          .select("*")
          .eq("character_id", characterId)
          .eq("quest_id", quest.id)
          .eq("quest_date", today)
          .single();

        const newCount = (existing?.current_count || 0) + incrementBy;
        const isCompleted = newCount >= quest.target_count;

        if (existing) {
          if (!existing.is_completed) {
            await supabase
              .from("character_daily_quests")
              .update({
                current_count: newCount,
                is_completed: isCompleted,
              })
              .eq("id", existing.id);
          }
        } else {
          await supabase.from("character_daily_quests").insert({
            character_id: characterId,
            quest_id: quest.id,
            quest_date: today,
            current_count: newCount,
            is_completed: isCompleted,
          });
        }

        // 새로 완료된 경우
        if (isCompleted && !existing?.is_completed) {
          completedQuests.push(quest);

          // 알림 생성
          await this.createNotification(characterId, {
            type: "daily_quest",
            title: "일일 퀘스트 완료!",
            message: `"${quest.name}" 퀘스트를 완료했습니다!`,
            icon: "📋",
            data: { quest_id: quest.id },
          });
        }
      }

      return completedQuests;
    } catch (error) {
      console.error("Error updating daily quest progress:", error);
      return [];
    }
  }

  /**
   * 일일 퀘스트 보상 수령
   */
  static async claimDailyQuestReward(
    characterId: number,
    questId: number
  ): Promise<{ success: boolean; reward?: { gold: number; exp: number } }> {
    try {
      const today = new Date().toISOString().split("T")[0];

      // 퀘스트 및 진행도 조회
      const { data: quest } = await supabase
        .from("daily_quests")
        .select("*")
        .eq("id", questId)
        .single();

      const { data: progress } = await supabase
        .from("character_daily_quests")
        .select("*")
        .eq("character_id", characterId)
        .eq("quest_id", questId)
        .eq("quest_date", today)
        .single();

      if (!quest || !progress) return { success: false };
      if (!progress.is_completed || progress.reward_claimed)
        return { success: false };

      // 보상 적용
      await this.applyReward(characterId, {
        gold: quest.reward_gold,
        exp: quest.reward_exp,
      });

      // 수령 완료 표시
      await supabase
        .from("character_daily_quests")
        .update({ reward_claimed: true })
        .eq("id", progress.id);

      return {
        success: true,
        reward: { gold: quest.reward_gold, exp: quest.reward_exp },
      };
    } catch (error) {
      console.error("Error claiming daily quest reward:", error);
      return { success: false };
    }
  }

  // ============================================
  // 랭킹 관련 메서드 (LEADERBOARD)
  // ============================================

  /**
   * 리더보드 조회
   */
  static async getLeaderboard(
    filter: LeaderboardFilter
  ): Promise<LeaderboardEntry[]> {
    try {
      let query = supabase
        .from("leaderboard")
        .select("*")
        .order(filter.sortBy, { ascending: false })
        .range(filter.offset, filter.offset + filter.limit - 1);

      if (filter.characterClass) {
        query = query.eq("class", filter.characterClass);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }
  }

  /**
   * 캐릭터의 순위 조회
   */
  static async getCharacterRank(characterId: number): Promise<LeaderboardEntry | null> {
    try {
      const { data, error } = await supabase
        .from("leaderboard")
        .select("*")
        .eq("character_id", characterId)
        .single();

      if (error) return null;
      return data as LeaderboardEntry || null;
    } catch (error) {
      console.error("Error fetching character rank:", error);
      return null;
    }
  }

  /**
   * 리더보드 엔트리 업데이트
   */
  static async updateLeaderboardEntry(characterId: number): Promise<void> {
    try {
      // 캐릭터 정보 조회
      const { data: character } = await supabase
        .from("vygddrasilclass")
        .select("*")
        .eq("id", characterId)
        .single();

      if (!character) return;

      // 통계 조회
      const stats = await this.getCharacterStatistics(characterId);

      // 게임 진행도 조회
      const { data: progress } = await supabase
        .from("game_progress")
        .select("visited_stages")
        .eq("character_id", characterId)
        .single();

      // 리더보드 업데이트 (upsert)
      await supabase.from("leaderboard").upsert(
        {
          character_id: characterId,
          wallet_address: character.wallet_address,
          nickname: character.nickname,
          class: character.class,
          level: character.level || 1,
          exp: character.exp || 0,
          total_battles: stats?.total_battles || 0,
          battles_won: stats?.battles_won || 0,
          total_gold_earned: stats?.total_gold_earned || 0,
          stages_visited: progress?.visited_stages?.length || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "character_id" }
      );

      // 순위 재계산
      await this.recalculateRanks();
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  }

  /**
   * 순위 재계산
   */
  static async recalculateRanks(): Promise<void> {
    try {
      const { data } = await supabase
        .from("leaderboard")
        .select("id, score")
        .order("score", { ascending: false });

      if (!data) return;

      for (let i = 0; i < data.length; i++) {
        await supabase
          .from("leaderboard")
          .update({ rank_position: i + 1 })
          .eq("id", data[i].id);
      }
    } catch (error) {
      console.error("Error recalculating ranks:", error);
    }
  }

  // ============================================
  // 통계 관련 메서드 (STATISTICS)
  // ============================================

  /**
   * 캐릭터 통계 조회 (없으면 생성)
   */
  static async getCharacterStatistics(
    characterId: number
  ): Promise<CharacterStatistics | null> {
    try {
      const { data, error } = await supabase
        .from("character_statistics")
        .select("*")
        .eq("character_id", characterId)
        .single();

      if (error && error.code === "PGRST116") {
        // 없으면 생성
        const { data: newStats, error: insertError } = await supabase
          .from("character_statistics")
          .insert({ character_id: characterId })
          .select()
          .single();

        if (insertError) throw insertError;
        return newStats as CharacterStatistics;
      } else if (error) {
        throw error;
      }

      return data as CharacterStatistics;
    } catch (error) {
      console.error("Error fetching statistics:", error);
      return null;
    }
  }

  /**
   * 전투 통계 업데이트
   */
  static async updateBattleStatistics(
    characterId: number,
    battleData: BattleStatisticsUpdate
  ): Promise<void> {
    try {
      const stats = await this.getCharacterStatistics(characterId);
      if (!stats) return;

      const updates: Partial<CharacterStatistics> = {
        total_battles: stats.total_battles + 1,
        total_damage_dealt: stats.total_damage_dealt + battleData.damageDealt,
        total_damage_received:
          stats.total_damage_received + battleData.damageReceived,
        critical_hits: stats.critical_hits + battleData.criticalHits,
        dodges: stats.dodges + battleData.dodges,
        total_gold_earned: stats.total_gold_earned + battleData.goldEarned,
        total_exp_earned: stats.total_exp_earned + battleData.expEarned,
        highest_damage_single_hit: Math.max(
          stats.highest_damage_single_hit,
          battleData.damageDealt
        ),
        updated_at: new Date().toISOString(),
      };

      if (battleData.result === "victory") {
        updates.battles_won = stats.battles_won + 1;
        updates.current_win_streak = stats.current_win_streak + 1;
        updates.longest_win_streak = Math.max(
          stats.longest_win_streak,
          updates.current_win_streak || 0
        );

        if (
          !stats.fastest_battle_win_turns ||
          battleData.turns < stats.fastest_battle_win_turns
        ) {
          updates.fastest_battle_win_turns = battleData.turns;
        }
      } else if (battleData.result === "defeat") {
        updates.battles_lost = stats.battles_lost + 1;
        updates.current_win_streak = 0;
      } else {
        updates.battles_fled = stats.battles_fled + 1;
      }

      await supabase
        .from("character_statistics")
        .update(updates)
        .eq("character_id", characterId);

      // 일일 퀘스트 업데이트
      if (battleData.result === "victory") {
        await this.updateDailyQuestProgress(characterId, "battle", 1);
      }
      if (battleData.goldEarned > 0) {
        await this.updateDailyQuestProgress(
          characterId,
          "gold",
          battleData.goldEarned
        );
      }

      // 업적 확인
      await this.checkAndUnlockAchievements(characterId);

      // 리더보드 업데이트
      await this.updateLeaderboardEntry(characterId);
    } catch (error) {
      console.error("Error updating battle statistics:", error);
    }
  }

  /**
   * 탐험 통계 업데이트
   */
  static async updateExplorationStatistics(
    characterId: number,
    _stageVisited: string,
    isNewStage: boolean
  ): Promise<void> {
    try {
      const stats = await this.getCharacterStatistics(characterId);
      if (!stats) return;

      const updates: Partial<CharacterStatistics> = {
        total_stages_visited: stats.total_stages_visited + 1,
        total_choices_made: stats.total_choices_made + 1,
        updated_at: new Date().toISOString(),
      };

      if (isNewStage) {
        updates.unique_stages_visited = stats.unique_stages_visited + 1;

        // 일일 퀘스트 업데이트
        await this.updateDailyQuestProgress(characterId, "exploration", 1);
      }

      await supabase
        .from("character_statistics")
        .update(updates)
        .eq("character_id", characterId);

      // 업적 확인
      await this.checkAndUnlockAchievements(characterId);
    } catch (error) {
      console.error("Error updating exploration statistics:", error);
    }
  }

  // ============================================
  // 알림 관련 메서드 (NOTIFICATIONS)
  // ============================================

  /**
   * 알림 생성
   */
  static async createNotification(
    characterId: number,
    notification: CreateNotificationParams
  ): Promise<Notification | null> {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          character_id: characterId,
          ...notification,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  /**
   * 알림 목록 조회
   */
  static async getNotifications(
    characterId: number,
    options: { unreadOnly?: boolean; limit?: number; offset?: number } = {}
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("character_id", characterId)
        .order("created_at", { ascending: false });

      if (options.unreadOnly) {
        query = query.eq("is_read", false);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 10) - 1
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }

  /**
   * 알림 읽음 처리
   */
  static async markNotificationsAsRead(
    characterId: number,
    notificationIds?: number[]
  ): Promise<void> {
    try {
      let query = supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("character_id", characterId);

      if (notificationIds && notificationIds.length > 0) {
        query = query.in("id", notificationIds);
      }

      await query;
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  }

  /**
   * 알림 개수 조회
   */
  static async getNotificationCounts(
    characterId: number
  ): Promise<NotificationCounts> {
    try {
      const { data: all } = await supabase
        .from("notifications")
        .select("id, type, is_read")
        .eq("character_id", characterId);

      const notifications = all || [];
      const byType: Record<NotificationType, number> = {
        achievement: 0,
        daily_quest: 0,
        level_up: 0,
        reward: 0,
        system: 0,
      };

      notifications.forEach((n) => {
        if (n.type in byType) {
          byType[n.type as NotificationType]++;
        }
      });

      return {
        total: notifications.length,
        unread: notifications.filter((n) => !n.is_read).length,
        byType,
      };
    } catch (error) {
      console.error("Error fetching notification counts:", error);
      return {
        total: 0,
        unread: 0,
        byType: {
          achievement: 0,
          daily_quest: 0,
          level_up: 0,
          reward: 0,
          system: 0,
        },
      };
    }
  }

  /**
   * 오래된 알림 삭제
   */
  static async deleteOldNotifications(
    characterId: number,
    daysOld: number = 30
  ): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      await supabase
        .from("notifications")
        .delete()
        .eq("character_id", characterId)
        .lt("created_at", cutoffDate.toISOString());
    } catch (error) {
      console.error("Error deleting old notifications:", error);
    }
  }

  // ============================================
  // 헬퍼 메서드
  // ============================================

  /**
   * 보상 적용
   */
  private static async applyReward(
    characterId: number,
    reward: { gold?: number; exp?: number; stat?: string; value?: number }
  ): Promise<void> {
    try {
      const { data: character } = await supabase
        .from("vygddrasilclass")
        .select("gold, exp, level, str, agi, int, hp, mp, luck")
        .eq("id", characterId)
        .single();

      if (!character) return;

      const updates: Record<string, number> = {};

      if (reward.gold) {
        updates.gold = (character.gold || 0) + reward.gold;
      }

      if (reward.exp) {
        let newExp = (character.exp || 0) + reward.exp;
        let newLevel = character.level || 1;
        const EXP_PER_LEVEL = 100;

        while (newExp >= EXP_PER_LEVEL) {
          newExp -= EXP_PER_LEVEL;
          newLevel++;
        }

        updates.exp = newExp;
        if (newLevel > (character.level || 1)) {
          updates.level = newLevel;
        }
      }

      if (reward.stat && reward.value) {
        const statKey = reward.stat.toLowerCase() as keyof typeof character;
        if (statKey in character && typeof character[statKey] === "number") {
          updates[statKey] = (character[statKey] as number) + reward.value;
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("vygddrasilclass")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", characterId);
      }
    } catch (error) {
      console.error("Error applying reward:", error);
    }
  }
}
