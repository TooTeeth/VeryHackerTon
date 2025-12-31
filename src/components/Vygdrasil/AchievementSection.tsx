"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GamificationService } from "../../services/gamification.service";
import type { AchievementProgress } from "../../types/gamification.types";
import { toast } from "react-toastify";

interface AchievementSectionProps {
  characterId: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export const AchievementSection: React.FC<AchievementSectionProps> = ({
  characterId,
  isExpanded,
  onToggle,
}) => {
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const loadAchievements = useCallback(async () => {
    setIsLoading(true);
    const data = await GamificationService.getAchievementsWithProgress(characterId);
    setAchievements(data);
    setIsLoading(false);
  }, [characterId]);

  useEffect(() => {
    if (isExpanded) {
      loadAchievements();
    }
  }, [isExpanded, characterId, loadAchievements]);

  const handleClaimReward = async (achievementId: number) => {
    const result = await GamificationService.claimAchievementReward(characterId, achievementId);
    if (result.success && result.reward) {
      const rewardText = [];
      if (result.reward.gold) rewardText.push(`+${result.reward.gold}G`);
      if (result.reward.exp) rewardText.push(`+${result.reward.exp}EXP`);
      toast.success(`보상 획득! ${rewardText.join(", ")}`);
      loadAchievements();
    }
  };

  const unlockedCount = achievements.filter((a) => a.is_unlocked).length;
  const unclaimedCount = achievements.filter((a) => a.is_unlocked && !a.reward_claimed).length;

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      battle: "⚔️",
      progress: "📈",
      collection: "💰",
      social: "👥",
    };
    return icons[category] || "🏆";
  };

  return (
    <>
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition"
        >
          <div className="flex items-center gap-2">
            <span>🏆</span>
            <span className="font-bold text-sm">업적</span>
            <span className="text-xs text-purple-400">
              ({unlockedCount}/{achievements.length})
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
            {isLoading ? (
              <div className="text-center py-4 text-gray-400 text-xs">로딩중...</div>
            ) : (
              <>
                <div className="space-y-2 mb-2">
                  {achievements.slice(0, 3).map((item) => (
                    <div
                      key={item.achievement.id}
                      className={`p-2 rounded ${
                        item.is_unlocked ? "bg-purple-600/20 border border-purple-500/50" : "bg-gray-700/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{getCategoryIcon(item.achievement.category)}</span>
                          <span className="text-xs text-white truncate max-w-[120px]">
                            {item.achievement.name}
                          </span>
                        </div>
                        {item.is_unlocked && !item.reward_claimed && (
                          <button
                            onClick={() => handleClaimReward(item.achievement.id)}
                            className="text-[10px] bg-green-600 hover:bg-green-500 px-1.5 py-0.5 rounded"
                          >
                            받기
                          </button>
                        )}
                        {item.is_unlocked && item.reward_claimed && (
                          <span className="text-[10px] text-gray-500">완료</span>
                        )}
                      </div>
                      {!item.is_unlocked && (
                        <>
                          <div className="w-full bg-gray-600 rounded-full h-1 mb-1">
                            <div
                              className="h-1 rounded-full bg-purple-500 transition-all"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {item.current_value}/{item.target_value}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full text-center text-xs text-purple-400 hover:text-purple-300 py-1"
                >
                  전체 보기 ({achievements.length})
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 전체 업적 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">🏆 업적</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
              <div className="text-center mb-4">
                <span className="text-gray-400 text-sm">
                  달성: <span className="text-purple-400 font-bold">{unlockedCount}</span> / {achievements.length}
                </span>
              </div>

              <div className="space-y-3">
                {achievements.map((item) => (
                  <div
                    key={item.achievement.id}
                    className={`p-3 rounded-lg ${
                      item.is_unlocked ? "bg-purple-600/20 border border-purple-500/50" : "bg-gray-800"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(item.achievement.category)}</span>
                        <div>
                          <p className="text-sm font-bold text-white">{item.achievement.name}</p>
                          <p className="text-xs text-gray-400">{item.achievement.description}</p>
                        </div>
                      </div>
                      {item.is_unlocked && (
                        <span className="text-green-400 text-xs">달성</span>
                      )}
                    </div>

                    {!item.is_unlocked && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-600 rounded-full h-2 mb-1">
                          <div
                            className="h-2 rounded-full bg-purple-500 transition-all"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{item.percentage}%</span>
                          <span>{item.current_value}/{item.target_value}</span>
                        </div>
                      </div>
                    )}

                    {item.is_unlocked && item.achievement.reward_value && (
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                          보상:
                          {item.achievement.reward_value.gold && ` ${item.achievement.reward_value.gold}G`}
                          {item.achievement.reward_value.exp && ` ${item.achievement.reward_value.exp}EXP`}
                        </div>
                        {!item.reward_claimed ? (
                          <button
                            onClick={() => handleClaimReward(item.achievement.id)}
                            className="text-xs bg-green-600 hover:bg-green-500 px-2 py-1 rounded"
                          >
                            보상 받기
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500">수령 완료</span>
                        )}
                      </div>
                    )}
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

export default AchievementSection;
