// constants/vygddrasil.constants.ts

export const GAME_CONFIG = {
  GAME_ID: "vygddrasil",
  INITIAL_STAGE: "Vygddrasil",
  INITIAL_STAGE_2: "여신의부탁수락",
  MAX_RECENT_CHOICES: 3,
} as const;

export const SPECIAL_VALUES = {
  ENDING: "ending",
  SHOW_MODAL: "showModal",
  REVIVE: "revive",
} as const;

export const ROUTES = {
  PLAY: "/play",
  VYGDDRASIL: "/vygddrasil",
  VYGDDRASIL_NEW: "/vygddrasil/new",
  VYGDDRASIL_START: "/vygddrasil/start",
} as const;

export const MESSAGES = {
  WALLET_NOT_CONNECTED: "지갑을 먼저 연결해주세요!",
  SAVE_SUCCESS: "게임 저장 완료!",
  SAVE_ERROR: "저장 실패",
  LOAD_SUCCESS: "진행 상황을 불러왔습니다!",
  RESET_CONFIRM: "정말 처음부터 다시 시작하시겠습니까?",
  RESET_CONFIRM_2: "여신의부탁수락 스테이지로 이동하시겠습니까?",
  RESET_SUCCESS: "게임이 초기화되었습니다!",
  RESET_SUCCESS_2: "여신의부탁수락 스테이지로 이동했습니다!",
  RESET_ERROR: "초기화 실패!",
  NO_PREVIOUS_STAGE: "이전 단계가 없습니다.",
  GO_PREVIOUS: "이전 단계로 돌아갑니다.",
  NO_SAVED_GAME: "저장된 게임이 없습니다. New를 선택해주세요!",
  CONNECT_WALLET_PROMPT: "게임을 시작하려면 지갑을 연결해주세요",
  NO_SAVED_PROGRESS: "저장된 게임이 없습니다",
} as const;
