"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GamificationService } from "../../services/gamification.service";
import type { CharacterStatistics, StatsSummary } from "../../types/gamification.types";

interface StatisticsModalProps {
  characterId: number;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "overview" | "battle" | "progress" | "records";

export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  characterId,
  isOpen,
  onClose,
}) => {
  const [stats, setStats] = useState<CharacterStatistics | null>(null);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    const data = await GamificationService.getCharacterStatistics(characterId);
    setStats(data);

    if (data) {
      // 요약 통계 계산
      const winRate = data.total_battles > 0
        ? Math.round((data.battles_won / data.total_battles) * 100)
        : 0;
      const avgDamage = data.total_battles > 0
        ? Math.round(data.total_damage_dealt / data.total_battles)
        : 0;
      const critRate = data.total_battles > 0
        ? Math.round((data.critical_hits / Math.max(data.total_battles * 10, 1)) * 100)
        : 0;
      const dodgeRate = data.total_battles > 0
        ? Math.round((data.dodges / Math.max(data.total_battles * 10, 1)) * 100)
        : 0;

      setSummary({
        winRate,
        averageDamagePerBattle: avgDamage,
        criticalHitRate: critRate,
        dodgeRate,
      });
    }
    setIsLoading(false);
  }, [characterId]);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, loadStats]);

  if (!isOpen) return null;

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "overview", label: "개요", icon: "📊" },
    { key: "battle", label: "전투", icon: "⚔️" },
    { key: "progress", label: "진행", icon: "📈" },
    { key: "records", label: "기록", icon: "🏆" },
  ];

  const StatCard = ({ label, value, icon, color = "text-white" }: {
    label: string;
    value: string | number;
    icon: string;
    color?: string;
  }) => (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <span>{icon}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );

  const renderOverview = () => (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="승률"
        value={`${summary?.winRate || 0}%`}
        icon="🎯"
        color={summary && summary.winRate >= 50 ? "text-green-400" : "text-red-400"}
      />
      <StatCard
        label="총 전투"
        value={stats?.total_battles || 0}
        icon="⚔️"
      />
      <StatCard
        label="총 골드"
        value={`${(stats?.total_gold_earned || 0).toLocaleString()}G`}
        icon="💰"
        color="text-yellow-400"
      />
      <StatCard
        label="총 경험치"
        value={(stats?.total_exp_earned || 0).toLocaleString()}
        icon="✨"
        color="text-purple-400"
      />
      <StatCard
        label="스테이지 방문"
        value={stats?.total_stages_visited || 0}
        icon="🗺️"
      />
      <StatCard
        label="연승 기록"
        value={stats?.longest_win_streak || 0}
        icon="🔥"
        color="text-orange-400"
      />
    </div>
  );

  const renderBattle = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="승리"
          value={stats?.battles_won || 0}
          icon="✅"
          color="text-green-400"
        />
        <StatCard
          label="패배"
          value={stats?.battles_lost || 0}
          icon="❌"
          color="text-red-400"
        />
        <StatCard
          label="도주"
          value={stats?.battles_fled || 0}
          icon="🏃"
          color="text-gray-400"
        />
        <StatCard
          label="평균 데미지"
          value={summary?.averageDamagePerBattle || 0}
          icon="💥"
        />
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">데미지 통계</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">총 가한 데미지</span>
            <span className="text-red-400 font-bold">
              {(stats?.total_damage_dealt || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">총 받은 데미지</span>
            <span className="text-blue-400 font-bold">
              {(stats?.total_damage_received || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">치명타 횟수</span>
            <span className="text-yellow-400 font-bold">
              {stats?.critical_hits || 0}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">회피 횟수</span>
            <span className="text-green-400 font-bold">
              {stats?.dodges || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="총 스테이지"
          value={stats?.total_stages_visited || 0}
          icon="🗺️"
        />
        <StatCard
          label="고유 스테이지"
          value={stats?.unique_stages_visited || 0}
          icon="🆕"
          color="text-blue-400"
        />
        <StatCard
          label="선택 횟수"
          value={stats?.total_choices_made || 0}
          icon="🎭"
        />
        <StatCard
          label="탐험률"
          value={stats?.unique_stages_visited
            ? `${Math.round((stats.unique_stages_visited / 50) * 100)}%`
            : "0%"}
          icon="📍"
          color="text-green-400"
        />
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">경제 통계</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">총 획득 골드</span>
            <span className="text-yellow-400 font-bold">
              +{(stats?.total_gold_earned || 0).toLocaleString()}G
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">총 사용 골드</span>
            <span className="text-red-400 font-bold">
              -{(stats?.total_gold_spent || 0).toLocaleString()}G
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-700 pt-2 mt-2">
            <span className="text-gray-400">순 수익</span>
            <span className={`font-bold ${
              (stats?.total_gold_earned || 0) - (stats?.total_gold_spent || 0) >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}>
              {((stats?.total_gold_earned || 0) - (stats?.total_gold_spent || 0)).toLocaleString()}G
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecords = () => (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">🏆 최고 기록</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
            <div className="flex items-center gap-2">
              <span>🔥</span>
              <span className="text-sm text-gray-300">최장 연승</span>
            </div>
            <span className="text-lg font-bold text-orange-400">
              {stats?.longest_win_streak || 0}연승
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
            <div className="flex items-center gap-2">
              <span>💥</span>
              <span className="text-sm text-gray-300">최고 단일 데미지</span>
            </div>
            <span className="text-lg font-bold text-red-400">
              {(stats?.highest_damage_single_hit || 0).toLocaleString()}
            </span>
          </div>
          {stats?.fastest_battle_win_turns && (
            <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <span className="text-sm text-gray-300">최단 전투 승리</span>
              </div>
              <span className="text-lg font-bold text-blue-400">
                {stats.fastest_battle_win_turns}턴
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">📈 현재 상태</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
            <div className="flex items-center gap-2">
              <span>🔥</span>
              <span className="text-sm text-gray-300">현재 연승</span>
            </div>
            <span className={`text-lg font-bold ${
              (stats?.current_win_streak || 0) > 0 ? "text-green-400" : "text-gray-400"
            }`}>
              {stats?.current_win_streak || 0}연승
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white mb-3">📅 마지막 업데이트</h3>
        <p className="text-sm text-gray-400">
          {stats?.updated_at
            ? new Date(stats.updated_at).toLocaleString("ko-KR")
            : "-"}
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">📊 통계</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm flex items-center justify-center gap-1 ${
                activeTab === tab.key
                  ? "text-purple-400 border-b-2 border-purple-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
          {isLoading ? (
            <div className="text-center py-8 text-gray-400">로딩중...</div>
          ) : !stats ? (
            <div className="text-center py-8 text-gray-400">
              통계 데이터가 없습니다.
            </div>
          ) : (
            <>
              {activeTab === "overview" && renderOverview()}
              {activeTab === "battle" && renderBattle()}
              {activeTab === "progress" && renderProgress()}
              {activeTab === "records" && renderRecords()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsModal;
