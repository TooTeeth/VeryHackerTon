// hooks/useVygddrasilGame.ts

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { VygddrasilService } from "../services/vygddrasil.service";
import { GamificationService } from "../services/gamification.service";
import { VotingService, VotingSessionWithOptions } from "../services/voting.service";
import { ChoiceItem, StageMeta, ChoiceHistoryItem, Character, Enemy, BattleChoice, BattleRewardConfig, BattleMode, BattleAction, Skill } from "../types/vygddrasil.types";
import { GAME_CONFIG, SPECIAL_VALUES, ROUTES, MESSAGES } from "../constants/vygddrasil.constants";
import { useBattle } from "./useBattle";

export const useVygddrasilGame = (
  walletAddress: string | undefined,
  characterId?: number | null, // 🆕 character ID parameter
  character?: Character | null, // 🆕 character data for battle
  battleMode: BattleMode = "auto" // 🆕 battle mode from ViewerSettings
) => {
  const router = useRouter();

  // Game state - ✅ string 타입으로 변경
  const [currentStage, setCurrentStage] = useState<string>(GAME_CONFIG.INITIAL_STAGE);
  const [visitedStages, setVisitedStages] = useState<string[]>([GAME_CONFIG.INITIAL_STAGE]);
  const [choiceHistory, setChoiceHistory] = useState<ChoiceHistoryItem[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveToastEnabled, setAutoSaveToastEnabled] = useState(() => {
    // localStorage에서 설정 로드
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vygddrasil_autosave_toast");
      return saved !== "false"; // 기본값 true
    }
    return true;
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Stage data
  const [choices, setChoices] = useState<ChoiceItem[]>([]);
  const [stageMeta, setStageMeta] = useState<StageMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  // Revive state
  const [reviveModalOpen, setReviveModalOpen] = useState(false);
  const [isReviving, setIsReviving] = useState(false);
  const [characterGold, setCharacterGold] = useState(0);
  const [goldRefreshTrigger, setGoldRefreshTrigger] = useState(0); // 골드 갱신 트리거
  const REVIVE_GOLD_COST = 100; // 부활에 필요한 골드

  // Battle state
  const [battleModalOpen, setBattleModalOpen] = useState(false);
  const [currentEnemy, setCurrentEnemy] = useState<Enemy | null>(null);
  const [battleChoices, setBattleChoices] = useState<BattleChoice[]>([]);
  const [battleRewardConfig, setBattleRewardConfig] = useState<BattleRewardConfig | null>(null);
  const [currentBattleMode, setCurrentBattleMode] = useState<BattleMode>(battleMode);
  const [isRetrying, setIsRetrying] = useState(false);
  const [pendingNextStage, setPendingNextStage] = useState<string | null>(null);

  // Voting state
  const [votingModalOpen, setVotingModalOpen] = useState(false);
  const [currentVotingSession, setCurrentVotingSession] = useState<VotingSessionWithOptions | null>(null);
  const [pendingVotingChoice, setPendingVotingChoice] = useState<{ value: string; choiceText: string } | null>(null);

  // useBattle hook
  const { battleState, startBattle, executePlayerAction, executeEnemyAction, executeAutoBattle, executeChoiceBattle, endBattle, restartBattle } = useBattle(character || null);

  // 🆕 battleMode가 변경되면 currentBattleMode도 업데이트
  // 전투 중에도 모드 변경 가능 (HP 상태는 유지됨)
  useEffect(() => {
    setCurrentBattleMode(battleMode);

    // 전투 중에 턴제로 변경되면 현재 HP 상태로 턴제 전투 시작
    if (battleMode === "turn-based" && currentEnemy && !battleState.isActive) {
      startBattle(currentEnemy);
    }
  }, [battleMode, currentEnemy, battleState.isActive, startBattle]);

  /**
   * Load game progress from database
   */
  const loadProgress = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      // 🆕 Load progress for specific character if characterId exists
      const progress = await VygddrasilService.loadProgress(walletAddress, characterId || undefined);

      if (progress) {
        setCurrentStage(progress.current_stage);
        setVisitedStages(progress.visited_stages || [GAME_CONFIG.INITIAL_STAGE]);
        setChoiceHistory(progress.choices_made || []);
        toast.success(MESSAGES.LOAD_SUCCESS);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, characterId]);

  /**
   * Save game progress to database
   */
  const saveProgress = useCallback(
    async (silent = false) => {
      if (!walletAddress) {
        toast.error(MESSAGES.WALLET_NOT_CONNECTED);
        return;
      }

      // characterId가 없으면 저장하지 않음
      if (!characterId) {
        console.log("No characterId, skipping save");
        return;
      }

      const progressData = {
        wallet_address: walletAddress,
        game_id: GAME_CONFIG.GAME_ID,
        current_stage: currentStage,
        visited_stages: visitedStages,
        choices_made: choiceHistory,
        character_id: characterId,
      };

      const result = await VygddrasilService.saveProgress(progressData);

      if (result.success) {
        setLastSaved(new Date());
        // 수동 저장 또는 자동 저장 토스트가 활성화된 경우 토스트 표시
        if (!silent) {
          toast.success(MESSAGES.SAVE_SUCCESS);
        } else if (autoSaveToastEnabled) {
          // 자동 저장 시 토스트 (설정에 따라)
          toast.success("자동 저장됨", { autoClose: 1500 });
        }
      } else {
        toast.error(`${MESSAGES.SAVE_ERROR}: ${result.error}`);
      }
    },
    [walletAddress, currentStage, visitedStages, choiceHistory, autoSaveToastEnabled, characterId]
  );

  /**
   * Fetch stage data (choices and metadata)
   */
  const fetchStageData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { choices: newChoices, stageMeta: newStageMeta } = await VygddrasilService.fetchStageData(currentStage);

      setChoices(newChoices);
      setStageMeta(newStageMeta);
    } catch (error) {
      console.error("Error fetching stage data:", error);
      setChoices([]);
      setStageMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentStage]);

  /**
   * Start battle with enemy
   * @param enemy - Enemy object (if already fetched) or null to fetch from stageSlug
   */
  const initiateBattle = useCallback(
    async (stageSlug: string, nextStage: string, battleMode: BattleMode = "auto", enemyData?: Enemy | null) => {
      console.log("🎮 initiateBattle called", { character: !!character, enemyData: !!enemyData, stageSlug });

      if (!character) {
        console.error("❌ No character data available");
        toast.error("캐릭터 정보가 없습니다.");
        return;
      }

      // 이미 전투가 진행 중이면 모드 변경 및 필요한 데이터 로드
      if (battleState.isActive && currentEnemy && battleState.result === "ongoing") {
        // 선택지 모드로 변경 시 선택지 데이터 로드
        if (battleMode === "choice" && battleChoices.length === 0) {
          const choices = await VygddrasilService.getBattleChoices(currentEnemy.id);
          setBattleChoices(choices);
        }
        setCurrentBattleMode(battleMode);
        setBattleModalOpen(true);
        return;
      }

      // 적 정보가 제공되었으면 바로 사용, 아니면 DB에서 로드
      let enemy = enemyData;
      if (!enemy) {
        console.log("🔍 Fetching enemy from DB for stage:", stageSlug);
        enemy = await VygddrasilService.getEnemyByStage(stageSlug);
      }

      if (!enemy) {
        console.error("❌ No enemy found for stage:", stageSlug);
        toast.error("적 정보를 찾을 수 없습니다.");
        return;
      }

      console.log("✅ Opening battle modal", { enemy: enemy.name, battleMode });

      // 즉시 모달 열기 (로딩 상태로)
      setCurrentEnemy(enemy);
      setCurrentBattleMode(battleMode);
      setPendingNextStage(nextStage);
      setBattleModalOpen(true);

      // 턴제 전투는 자동으로 시작
      if (battleMode === "turn-based") {
        startBattle(enemy);
      }

      // 백그라운드에서 보상 설정과 선택지 로드
      try {
        const [rewardConfig, choices] = await Promise.all([VygddrasilService.getBattleRewardConfig(enemy.id), battleMode === "choice" ? VygddrasilService.getBattleChoices(enemy.id) : Promise.resolve([])]);

        setBattleRewardConfig(rewardConfig);
        setBattleChoices(choices);
      } catch (error) {
        console.error("Error loading battle data:", error);
        // 에러가 나도 전투는 계속 진행 (보상만 없음)
      }
    },
    [character, startBattle, battleState.isActive, battleState.result, currentEnemy, battleChoices.length]
  );

  /**
   * Handle auto battle start
   */
  const handleStartAutoBattle = useCallback(() => {
    if (!currentEnemy) return;
    executeAutoBattle(currentEnemy, battleRewardConfig || undefined);
  }, [currentEnemy, battleRewardConfig, executeAutoBattle]);

  /**
   * Handle player action in turn-based battle
   */
  const handlePlayerAction = useCallback(
    (action: BattleAction, skill?: Skill) => {
      executePlayerAction(action, skill);
      // 플레이어 행동 후 적 행동 실행 (0.5초 후)
      setTimeout(() => {
        executeEnemyAction();
      }, 500);
    },
    [executePlayerAction, executeEnemyAction]
  );

  /**
   * Handle choice selection in choice battle
   */
  const handleBattleChoiceSelect = useCallback(
    (choice: BattleChoice) => {
      if (!currentEnemy) return;
      executeChoiceBattle(currentEnemy, choice, battleRewardConfig || undefined);
    },
    [currentEnemy, battleRewardConfig, executeChoiceBattle]
  );

  /**
   * Handle battle end
   */
  const handleBattleEnd = useCallback(
    async (result: "victory" | "defeat" | "fled") => {
      if (!character || !characterId) return;

      // 먼저 UI 상태 즉시 업데이트 (사용자 경험 개선)
      setBattleModalOpen(false);

      // 전투 종료 후 처리 (즉시 실행)
      if (result === "victory" || result === "fled") {
        // 다음 스테이지로 이동
        if (pendingNextStage) {
          if (!visitedStages.includes(pendingNextStage)) {
            setVisitedStages((prev) => [...prev, pendingNextStage]);
          }
          setCurrentStage(pendingNextStage);
        }
      } else if (result === "defeat") {
        // 패배 시 처음부터 (트랜잭션 없이 종료한 경우)
        setCurrentStage(GAME_CONFIG.INITIAL_STAGE);
        setVisitedStages([GAME_CONFIG.INITIAL_STAGE]);
        setChoiceHistory([]);
        toast.info("처음부터 다시 시작합니다.");
      }

      // 상태 초기화
      const enemyForSave = currentEnemy;
      const rewardsForSave = battleState.rewards;
      const battleLogForSave = battleState.battleLog;
      const turnCountForSave = battleState.turnCount;

      setCurrentEnemy(null);
      setBattleChoices([]);
      setBattleRewardConfig(null);
      setPendingNextStage(null);
      endBattle();

      // 백그라운드에서 DB 저장 작업 수행 (UI 차단 없음)
      if (enemyForSave && rewardsForSave) {
        // 승리 시 보상 적용 (빠르게 처리)
        if (result === "victory") {
          VygddrasilService.applyBattleRewards(characterId, rewardsForSave).then((rewardResult) => {
            if (rewardResult.leveledUp) {
              toast.success(`레벨 업! Lv.${rewardResult.newLevel}`);
            }
            setGoldRefreshTrigger((prev) => prev + 1); // 골드 갱신
          });
        }

        // 나머지 작업은 백그라운드에서 병렬 처리
        Promise.all([
          VygddrasilService.saveBattleHistory(characterId, enemyForSave.id, currentBattleMode, result, turnCountForSave, rewardsForSave.exp || 0, rewardsForSave.gold || 0, battleLogForSave),
          // Gamification 작업들도 병렬 처리
          (async () => {
            let totalDamageDealt = 0;
            let totalDamageReceived = 0;
            let criticalHits = 0;
            let dodges = 0;

            battleLogForSave.forEach((log) => {
              if (log.actor === "player" && log.damage) {
                totalDamageDealt += log.damage;
                if (log.isCritical) criticalHits++;
              } else if (log.actor === "enemy" && log.damage) {
                totalDamageReceived += log.damage;
              }
              if (log.isDodged) {
                dodges++;
              }
            });

            await GamificationService.updateBattleStatistics(characterId, {
              result,
              damageDealt: totalDamageDealt,
              damageReceived: totalDamageReceived,
              criticalHits,
              dodges,
              turns: turnCountForSave,
              goldEarned: rewardsForSave?.gold || 0,
              expEarned: rewardsForSave?.exp || 0,
            });
          })(),
          GamificationService.checkAndUnlockAchievements(characterId).then((newAchievements) => {
            if (newAchievements.length > 0) {
              newAchievements.forEach((ach) => {
                toast.success(`🏆 업적 달성: ${ach.name}`);
              });
            }
          }),
          result === "victory" ? GamificationService.updateDailyQuestProgress(characterId, "battle", 1) : Promise.resolve(),
          GamificationService.updateLeaderboardEntry(characterId),
        ]).catch((error) => {
          console.error("Background battle save error:", error);
        });
      }
    },
    [character, characterId, currentEnemy, battleState, currentBattleMode, pendingNextStage, visitedStages, endBattle]
  );

  /**
   * Handle battle retry (with transaction)
   */
  const handleBattleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      // TODO: 실제 트랜잭션 처리 구현
      // 여기서는 시뮬레이션으로 1초 대기
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 재시작
      restartBattle();
      toast.success("전투를 재시작합니다!");
    } catch (error) {
      console.error("Retry transaction failed:", error);
      toast.error("트랜잭션에 실패했습니다.");
    } finally {
      setIsRetrying(false);
    }
  }, [restartBattle]);

  /**
   * Handle choice selection
   */
  const [isProcessingChoice, setIsProcessingChoice] = useState(false);

  // Reset processing flag when stage changes or character changes (safety mechanism)
  useEffect(() => {
    setIsProcessingChoice(false);
  }, [currentStage, character?.id]);

  const handleChoiceClick = useCallback(
    async (value: string, choiceText: string, battleMode?: BattleMode) => {
      // 중복 클릭 방지
      if (isProcessingChoice) {
        console.log("🚫 Duplicate click prevented - already processing");
        return;
      }

      // Handle ending
      if (value === SPECIAL_VALUES.ENDING) {
        saveProgress(true);
        router.push(ROUTES.PLAY);
        return;
      }

      // Handle modal
      if (value === SPECIAL_VALUES.SHOW_MODAL) {
        setModalOpen(true);
        return;
      }

      // Handle revive (부활하기)
      if (value === SPECIAL_VALUES.REVIVE || choiceText.includes("부활")) {
        // 캐릭터 골드 조회
        if (characterId) {
          const gold = await VygddrasilService.getCharacterGold(characterId);
          setCharacterGold(gold);
        }
        setReviveModalOpen(true);
        return;
      }

      // Check if this is a voting choice - if so, open voting modal
      const matchingChoice = choices.find((c) => c.value === value);
      if (matchingChoice?.isVotingChoice && matchingChoice.votingSessionId) {
        // 투표 세션 정보 가져오기
        const session = await VotingService.getSessionById(matchingChoice.votingSessionId, walletAddress);
        if (session) {
          // 투표가 아직 진행 중인지 확인
          const now = new Date();
          const endTime = new Date(session.end_time);
          if (now < endTime) {
            // 투표 진행 중 - 모달 열기
            setCurrentVotingSession(session);
            setPendingVotingChoice({ value, choiceText });
            setVotingModalOpen(true);
            return;
          }
        }
      }

      setIsProcessingChoice(true);

      try {
        // Handle "처음부터 다시 시작하기" - 골드 초기화
        if (choiceText.includes("처음부터 다시 시작") || choiceText.includes("처음부터 시작")) {
          if (characterId) {
            const result = await VygddrasilService.resetCharacterGold(characterId);
            if (result.success) {
              setGoldRefreshTrigger((prev) => prev + 1); // 사이드바 골드 갱신 트리거
              toast.info("골드가 초기화되었습니다.");
            }
          }
        }

        // Handle battle trigger (value가 "battle:"로 시작하면 전투)
        if (value.startsWith("battle:")) {
          const nextStage = value.replace("battle:", "");
          // 전투 시작 (비동기로 실행하고 즉시 리턴)
          initiateBattle(currentStage, nextStage, battleMode || currentBattleMode);

          // Record choice
          const newChoice: ChoiceHistoryItem = {
            stage: currentStage,
            choice: choiceText,
            timestamp: new Date().toISOString(),
          };
          setChoiceHistory((prev) => [...prev, newChoice]);

          // Reset processing flag after a short delay
          setTimeout(() => setIsProcessingChoice(false), 500);
          return;
        }

        // 🆕 자동 전투 감지: 현재 스테이지에 적이 있는지 확인
        // "싸운다", "전투", "공격" 등의 키워드가 포함된 선택지일 경우 전투 체크
        const battleKeywords = ["싸운다", "싸우다", "전투", "공격", "맞서", "물리"];
        const isBattleChoice = battleKeywords.some((keyword) => choiceText.includes(keyword));

        if (isBattleChoice) {
          console.log("⚔️ Battle choice detected", { choiceText, currentStage, character: !!character });

          // Record choice immediately (don't wait for DB)
          const newChoice: ChoiceHistoryItem = {
            stage: currentStage,
            choice: choiceText,
            timestamp: new Date().toISOString(),
          };
          setChoiceHistory((prev) => [...prev, newChoice]);

          // 적 확인 및 전투 시작 (비동기, 기다리지 않음)
          console.log("🔍 Checking for enemy...");
          VygddrasilService.getEnemyByStage(currentStage)
            .then((enemy) => {
              console.log("🎯 Enemy check result:", { enemy: enemy?.name || "none" });
              if (enemy) {
                // 적이 있으면 전투 시작
                initiateBattle(currentStage, value, battleMode || currentBattleMode, enemy);
              } else {
                // 적이 없으면 일반 스테이지 이동
                console.log("➡️ No enemy, moving to next stage");
                setVisitedStages((prev) => (!prev.includes(value) ? [...prev, value] : prev));
                setCurrentStage(value);
              }
              // Reset processing flag after battle initiated
              setTimeout(() => setIsProcessingChoice(false), 500);
            })
            .catch((error) => {
              console.error("❌ Error checking for enemy:", error);
              // 에러 발생 시 일반 스테이지 이동
              setVisitedStages((prev) => (!prev.includes(value) ? [...prev, value] : prev));
              setCurrentStage(value);
              // Reset processing flag on error
              setTimeout(() => setIsProcessingChoice(false), 500);
            });

          return;
        }

        // Record choice first (using current stage before it changes)
        const newChoice: ChoiceHistoryItem = {
          stage: currentStage,
          choice: choiceText,
          timestamp: new Date().toISOString(),
        };

        // Batch state updates together
        setChoiceHistory((prev) => [...prev, newChoice]);

        // Record visited stage
        const isNewStage = !visitedStages.includes(value);
        if (isNewStage) {
          setVisitedStages((prev) => [...prev, value]);
        }

        // Move to next stage (this triggers fetchStageData via useEffect)
        setCurrentStage(value);

        // 페이지 맨 위로 스크롤 (기본 뷰어에서 선택지 클릭 시)
        if (typeof window !== "undefined") {
          // section#vygddrasil-main이 스크롤 컨테이너이므로 해당 요소 스크롤
          const mainSection = document.getElementById("vygddrasil-main");
          if (mainSection) {
            mainSection.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            // fallback: window 스크롤
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }

        // 🆕 Gamification: 탐험 통계 업데이트
        if (characterId) {
          await GamificationService.updateExplorationStatistics(characterId, value, isNewStage);

          // 일일 퀘스트 진행도 업데이트 (탐험)
          await GamificationService.updateDailyQuestProgress(characterId, "exploration", 1);

          // 업적 확인
          const newAchievements = await GamificationService.checkAndUnlockAchievements(characterId);
          if (newAchievements.length > 0) {
            newAchievements.forEach((ach) => {
              toast.success(`🏆 업적 달성: ${ach.name}`);
            });
          }
        }
      } finally {
        setIsProcessingChoice(false);
      }
    },
    [currentStage, visitedStages, router, initiateBattle, currentBattleMode, isProcessingChoice, saveProgress, characterId, character, choices, walletAddress]
  );

  /**
   * Reset game progress
   */
  const resetProgress = useCallback(async () => {
    if (!walletAddress) return;

    const confirmed = window.confirm(MESSAGES.RESET_CONFIRM);
    if (!confirmed) return;

    // 🆕 Delete progress for specific character
    const result = await VygddrasilService.deleteProgress(walletAddress, characterId || undefined);

    if (result.success) {
      setCurrentStage(GAME_CONFIG.INITIAL_STAGE);
      setVisitedStages([GAME_CONFIG.INITIAL_STAGE]);
      setChoiceHistory([]);
      setLastSaved(null);
      toast.success(MESSAGES.RESET_SUCCESS);
    } else {
      toast.error(MESSAGES.RESET_ERROR);
    }
  }, [walletAddress, characterId]);

  /**
   * Reset to stage 2 (여신의부탁수락)
   */
  const resetToStage2 = useCallback(async () => {
    if (!walletAddress) return;

    const confirmed = window.confirm(MESSAGES.RESET_CONFIRM_2);
    if (!confirmed) return;

    // Delete existing progress
    await VygddrasilService.deleteProgress(walletAddress, characterId || undefined);

    // Set to stage 2
    setCurrentStage(GAME_CONFIG.INITIAL_STAGE_2);
    setVisitedStages([GAME_CONFIG.INITIAL_STAGE_2]);
    setChoiceHistory([]);
    setLastSaved(null);
    toast.success(MESSAGES.RESET_SUCCESS_2);
  }, [walletAddress, characterId]);

  /**
   * Go to previous stage
   */
  const goToPreviousStage = useCallback(() => {
    if (choiceHistory.length === 0) {
      toast.info(MESSAGES.NO_PREVIOUS_STAGE);
      return;
    }

    const lastChoice = choiceHistory[choiceHistory.length - 1];
    setCurrentStage(lastChoice.stage);
    setChoiceHistory((prev) => prev.slice(0, -1));
    toast.info(MESSAGES.GO_PREVIOUS);
  }, [choiceHistory]);

  /**
   * Toggle auto-save
   */
  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled((prev) => !prev);
  }, []);

  /**
   * Toggle auto-save toast
   */
  const toggleAutoSaveToast = useCallback(() => {
    setAutoSaveToastEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem("vygddrasil_autosave_toast", String(newValue));
      return newValue;
    });
  }, []);

  /**
   * Handle voting complete - proceed to next stage or allow selection
   */
  const handleVoteComplete = useCallback(
    async (winningChoiceId?: number) => {
      setVotingModalOpen(false);

      if (!pendingVotingChoice) return;

      const { value, choiceText } = pendingVotingChoice;

      // Record choice
      const newChoice: ChoiceHistoryItem = {
        stage: currentStage,
        choice: choiceText,
        timestamp: new Date().toISOString(),
      };
      setChoiceHistory((prev) => [...prev, newChoice]);

      // If there's a winning choice, check if it matches the selected choice
      if (winningChoiceId !== undefined) {
        // Find the choice value for the winning choice
        const winningChoice = choices.find((c) => c.id === winningChoiceId);
        if (winningChoice) {
          // Navigate to winning choice's stage
          if (!visitedStages.includes(winningChoice.value)) {
            setVisitedStages((prev) => [...prev, winningChoice.value]);
          }
          setCurrentStage(winningChoice.value);
        }
      } else {
        // No majority - allow the originally selected choice
        if (!visitedStages.includes(value)) {
          setVisitedStages((prev) => [...prev, value]);
        }
        setCurrentStage(value);
      }

      // Clear pending voting choice
      setPendingVotingChoice(null);
      setCurrentVotingSession(null);

      // Scroll to top
      if (typeof window !== "undefined") {
        const mainSection = document.getElementById("vygddrasil-main");
        if (mainSection) {
          mainSection.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    },
    [pendingVotingChoice, currentStage, choices, visitedStages]
  );

  /**
   * Handle revive with gold (골드 소모 부활 - 이전 선택지로 돌아감)
   */
  const handleReviveWithGold = useCallback(async () => {
    if (!characterId || !walletAddress) {
      toast.error("캐릭터 정보가 없습니다.");
      return;
    }

    if (characterGold < REVIVE_GOLD_COST) {
      toast.error("골드가 부족합니다.");
      return;
    }

    setIsReviving(true);
    try {
      // 골드 차감
      const result = await VygddrasilService.deductCharacterGold(characterId, REVIVE_GOLD_COST);
      if (!result.success) {
        toast.error("골드 차감에 실패했습니다.");
        setIsReviving(false);
        return;
      }

      // 이전 선택지로 돌아가기 (goToPreviousStage 로직)
      if (choiceHistory.length > 0) {
        const lastChoice = choiceHistory[choiceHistory.length - 1];
        setCurrentStage(lastChoice.stage);
        setChoiceHistory((prev) => prev.slice(0, -1));
        toast.success(`${REVIVE_GOLD_COST}G를 소모하고 이전 선택지로 돌아갔습니다!`);
      } else {
        // 선택지 기록이 없으면 초기 스테이지로
        setCurrentStage(GAME_CONFIG.INITIAL_STAGE_2);
        setVisitedStages([GAME_CONFIG.INITIAL_STAGE_2]);
        setChoiceHistory([]);
        toast.success(`${REVIVE_GOLD_COST}G를 소모하고 부활했습니다!`);
      }

      // 골드 상태 업데이트 및 갱신 트리거
      setCharacterGold((prev) => prev - REVIVE_GOLD_COST);
      setGoldRefreshTrigger((prev) => prev + 1); // 사이드바 골드 갱신 트리거
      setReviveModalOpen(false);
    } catch (error) {
      console.error("Revive with gold failed:", error);
      toast.error("부활에 실패했습니다.");
    } finally {
      setIsReviving(false);
    }
  }, [characterId, walletAddress, characterGold, REVIVE_GOLD_COST, choiceHistory]);

  /**
   * Handle revive with transaction (트랜잭션 부활 - 이전 선택지로 돌아감, 골드 소모 없음)
   */
  const handleReviveWithTransaction = useCallback(async () => {
    if (!walletAddress) {
      toast.error("지갑이 연결되어 있지 않습니다.");
      return;
    }

    setIsReviving(true);
    try {
      // 이전 선택지로 돌아가기 (골드 부활과 동일한 로직, 골드 소모 없음)
      if (choiceHistory.length > 0) {
        const lastChoice = choiceHistory[choiceHistory.length - 1];
        setCurrentStage(lastChoice.stage);
        setChoiceHistory((prev) => prev.slice(0, -1));
        toast.success("이전 선택지로 돌아갔습니다!");
      } else {
        // 선택지 기록이 없으면 초기 스테이지로
        setCurrentStage(GAME_CONFIG.INITIAL_STAGE_2);
        setVisitedStages([GAME_CONFIG.INITIAL_STAGE_2]);
        setChoiceHistory([]);
        toast.success("부활했습니다!");
      }

      setReviveModalOpen(false);
    } catch (error) {
      console.error("Revive with transaction failed:", error);
      toast.error("부활에 실패했습니다.");
    } finally {
      setIsReviving(false);
    }
  }, [walletAddress, choiceHistory]);

  // Load progress on mount
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Fetch stage data when stage changes
  useEffect(() => {
    fetchStageData();
  }, [fetchStageData]);

  // Auto-save when stage changes
  useEffect(() => {
    if (autoSaveEnabled && walletAddress && currentStage) {
      // 지연 저장으로 상태 업데이트 완료 후 저장
      const timer = setTimeout(() => {
        saveProgress(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStage, autoSaveEnabled, walletAddress, saveProgress]);

  return {
    // State
    currentStage,
    visitedStages,
    choiceHistory,
    autoSaveEnabled,
    autoSaveToastEnabled,
    lastSaved,
    choices,
    stageMeta,
    isLoading,
    modalOpen,

    // Battle State
    battleModalOpen,
    currentEnemy,
    battleChoices,
    battleRewardConfig,
    currentBattleMode,
    battleState,
    isRetrying,

    // Revive State
    reviveModalOpen,
    isReviving,
    characterGold,
    reviveGoldCost: REVIVE_GOLD_COST,
    goldRefreshTrigger,

    // Voting State
    votingModalOpen,
    currentVotingSession,

    // Actions
    handleChoiceClick,
    saveProgress,
    resetProgress,
    resetToStage2,
    goToPreviousStage,
    toggleAutoSave,
    toggleAutoSaveToast,
    setModalOpen,

    // Battle Actions
    setBattleModalOpen,
    setCurrentBattleMode,
    handleStartAutoBattle,
    handlePlayerAction,
    handleBattleChoiceSelect,
    handleBattleEnd,
    handleBattleRetry,
    initiateBattle,

    // Revive Actions
    setReviveModalOpen,
    handleReviveWithGold,
    handleReviveWithTransaction,

    // Voting Actions
    setVotingModalOpen,
    handleVoteComplete,
  };
};
