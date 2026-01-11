"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useWallet } from "../../../app/context/WalletContext";
import { useVygddrasilGame } from "../../../hooks/useVygddrasilGame";
import BattleModal from "../../../components/Battlemodal/Battlemodal";
import { StageContent, ChoiceList, LoadingSpinner, GameSidebar, defaultViewerSettings, ReviveModal, VotingModal } from "../../../components/Vygdrasil";
import { GAME_CONFIG } from "../../../constants/vygddrasil.constants";
import type { ViewerSettings } from "../../../components/Vygdrasil";
import type { Character } from "../../../types/vygddrasil.types";
import { getSupabaseClient } from "../../../lib/supabaseClient";
const supabase = getSupabaseClient();

// BGM
const BGM_PATH = "/sounds/bgm/ThehillwheretheWindPasses-UG.mp3";

export default function StartPage() {
  const { wallet } = useWallet();
  const router = useRouter();
  const [characterId, setCharacterId] = useState<number | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [viewerSettings, setViewerSettings] = useState<ViewerSettings>(defaultViewerSettings);
  const [isPipMode, setIsPipMode] = useState(false);
  const [isPipWindow, setIsPipWindow] = useState(false);

  // BGM Audio Ref
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const [isBgmInitialized, setIsBgmInitialized] = useState(false);

  // page view
  const [goToPageNumber, setGoToPageNumber] = useState<number | undefined>(undefined);

  // Load character data
  useEffect(() => {
    const loadCharacter = async (id: number) => {
      const { data, error } = await supabase.from("vygddrasilclass").select("*").eq("id", id).single();

      if (!error && data) {
        setCharacter(data as Character);
      }
    };

    // Get selected character ID from sessionStorage
    const selectedId = sessionStorage.getItem("selectedCharacterId");
    if (!selectedId) {
      toast.error("캐릭터를 선택해주세요.");
      router.push("/vygddrasil/select");
      return;
    }
    const parsedId = parseInt(selectedId, 10);
    setCharacterId(parsedId);
    loadCharacter(parsedId);

    // Load viewer settings from localStorage
    const savedSettings = localStorage.getItem("vygddrasil_viewer_settings");
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);

        setViewerSettings({ ...defaultViewerSettings, ...parsed });
      } catch {
        // Use default settings if parse fails
      }
    }

    // PIP
    if (window.name === "VygddrasilPIP") {
      setIsPipWindow(true);
    }

    // PIP check
    const checkPipStatus = () => {
      const pipActive = localStorage.getItem("vygddrasil_pip_active");
      setIsPipMode(pipActive === "true" && window.name !== "VygddrasilPIP");
    };

    checkPipStatus();

    // storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "vygddrasil_pip_active") {
        checkPipStatus();
      }
    };

    window.addEventListener("storage", handleStorage);

    // PIP active
    if (window.name === "VygddrasilPIP") {
      localStorage.setItem("vygddrasil_pip_active", "true");

      window.addEventListener("beforeunload", () => {
        localStorage.setItem("vygddrasil_pip_active", "false");
      });
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [router]);

  // Save viewer settings to localStorage when changed
  const handleViewerSettingsChange = useCallback((settings: ViewerSettings) => {
    setViewerSettings(settings);
    localStorage.setItem("vygddrasil_viewer_settings", JSON.stringify(settings));
  }, []);

  // first page
  const handleGoToFirstPage = useCallback(() => {
    setGoToPageNumber((prev) => (prev === 0 ? -1 : 0)); // 토글하여 useEffect 트리거
    setTimeout(() => setGoToPageNumber(0), 10);
  }, []);

  // vol
  const getSafeVolume = useCallback((vol: number | undefined) => {
    if (typeof vol !== "number" || isNaN(vol)) return 0.5;
    return Math.max(0, Math.min(1, vol / 100));
  }, []);

  // BGM Audio init
  const initBgmAudio = useCallback(() => {
    if (!bgmRef.current) {
      const audio = new Audio(BGM_PATH);
      audio.loop = true;
      bgmRef.current = audio;
    }
    return bgmRef.current;
  }, []);

  // BGM play
  const playBgm = useCallback(async () => {
    const audio = initBgmAudio();
    audio.volume = getSafeVolume(viewerSettings.bgmVolume);

    try {
      await audio.play();
      setIsBgmInitialized(true);
      console.log("BGM 재생 시작");
    } catch (err) {
      console.log("BGM 자동재생 차단됨, 사용자 상호작용 대기", err);
    }
  }, [viewerSettings.bgmVolume, getSafeVolume, initBgmAudio]);

  // BGM
  const pauseBgm = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause();
      console.log("BGM 일시정지");
    }
  }, []);

  // BGM auto
  useEffect(() => {
    if (isBgmInitialized) return;

    if (viewerSettings.isMuted) {
      console.log("음소거 상태로 진입, BGM 자동재생 안함");
      return;
    }

    playBgm();

    const handleUserInteraction = () => {
      if (!isBgmInitialized && !viewerSettings.isMuted) {
        playBgm();
      }
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("keydown", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("keydown", handleUserInteraction);
    };
  }, [isBgmInitialized, viewerSettings.isMuted, playBgm]);

  useEffect(() => {
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (viewerSettings.isMuted) {
      // OFF- BGM pause
      pauseBgm();
    } else {
      // ON - BGM paly
      if (bgmRef.current) {
        bgmRef.current.volume = getSafeVolume(viewerSettings.bgmVolume);
        bgmRef.current.play().catch((err) => {
          console.log("BGM 재생 실패:", err);
        });
      } else {
        playBgm();
      }
    }
  }, [viewerSettings.isMuted, viewerSettings.bgmVolume, getSafeVolume, pauseBgm, playBgm]);

  useEffect(() => {
    if (bgmRef.current && !viewerSettings.isMuted) {
      bgmRef.current.volume = getSafeVolume(viewerSettings.bgmVolume);
    }
  }, [viewerSettings.bgmVolume, viewerSettings.isMuted, getSafeVolume]);

  // Pass characterId and character to useVygddrasilGame
  const {
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
    handleStartAutoBattle,
    handlePlayerAction,
    handleBattleChoiceSelect,
    handleBattleEnd,
    handleBattleRetry,
    // Revive State
    reviveModalOpen,
    isReviving,
    characterGold,
    reviveGoldCost,
    goldRefreshTrigger,
    // Revive Actions
    setReviveModalOpen,
    handleReviveWithGold,
    handleReviveWithTransaction,
    // Voting State & Actions
    votingModalOpen,
    currentVotingSession,
    setVotingModalOpen,
    handleVoteComplete,
  } = useVygddrasilGame(wallet?.address, characterId, character, viewerSettings.battleMode);

  if (!characterId || (isLoading && !stageMeta)) {
    return <LoadingSpinner />;
  }

  // pip-web
  if (isPipMode) {
    return (
      <section className="relative h-screen bg-cover bg-center z-0 flex items-center justify-center">
        <div className="bg-black/80 backdrop-blur-md rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🪟</div>
          <h2 className="text-2xl font-bold text-white mb-2">PIP 창에서 실행 중</h2>
          <p className="text-gray-400 mb-6">게임이 별도 창에서 실행되고 있습니다.</p>
          <button
            onClick={() => {
              localStorage.setItem("vygddrasil_pip_active", "false");
              setIsPipMode(false);
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-bold transition mb-3"
          >
            이 창에서 플레이하기
          </button>
          <p className="text-xs text-gray-500">PIP 창은 수동으로 닫아주세요</p>
        </div>
      </section>
    );
  }

  return (
    <section id="vygddrasil-main" className="relative h-screen bg-cover bg-center z-0 overflow-y-auto hide-scrollbar">
      {/* Game Sidebar */}
      <GameSidebar characterId={characterId} onSave={() => saveProgress(false)} onToggleAutoSave={toggleAutoSave} autoSaveEnabled={autoSaveEnabled} autoSaveToastEnabled={autoSaveToastEnabled} onToggleAutoSaveToast={toggleAutoSaveToast} onPreviousStage={goToPreviousStage} canGoBack={choiceHistory.length > 0} onReset={resetProgress} onResetToStage2={resetToStage2} onGoToFirstPage={handleGoToFirstPage} lastSaved={lastSaved} currentStage={currentStage} visitedStagesCount={visitedStages.length} choiceCount={choiceHistory.length} recentChoices={choiceHistory.slice(-GAME_CONFIG.MAX_RECENT_CHOICES)} viewerSettings={viewerSettings} onViewerSettingsChange={handleViewerSettingsChange} isPipWindow={isPipWindow} goldRefreshTrigger={goldRefreshTrigger} />

      {/* Main Content */}
      <div className="flex flex-col items-center justify-start min-h-screen px-4  pb-8">
        <StageContent stageMeta={stageMeta} viewerSettings={viewerSettings} choices={choices} onChoiceClick={handleChoiceClick} goToPage={goToPageNumber} disabled={reviveModalOpen || isReviving} />
        {/* Display ChoiceList only when not in page mode (display inside StageContent in page mode)*/}
        {viewerSettings.textLayout !== "page" && <ChoiceList choices={choices} onChoiceClick={handleChoiceClick} disabled={reviveModalOpen || isReviving} />}

        {/* Legacy NFT Modal */}
        {modalOpen && <BattleModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />}

        {/* Battle Modal */}
        {battleModalOpen && character && currentEnemy && characterId && <BattleModal isOpen={battleModalOpen} onClose={() => setBattleModalOpen(false)} mode={currentBattleMode} character={character} characterId={characterId} enemy={currentEnemy} battleState={battleState} rewardConfig={battleRewardConfig} choices={battleChoices} battleSpeed={viewerSettings.battleSpeed} showAnimations={viewerSettings.showBattleAnimations} onStartBattle={handleStartAutoBattle} onPlayerAction={handlePlayerAction} onChoiceSelect={handleBattleChoiceSelect} onBattleEnd={handleBattleEnd} onRetry={handleBattleRetry} isRetrying={isRetrying} />}

        {/* Revive Modal */}
        <ReviveModal isOpen={reviveModalOpen} onClose={() => setReviveModalOpen(false)} onReviveWithGold={handleReviveWithGold} onReviveWithTransaction={handleReviveWithTransaction} goldCost={reviveGoldCost} currentGold={characterGold} isProcessing={isReviving} />

        {/* Voting Modal */}
        {votingModalOpen && currentVotingSession && wallet?.address && <VotingModal isOpen={votingModalOpen} onClose={() => setVotingModalOpen(false)} session={currentVotingSession} walletAddress={wallet.address} onVoteComplete={handleVoteComplete} />}
      </div>
    </section>
  );
}
