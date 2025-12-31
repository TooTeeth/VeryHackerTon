// components/Vygddrasil/GameProgressInfo.tsx

import React from "react";

interface GameProgressInfoProps {
  currentStage: string;
  visitedStagesCount: number;
  choiceCount: number;
}

export const GameProgressInfo: React.FC<GameProgressInfoProps> = ({
  currentStage,
  visitedStagesCount,
  choiceCount,
}) => {
  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-3 rounded-lg z-20">
      <div className="text-sm font-bold mb-1">
        📍 현재 위치: {currentStage}
      </div>
      <div className="text-xs text-gray-300">
        방문한 장소: {visitedStagesCount}개 | 선택: {choiceCount}회
      </div>
    </div>
  );
};
