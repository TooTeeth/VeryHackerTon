// ============================================
// GAMIFICATION TYPES
// Vygddrasil Game - Achievements, Daily Quests, Ranking, Statistics, Notifications
// ============================================

// ============================================
// 업적 타입 (ACHIEVEMENTS)
// ============================================

export type AchievementCategory = "battle" | "progress" | "collection" | "social";
export type AchievementRequirementType = "threshold" | "count" | "unique";
export type RewardType = "gold" | "exp" | "stat" | null;

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon_url?: string;
  reward_type: RewardType;
  reward_value: {
    gold?: number;
    exp?: number;
    stat?: string;
    value?: number;
  } | null;
  requirement_type: AchievementRequirementType;
  requirement_value: Record<string, number>;
  sort_order: number;
  is_hidden: boolean;
  created_at?: string;
}

export interface CharacterAchievement {
  id: number;
  character_id: number;
  achievement_id: number;
  unlocked_at: string;
  reward_claimed: boolean;
  achievement?: Achievement;
}

export interface AchievementProgress {
  achievement: Achievement;
  current_value: number;
  target_value: number;
  percentage: number;
  is_unlocked: boolean;
  unlocked_at?: string;
  reward_claimed: boolean;
}

// ============================================
// 일일 퀘스트 타입 (DAILY QUESTS)
// ============================================

export type DailyQuestType = "battle" | "exploration" | "gold" | "level";
export type DailyQuestDifficulty = "easy" | "normal" | "hard";

export interface DailyQuest {
  id: number;
  code: string;
  name: string;
  description: string;
  quest_type: DailyQuestType;
  target_count: number;
  reward_gold: number;
  reward_exp: number;
  reward_stat_type?: string;
  reward_stat_value: number;
  difficulty: DailyQuestDifficulty;
  is_active: boolean;
  created_at?: string;
}

export interface CharacterDailyQuest {
  id: number;
  character_id: number;
  quest_id: number;
  quest_date: string;
  current_count: number;
  is_completed: boolean;
  reward_claimed: boolean;
  created_at?: string;
  quest?: DailyQuest;
}

export interface DailyQuestProgress {
  quest: DailyQuest;
  current_count: number;
  is_completed: boolean;
  reward_claimed: boolean;
  percentage: number;
}

// ============================================
// 랭킹 타입 (LEADERBOARD)
// ============================================

export interface LeaderboardEntry {
  id: number;
  character_id: number;
  wallet_address: string;
  nickname: string;
  class: string;
  level: number;
  exp: number;
  total_battles: number;
  battles_won: number;
  total_gold_earned: number;
  stages_visited: number;
  rank_position: number;
  score: number;
  updated_at: string;
}

export type LeaderboardSortBy = "score" | "level" | "battles_won" | "total_gold_earned";

export interface LeaderboardFilter {
  sortBy: LeaderboardSortBy;
  limit: number;
  offset: number;
  characterClass?: string;
}

// ============================================
// 통계 타입 (STATISTICS)
// ============================================

export interface CharacterStatistics {
  id: number;
  character_id: number;
  // 전투 통계
  total_battles: number;
  battles_won: number;
  battles_lost: number;
  battles_fled: number;
  total_damage_dealt: number;
  total_damage_received: number;
  critical_hits: number;
  dodges: number;
  // 진행 통계
  total_stages_visited: number;
  unique_stages_visited: number;
  total_choices_made: number;
  // 경제 통계
  total_gold_earned: number;
  total_gold_spent: number;
  total_exp_earned: number;
  // 기록
  longest_win_streak: number;
  current_win_streak: number;
  highest_damage_single_hit: number;
  fastest_battle_win_turns?: number;
  created_at: string;
  updated_at: string;
}

export interface StatsSummary {
  winRate: number;
  averageDamagePerBattle: number;
  criticalHitRate: number;
  dodgeRate: number;
}

export interface BattleStatisticsUpdate {
  result: "victory" | "defeat" | "fled";
  damageDealt: number;
  damageReceived: number;
  criticalHits: number;
  dodges: number;
  turns: number;
  goldEarned: number;
  expEarned: number;
}

// ============================================
// 알림 타입 (NOTIFICATIONS)
// ============================================

export type NotificationType =
  | "achievement"
  | "daily_quest"
  | "level_up"
  | "reward"
  | "system";

export interface Notification {
  id: number;
  character_id: number;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  data: {
    achievement_id?: number;
    quest_id?: number;
    reward?: {
      gold?: number;
      exp?: number;
      stat?: string;
      value?: number;
    };
    [key: string]: unknown;
  };
  is_read: boolean;
  created_at: string;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

export interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  data?: Record<string, unknown>;
}
