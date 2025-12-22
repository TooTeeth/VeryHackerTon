// types/vygddrasil.types.ts

export type ChoiceItem = {
  id: number;
  mainstream_slug: string;
  choice: string;
  value: string;
  state: string;
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
  str: number;
  agi: number;
  int: number;
  hp: number;
  mp: number;
  luck: number;
  created_at: string;
  updated_at?: string;
  wallet_address: string;
};

export type CharacterWithProgress = Character & {
  progress?: GameProgress;
};

export type CharacterClass = "assassin" | "archer" | "bard" | "magician" | "warrior";
