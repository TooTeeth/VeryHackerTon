// components/Vygddrasil/ChoiceList.tsx

import React from "react";
import Link from "next/link";
import { ChoiceItem, BattleMode } from "../../types/vygddrasil.types";

interface ChoiceListProps {
  choices: ChoiceItem[];
  onChoiceClick: (value: string, choiceText: string, battleMode?: BattleMode) => void;
  disabled?: boolean; // 전체 선택지 비활성화 (부활 처리 중 등)
}

export const ChoiceList: React.FC<ChoiceListProps> = ({ choices, onChoiceClick, disabled = false }) => {
  if (choices.length === 0) return null;

  // 투표 중인 선택지가 있는지 확인
  const hasVotingChoices = choices.some((item) => item.isVotingChoice);

  return (
    <div className="w-full max-w-prose">
      {/* 구분선 */}
      <div className="border-t border-gray-600 my-6" />

      {/* 투표 중 안내 */}
      {hasVotingChoices && (
        <div className="mb-4 p-3  border-yellow-600/50 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400">
            <span>🗳️</span>
            <span className="text-sm font-medium">이 선택지들은 DAO 투표 대상입니다!</span>
            <Link href="/voting" className="ml-auto text-xs text-yellow-500 hover:text-yellow-300 underline">
              투표하러 가기 →
            </Link>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {choices.map((item) => {
          const isItemDisabled = item.isDisabledByVote || disabled;
          const isVoting = item.isVotingChoice && !item.isDisabledByVote;

          return (
            <li key={item.id}>
              <button onClick={() => !isItemDisabled && onChoiceClick(item.value, item.choice)} disabled={isItemDisabled} className={`text-left text-lg font-bold transition duration-200 ease-in-out ${isItemDisabled ? "text-gray-500 cursor-not-allowed line-through opacity-50" : "text-bronze hover:text-gray-300"}`} title={disabled ? "부활 처리 중입니다..." : item.isDisabledByVote ? "투표에서 선택되지 않은 선택지입니다" : isVoting ? "DAO 투표 대상 선택지입니다" : ""}>
                &gt; {item.choice}
                {isVoting && <span className="ml-2 text-xs text-yellow-600">🗳️</span>}
                {item.isDisabledByVote && <span className="ml-2 text-xs text-gray-600">(투표 미선택)</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
