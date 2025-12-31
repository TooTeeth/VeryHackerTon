"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GamificationService } from "../../services/gamification.service";
import type { DailyQuestProgress } from "../../types/gamification.types";
import { toast } from "react-toastify";

interface DailyQuestSectionProps {
  characterId: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export const DailyQuestSection: React.FC<DailyQuestSectionProps> = ({
  characterId,
  isExpanded,
  onToggle,
}) => {
  const [quests, setQuests] = useState<DailyQuestProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState("");

  const loadQuests = useCallback(async () => {
    setIsLoading(true);
    const data = await GamificationService.getDailyQuests(characterId);
    setQuests(data);
    setIsLoading(false);
  }, [characterId]);

  useEffect(() => {
    if (isExpanded) {
      loadQuests();
    }
  }, [isExpanded, characterId, loadQuests]);

  // 자정까지 남은 시간 계산
  useEffect(() => {
    const calculateTimeUntilReset = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setTimeUntilReset(`${hours}시간 ${minutes}분`);
    };

    calculateTimeUntilReset();
    const interval = setInterval(calculateTimeUntilReset, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, []);

  const handleClaimReward = async (questId: number) => {
    const result = await GamificationService.claimDailyQuestReward(characterId, questId);
    if (result.success && result.reward) {
      const rewardText = [];
      if (result.reward.gold) rewardText.push(`+${result.reward.gold}G`);
      if (result.reward.exp) rewardText.push(`+${result.reward.exp}EXP`);
      toast.success(`일일 퀘스트 완료! ${rewardText.join(", ")}`);
      loadQuests();
    }
  };

  const completedCount = quests.filter((q) => q.is_completed).length;
  const unclaimedCount = quests.filter((q) => q.is_completed && !q.reward_claimed).length;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-400";
      case "normal":
        return "text-yellow-400";
      case "hard":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getDifficultyBg = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-600/20 border-green-500/50";
      case "normal":
        return "bg-yellow-600/20 border-yellow-500/50";
      case "hard":
        return "bg-red-600/20 border-red-500/50";
      default:
        return "bg-gray-600/20 border-gray-500/50";
    }
  };

  const getQuestTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      battle: "⚔️",
      exploration: "🗺️",
      gold: "💰",
      level: "⭐",
    };
    return icons[type] || "📋";
  };

  return (
    <>
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition"
        >
          <div className="flex items-center gap-2">
            <span>📋</span>
            <span className="font-bold text-sm">일일 퀘스트</span>
            <span className="text-xs text-blue-400">
              ({completedCount}/{quests.length})
            </span>
            {unclaimedCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 rounded-full">
                {unclaimedCount}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="px-3 pb-3">
            {/* 초기화까지 남은 시간 */}
            <div className="text-xs text-gray-400 mb-2 text-center">
              초기화까지 <span className="text-blue-400">{timeUntilReset}</span>
            </div>

            {isLoading ? (
              <div className="text-center py-4 text-gray-400 text-xs">로딩중...</div>
            ) : (
              <>
                <div className="space-y-2 mb-2">
                  {quests.slice(0, 3).map((item) => (
                    <div
                      key={item.quest.id}
                      className={`p-2 rounded border ${
                        item.is_completed
                          ? getDifficultyBg(item.quest.difficulty)
                          : "bg-gray-700/30 border-gray-600/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{getQuestTypeIcon(item.quest.quest_type)}</span>
                          <span className="text-xs text-white truncate max-w-[100px]">
                            {item.quest.name}
                          </span>
                          <span className={`text-[10px] ${getDifficultyColor(item.quest.difficulty)}`}>
                            [{item.quest.difficulty}]
                          </span>
                        </div>
                        {item.is_completed && !item.reward_claimed && (
                          <button
                            onClick={() => handleClaimReward(item.quest.id)}
                            className="text-[10px] bg-green-600 hover:bg-green-500 px-1.5 py-0.5 rounded"
                          >
                            받기
                          </button>
                        )}
                        {item.is_completed && item.reward_claimed && (
                          <span className="text-[10px] text-gray-500">완료</span>
                        )}
                      </div>
                      {!item.is_completed && (
                        <>
                          <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                            <div
                              className="h-1 rounded-full bg-blue-500 transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {item.current_count}/{item.quest.target_count}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full text-center text-xs text-blue-400 hover:text-blue-300 py-1"
                >
                  전체 보기 ({quests.length})
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 전체 일일 퀘스트 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <div>
                <h2 className="text-lg font-bold text-white">📋 일일 퀘스트</h2>
                <p className="text-xs text-gray-400">
                  초기화까지 <span className="text-blue-400">{timeUntilReset}</span>
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
              <div className="text-center mb-4">
                <span className="text-gray-400 text-sm">
                  완료: <span className="text-blue-400 font-bold">{completedCount}</span> / {quests.length}
                </span>
              </div>

              <div className="space-y-3">
                {quests.map((item) => (
                  <div
                    key={item.quest.id}
                    className={`p-3 rounded-lg border ${
                      item.is_completed
                        ? getDifficultyBg(item.quest.difficulty)
                        : "bg-gray-800 border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getQuestTypeIcon(item.quest.quest_type)}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white">{item.quest.name}</p>
                            <span className={`text-xs ${getDifficultyColor(item.quest.difficulty)}`}>
                              [{item.quest.difficulty}]
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{item.quest.description}</p>
                        </div>
                      </div>
                      {item.is_completed && (
                        <span className="text-green-400 text-xs">완료!</span>
                      )}
                    </div>

                    {!item.is_completed && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-600 rounded-full h-2 mb-1">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{item.percentage}%</span>
                          <span>{item.current_count}/{item.quest.target_count}</span>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        보상:
                        {item.quest.reward_gold > 0 && ` ${item.quest.reward_gold}G`}
                        {item.quest.reward_exp > 0 && ` ${item.quest.reward_exp}EXP`}
                      </div>
                      {item.is_completed && !item.reward_claimed ? (
                        <button
                          onClick={() => handleClaimReward(item.quest.id)}
                          className="text-xs bg-green-600 hover:bg-green-500 px-2 py-1 rounded"
                        >
                          보상 받기
                        </button>
                      ) : item.reward_claimed ? (
                        <span className="text-xs text-gray-500">수령 완료</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DailyQuestSection;
