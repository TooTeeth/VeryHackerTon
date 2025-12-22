"use client";

// app/vygddrasil/start/page.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useWallet } from "../../../app/context/WalletContext";
import { useVygddrasilGame } from "../../../hooks/useVygddrasilGame";
import BattleModal from "../../../components/Battlemodal/Battlemodal";
import { GameControlPanel, GameProgressInfo, StageContent, ChoiceList, ChoiceHistory, LoadingSpinner } from "../../../components/Vygdrasil";

export default function StartPage() {
  const { wallet } = useWallet();
  const router = useRouter();
  const [characterId, setCharacterId] = useState<number | null>(null);

  useEffect(() => {
    // Get selected character ID from sessionStorage
    const selectedId = sessionStorage.getItem("selectedCharacterId");
    if (!selectedId) {
      toast.error("캐릭터를 선택해주세요.");
      router.push("/vygddrasil/select");
      return;
    }
    setCharacterId(parseInt(selectedId, 10));
  }, [router]);

  // 🆕 Pass characterId to useVygddrasilGame
  const { currentStage, visitedStages, choiceHistory, autoSaveEnabled, lastSaved, choices, stageMeta, isLoading, modalOpen, handleChoiceClick, saveProgress, resetProgress, goToPreviousStage, toggleAutoSave, setModalOpen } = useVygddrasilGame(wallet?.address, characterId);

  if (!characterId || (isLoading && !stageMeta)) {
    return <LoadingSpinner />;
  }

  return (
    <section className="relative h-screen bg-cover bg-center z-0" style={{ backgroundImage: "url('/Vygddrasilpage/BACK.jpg')" }}>
      {/* Game Control Panel */}
      <GameControlPanel onSave={() => saveProgress(false)} onToggleAutoSave={toggleAutoSave} autoSaveEnabled={autoSaveEnabled} onPreviousStage={goToPreviousStage} canGoBack={choiceHistory.length > 0} onReset={resetProgress} lastSaved={lastSaved} />

      {/* Game Progress Info */}
      <GameProgressInfo currentStage={currentStage} visitedStagesCount={visitedStages.length} choiceCount={choiceHistory.length} />

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center h-screen px-4">
        <StageContent stageMeta={stageMeta} />
        <ChoiceList choices={choices} onChoiceClick={handleChoiceClick} />
        <BattleModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </div>

      {/* Choice History */}
      <ChoiceHistory choiceHistory={choiceHistory} />
    </section>
  );
}
