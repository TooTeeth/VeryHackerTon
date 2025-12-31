// components/Vygddrasil/GameControlPanel.tsx

import React from "react";

interface GameControlPanelProps {
  onSave: () => void;
  onToggleAutoSave: () => void;
  autoSaveEnabled: boolean;
  onPreviousStage: () => void;
  canGoBack: boolean;
  onReset: () => void;
  lastSaved: Date | null;
}

export const GameControlPanel: React.FC<GameControlPanelProps> = ({ onSave, onToggleAutoSave, autoSaveEnabled, onPreviousStage, canGoBack, onReset, lastSaved }) => {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
      <button onClick={onSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition" aria-label="수동 저장">
        💾 수동 저장
      </button>

      <button onClick={onToggleAutoSave} className={`${autoSaveEnabled ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition`} aria-label={autoSaveEnabled ? "자동저장 끄기" : "자동저장 켜기"}>
        {autoSaveEnabled ? "✓ 자동저장 ON" : "✗ 자동저장 OFF"}
      </button>

      <button onClick={onPreviousStage} disabled={!canGoBack} className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition" aria-label="이전 단계">
        ← 이전 단계
      </button>

      <button onClick={onReset} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition" aria-label="처음부터 시작">
        🔄 처음부터
      </button>

      {lastSaved && <div className="bg-black bg-opacity-50 text-white text-xs px-3 py-2 rounded-lg">마지막 저장: {lastSaved.toLocaleTimeString()}</div>}
    </div>
  );
};
