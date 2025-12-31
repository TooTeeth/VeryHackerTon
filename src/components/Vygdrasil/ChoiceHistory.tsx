// components/Vygddrasil/ChoiceHistory.tsx

import React from "react";
import { ChoiceHistoryItem } from "../../types/vygddrasil.types";
import { GAME_CONFIG } from "../../constants/vygddrasil.constants";

interface ChoiceHistoryProps {
  choiceHistory: ChoiceHistoryItem[];
}

export const ChoiceHistory: React.FC<ChoiceHistoryProps> = ({ choiceHistory }) => {
  if (choiceHistory.length === 0) return null;

  const recentChoices = choiceHistory.slice(-GAME_CONFIG.MAX_RECENT_CHOICES);

  return (
    <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white px-4 py-3 rounded-lg z-20 max-w-md max-h-40 overflow-y-auto">
      <div className="text-sm font-bold mb-2">📜 최근 선택</div>
      {recentChoices.map((item, idx) => (
        <div key={idx} className="text-xs text-gray-300 mb-1">
          • {item.choice}
        </div>
      ))}
    </div>
  );
};
