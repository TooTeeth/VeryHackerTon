// types/vygddrasil.types.ts

export type ChoiceItem = {
  id: number;
  mainstream_slug: string;
  choice: string;
  value: string;
  state: string;
  // 투표 관련 (런타임에 추가됨)
  isVotingChoice?: boolean;
  isDisabledByVote?: boolean;
  votingSessionId?: number;
};

export type StageMeta = {
  title: string;
  description: string;
  image_url: string;
};

export type ChoiceHistoryItem = {
  stage: string;
  choice: string;
  timestamp: string;
};

export type GameProgress = {
  id?: number;
  wallet_address: string;
  game_id: string;
  current_stage: string;
  visited_stages: string[];
  choices_made: ChoiceHistoryItem[];
  created_at?: string;
  updated_at?: string;
  character_id?: number; // 🆕 추가
};

export type GameState = {
  currentStage: string;
  visitedStages: string[];
  choiceHistory: ChoiceHistoryItem[];
  autoSaveEnabled: boolean;
  lastSaved: Date | null;
};

// 🆕 캐릭터 관련 타입 추가
export type Character = {
  id: number;
  class: string;
  nickname: string;
  str: number;
  agi: number;
  int: number;
  hp: number;
  mp: number;
  luck: number;
  created_at: string;
  updated_at?: string;
  wallet_address: string;
  // NFT 장착으로 인한 보너스 스텟
  bonus_str?: number;
  bonus_agi?: number;
  bonus_int?: number;
  bonus_hp?: number;
  bonus_mp?: number;
  bonus_luck?: number;
  equipped_nft_id?: number;
};

export type CharacterWithProgress = Character & {
  progress?: GameProgress;
};

export type CharacterClass = "assassin" | "archer" | "bard" | "magician" | "warrior";

// ============================================
// 전투 시스템 타입
// ============================================

/** 전투 모드 */
export type BattleMode = "turn-based" | "auto" | "choice";

/** 전투 속도 */
export type BattleSpeed = "slow" | "normal" | "fast";

/** 전투 액션 */
export type BattleAction = "attack" | "defend" | "skill" | "flee";

/** 공격 타입 */
export type AttackType = "physical" | "magical" | "mixed";

/** 적(Enemy) 타입 */
export type Enemy = {
  id: number;
  name: string;
  description: string;
  image_url: string;
  level: number;
  str: number;
  agi: number;
  int: number;
  hp: number;
  mp: number;
  luck: number;
  attack_type: AttackType;
  stage_slug: string;
  created_at?: string;
};

/** 전투 보상 설정 */
export type BattleRewardConfig = {
  id: number;
  enemy_id: number;
  exp_reward: number;
  gold_reward: number;
  stat_bonus_type: "str" | "agi" | "int" | "hp" | "mp" | "luck" | "random" | null;
  stat_bonus_value: number;
  nft_reward_enabled: boolean;
  nft_contract_address?: string;
  nft_token_id?: string;
};

/** 전투 보상 결과 */
export type BattleRewards = {
  exp: number;
  gold: number;
  statBonus?: {
    stat: string;
    value: number;
  };
  nftReward?: boolean;
  nftContractAddress?: string;
  nftTokenId?: string;
};

/** 전투 로그 항목 */
export type BattleLogEntry = {
  turn: number;
  actor: "player" | "enemy";
  action: string;
  damage?: number;
  heal?: number;
  isCritical?: boolean;
  isDodged?: boolean;
  timestamp: string;
};

/** 버프/디버프 */
export type Buff = {
  id: string;
  name: string;
  stat: keyof CharacterStats;
  value: number;
  turnsRemaining: number;
};

/** 캐릭터 스텟 (전투 계산용) */
export type CharacterStats = {
  str: number;
  agi: number;
  int: number;
  hp: number;
  mp: number;
  luck: number;
};

/** 전투 상태 */
export type BattleState = {
  isActive: boolean;
  turn: "player" | "enemy";
  turnCount: number;
  // 플레이어 상태
  playerCurrentHp: number;
  playerMaxHp: number;
  playerCurrentMp: number;
  playerMaxMp: number;
  playerBuffs: Buff[];
  playerDebuffs: Buff[];
  playerDefending: boolean;
  // 적 상태
  enemy: Enemy | null;
  enemyCurrentHp: number;
  enemyMaxHp: number;
  enemyBuffs: Buff[];
  enemyDebuffs: Buff[];
  // 전투 로그
  battleLog: BattleLogEntry[];
  // 결과
  result: "ongoing" | "victory" | "defeat" | "fled";
  rewards?: BattleRewards;
};

/** 스킬 정의 */
export type Skill = {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  damageMultiplier: number;
  effectType: "damage" | "heal" | "buff" | "debuff";
  target: "enemy" | "self";
  classRestriction?: CharacterClass[];
};

/** 선택지 전투용 선택 항목 */
export type BattleChoice = {
  id: number;
  enemy_id: number;
  choice_text: string;
  outcome: "victory" | "defeat" | "partial_victory" | "escape";
  stat_check_stat?: keyof CharacterStats;
  stat_check_threshold?: number;
  description_success: string;
  description_failure: string;
};

/** 전투 기록 */
export type BattleHistory = {
  id: number;
  character_id: number;
  enemy_id: number;
  battle_mode: BattleMode;
  result: string;
  turns_taken: number;
  exp_gained: number;
  gold_gained: number;
  battle_log: BattleLogEntry[];
  created_at: string;
};
