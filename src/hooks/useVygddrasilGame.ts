// hooks/useVygddrasilGame.ts

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { VygddrasilService } from "../services/vygddrasil.service";
import { ChoiceItem, StageMeta, ChoiceHistoryItem } from "../types/vygddrasil.types";
import { GAME_CONFIG, SPECIAL_VALUES, ROUTES, MESSAGES } from "../constants/vygddrasil.constants";

export const useVygddrasilGame = (walletAddress: string | undefined) => {
  const router = useRouter();

  // Game state - ✅ string 타입으로 변경
  const [currentStage, setCurrentStage] = useState<string>(GAME_CONFIG.INITIAL_STAGE);
  const [visitedStages, setVisitedStages] = useState<string[]>([GAME_CONFIG.INITIAL_STAGE]);
  const [choiceHistory, setChoiceHistory] = useState<ChoiceHistoryItem[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Stage data
  const [choices, setChoices] = useState<ChoiceItem[]>([]);
  const [stageMeta, setStageMeta] = useState<StageMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);

  /**
   * Load game progress from database
   */
  const loadProgress = useCallback(async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      const progress = await VygddrasilService.loadProgress(walletAddress);

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
  }, [walletAddress]);

  /**
   * Save game progress to database
   */
  const saveProgress = useCallback(
    async (silent = false) => {
      if (!walletAddress) {
        toast.error(MESSAGES.WALLET_NOT_CONNECTED);
        return;
      }

      const progressData = {
        wallet_address: walletAddress,
        game_id: GAME_CONFIG.GAME_ID,
        current_stage: currentStage,
        visited_stages: visitedStages,
        choices_made: choiceHistory,
      };

      const result = await VygddrasilService.saveProgress(progressData);

      if (result.success) {
        setLastSaved(new Date());
        if (!silent && !autoSaveEnabled) {
          toast.success(MESSAGES.SAVE_SUCCESS);
        }
      } else {
        toast.error(`${MESSAGES.SAVE_ERROR}: ${result.error}`);
      }
    },
    [walletAddress, currentStage, visitedStages, choiceHistory, autoSaveEnabled]
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
   * Handle choice selection
   */
  const handleChoiceClick = useCallback(
    (value: string, choiceText: string) => {
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

      // Record visited stage
      if (!visitedStages.includes(value)) {
        setVisitedStages((prev) => [...prev, value]);
      }

      // Record choice
      const newChoice: ChoiceHistoryItem = {
        stage: currentStage,
        choice: choiceText,
        timestamp: new Date().toISOString(),
      };
      setChoiceHistory((prev) => [...prev, newChoice]);

      // Move to next stage
      setCurrentStage(value);
    },
    [currentStage, visitedStages, saveProgress, router]
  );

  /**
   * Reset game progress
   */
  const resetProgress = useCallback(async () => {
    if (!walletAddress) return;

    const confirmed = window.confirm(MESSAGES.RESET_CONFIRM);
    if (!confirmed) return;

    const result = await VygddrasilService.deleteProgress(walletAddress);

    if (result.success) {
      setCurrentStage(GAME_CONFIG.INITIAL_STAGE);
      setVisitedStages([GAME_CONFIG.INITIAL_STAGE]);
      setChoiceHistory([]);
      setLastSaved(null);
      toast.success(MESSAGES.RESET_SUCCESS);
    } else {
      toast.error(MESSAGES.RESET_ERROR);
    }
  }, [walletAddress]);

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
      saveProgress(true);
    }
  }, [currentStage, autoSaveEnabled, walletAddress, saveProgress]);

  return {
    // State
    currentStage,
    visitedStages,
    choiceHistory,
    autoSaveEnabled,
    lastSaved,
    choices,
    stageMeta,
    isLoading,
    modalOpen,

    // Actions
    handleChoiceClick,
    saveProgress,
    resetProgress,
    goToPreviousStage,
    toggleAutoSave,
    setModalOpen,
  };
};
