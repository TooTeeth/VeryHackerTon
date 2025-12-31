"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GamificationService } from "../../services/gamification.service";
import type { LeaderboardEntry, LeaderboardSortBy } from "../../types/gamification.types";

interface RankingSectionProps {
  characterId: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export const RankingSection: React.FC<RankingSectionProps> = ({
  characterId,
  isExpanded,
  onToggle,
}) => {
  const [topRankers, setTopRankers] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fullLeaderboard, setFullLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>("score");

  const loadRankings = useCallback(async () => {
    setIsLoading(true);
    const [rankings, rank] = await Promise.all([
      GamificationService.getLeaderboard({ sortBy: "score", limit: 5, offset: 0 }),
      GamificationService.getCharacterRank(characterId),
    ]);
    setTopRankers(rankings);
    setMyRank(rank);
    setIsLoading(false);
  }, [characterId]);

  useEffect(() => {
    if (isExpanded) {
      loadRankings();
    }
  }, [isExpanded, characterId, loadRankings]);

  const loadFullLeaderboard = async (sort: LeaderboardSortBy) => {
    const data = await GamificationService.getLeaderboard({ sortBy: sort, limit: 100, offset: 0 });
    setFullLeaderboard(data);
  };

  const handleOpenModal = async () => {
    setShowModal(true);
    await loadFullLeaderboard(sortBy);
  };

  const handleSortChange = async (newSort: LeaderboardSortBy) => {
    setSortBy(newSort);
    await loadFullLeaderboard(newSort);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "text-yellow-400";
    if (rank === 2) return "text-gray-300";
    if (rank === 3) return "text-amber-600";
    return "text-gray-400";
  };

  const getClassIcon = (charClass: string) => {
    const icons: Record<string, string> = {
      warrior: "⚔️",
      mage: "🔮",
      rogue: "🗡️",
      priest: "✨",
      archer: "🏹",
    };
    return icons[charClass.toLowerCase()] || "👤";
  };

  return (
    <>
      <div className="bg-gray-800/50 rounded-lg overflow-hidden">
        <button
          onClick={onToggle}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition"
        >
          <div className="flex items-center gap-2">
            <span>🏅</span>
            <span className="font-bold text-sm">랭킹</span>
            {myRank && (
              <span className="text-xs text-yellow-400">
                #{myRank.rank_position}
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
                {/* Top 5 리스트 */}
                <div className="space-y-1 mb-2">
                  {topRankers.map((entry) => (
                    <div
                      key={entry.character_id}
                      className={`flex items-center justify-between p-1.5 rounded ${
                        entry.character_id === characterId
                          ? "bg-yellow-600/20 border border-yellow-500/50"
                          : "bg-gray-700/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${getRankColor(entry.rank_position)}`}>
                          {getRankIcon(entry.rank_position)}
                        </span>
                        <span className="text-xs">{getClassIcon(entry.class)}</span>
                        <span className="text-xs text-white truncate max-w-[80px]">
                          {entry.nickname}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Lv.{entry.level}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 내 순위가 Top 5 밖이면 표시 */}
                {myRank && myRank.rank_position > 5 && (
                  <div className="border-t border-gray-700 pt-2 mb-2">
                    <div className="text-xs text-gray-400 mb-1">내 순위</div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-yellow-600/20 border border-yellow-500/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-yellow-400">
                          #{myRank.rank_position}
                        </span>
                        <span className="text-xs">{getClassIcon(myRank.class)}</span>
                        <span className="text-xs text-white truncate max-w-[80px]">
                          {myRank.nickname}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Lv.{myRank.level}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleOpenModal}
                  className="w-full text-center text-xs text-yellow-400 hover:text-yellow-300 py-1"
                >
                  전체 랭킹 보기
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 전체 랭킹 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">🏅 랭킹</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>

            {/* 정렬 탭 */}
            <div className="flex border-b border-gray-700">
              {[
                { key: "score" as LeaderboardSortBy, label: "종합" },
                { key: "level" as LeaderboardSortBy, label: "레벨" },
                { key: "battles_won" as LeaderboardSortBy, label: "승리" },
                { key: "total_gold_earned" as LeaderboardSortBy, label: "골드" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleSortChange(tab.key)}
                  className={`flex-1 py-2 text-sm ${
                    sortBy === tab.key
                      ? "text-yellow-400 border-b-2 border-yellow-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
              {/* 내 순위 */}
              {myRank && (
                <div className="mb-4 p-3 rounded-lg bg-yellow-600/20 border border-yellow-500/50">
                  <div className="text-xs text-gray-400 mb-1">내 순위</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-yellow-400">
                        {getRankIcon(myRank.rank_position)}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-white">{myRank.nickname}</p>
                        <p className="text-xs text-gray-400">{myRank.class}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">Lv.{myRank.level}</p>
                      <p className="text-xs text-gray-400">{myRank.score.toLocaleString()}점</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 전체 리스트 */}
              <div className="space-y-2">
                {fullLeaderboard.map((entry) => (
                  <div
                    key={entry.character_id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      entry.character_id === characterId
                        ? "bg-yellow-600/20 border border-yellow-500/50"
                        : "bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold min-w-[40px] ${getRankColor(entry.rank_position)}`}>
                        {getRankIcon(entry.rank_position)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{getClassIcon(entry.class)}</span>
                        <div>
                          <p className="text-sm font-bold text-white">{entry.nickname}</p>
                          <p className="text-xs text-gray-400">{entry.class}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">Lv.{entry.level}</p>
                      <p className="text-xs text-gray-400">
                        {sortBy === "battles_won"
                          ? `${entry.battles_won}승`
                          : sortBy === "total_gold_earned"
                          ? `${entry.total_gold_earned.toLocaleString()}G`
                          : `${entry.score.toLocaleString()}점`}
                      </p>
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

export default RankingSection;
