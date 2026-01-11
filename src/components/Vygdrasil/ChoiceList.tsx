// components/Vygddrasil/ChoiceList.tsx

import React from "react";
import { ChoiceItem, BattleMode } from "../../types/vygddrasil.types";

interface ChoiceListProps {
  choices: ChoiceItem[];
  onChoiceClick: (value: string, choiceText: string, battleMode?: BattleMode) => void;
  disabled?: boolean; // 전체 선택지 비활성화 (부활 처리 중 등)
}

export const ChoiceList: React.FC<ChoiceListProps> = ({ choices, onChoiceClick, disabled = false }) => {
  if (choices.length === 0) return null;

  // 투표 선택지 중 투표가 완료되고 당선된 선택지가 있는지 확인
  // isDisabledByVote가 있다는 것은 투표가 종료되고 결과가 나왔다는 의미
  const hasVotingResult = choices.some((item) => item.isVotingChoice && item.isDisabledByVote);

  // 진행 중인 투표가 있는지 확인 (isVotingChoice이면서 isDisabledByVote가 아닌 경우)
  const hasActiveVoting = choices.some((item) => item.isVotingChoice && !item.isDisabledByVote);

  return (
    <div className="w-full max-w-prose">
      {/* 구분선 */}
      <div className="border-t border-gray-600 my-6" />

      {/* 진행 중인 투표 또는 재투표 안내 */}
      {hasActiveVoting && !hasVotingResult && (
        <div className="mb-4 p-3 border-yellow-600/50 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400">
            <span>🗳️</span>
            <span className="text-sm font-medium">이 선택지들은 DAO 투표 대상입니다! 선택지를 클릭하여 투표하세요.</span>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {choices.map((item) => {
          // 투표 결과가 나온 경우: 당선된 선택지만 클릭 가능
          // 투표 진행 중: 모든 선택지 클릭하면 투표 모달 열림
          const isItemDisabled = item.isDisabledByVote || disabled;
          const isVoting = item.isVotingChoice && !item.isDisabledByVote;

          // 투표 결과 후: 당선 선택지는 정상 색상, 비당선은 회색
          // 투표 진행 중이거나 일반 선택지: 정상 색상
          let colorClass = "text-bronze hover:text-gray-300";
          if (item.isDisabledByVote) {
            // 투표에서 탈락한 선택지 - 회색, 취소선
            colorClass = "text-gray-500 cursor-not-allowed line-through opacity-50";
          } else if (hasVotingResult && item.isVotingChoice && !item.isDisabledByVote) {
            // 투표에서 당선된 선택지 - 강조 색상
            colorClass = "text-yellow-400 hover:text-yellow-300";
          }

          return (
            <li key={item.id}>
              <button
                onClick={() => !isItemDisabled && onChoiceClick(item.value, item.choice)}
                disabled={isItemDisabled}
                className={`text-left text-lg font-bold transition duration-200 ease-in-out ${colorClass}`}
                title={disabled ? "부활 처리 중입니다..." : item.isDisabledByVote ? "투표에서 선택되지 않은 선택지입니다" : isVoting ? "클릭하여 투표하기" : ""}
              >
                &gt; {item.choice}
                {isVoting && <span className="ml-2 text-xs text-yellow-600">🗳️</span>}
                {item.isDisabledByVote && <span className="ml-2 text-xs text-gray-600">(투표 미선택)</span>}
                {hasVotingResult && item.isVotingChoice && !item.isDisabledByVote && <span className="ml-2 text-xs text-yellow-500">(당선)</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
