// components/Battlemodal/AutoBattle.tsx

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { BattleState, Character, Enemy, BattleRewardConfig } from "../../types/vygddrasil.types";
import BattleLog from "./BattleLog";

interface AutoBattleProps {
  character: Character;
  enemy: Enemy;
  battleState: BattleState;
  rewardConfig: BattleRewardConfig | null;
  onStartBattle: () => void;
  battleSpeed: "slow" | "normal" | "fast";
}

const speedIntervals = {
  slow: 800,
  normal: 400,
  fast: 150,
};

export default function AutoBattle({ character, enemy, battleState, onStartBattle, battleSpeed }: AutoBattleProps) {
  const [displayedLogIndex, setDisplayedLogIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [autoBattleStarted, setAutoBattleStarted] = useState(false);

  const { battleLog, result } = battleState;

  // Start animation only if automatic battle has started
  useEffect(() => {
    if (autoBattleStarted && battleLog.length > 0 && result !== "ongoing") {
      setIsAnimating(true);
      setDisplayedLogIndex(0);
    }
  }, [autoBattleStarted, battleLog.length, result]);

  // 컴포넌트가 언마운트되거나 모드가 변경되면 상태 리셋
  useEffect(() => {
    return () => {
      setAutoBattleStarted(false);
      setIsAnimating(false);
      setDisplayedLogIndex(0);
    };
  }, []);

  const handleStartAutoBattle = () => {
    setAutoBattleStarted(true);
    onStartBattle();
  };

  // 로그 순차 표시
  useEffect(() => {
    if (isAnimating && displayedLogIndex < battleLog.length) {
      const timer = setTimeout(() => {
        setDisplayedLogIndex((prev) => prev + 1);
      }, speedIntervals[battleSpeed]);

      return () => clearTimeout(timer);
    } else if (displayedLogIndex >= battleLog.length && battleLog.length > 0) {
      setIsAnimating(false);
    }
  }, [isAnimating, displayedLogIndex, battleLog.length, battleSpeed]);

  const progress = battleLog.length > 0 ? (displayedLogIndex / battleLog.length) * 100 : 0;
  const displayedLogs = battleLog.slice(0, displayedLogIndex);
  const isComplete = displayedLogIndex >= battleLog.length && battleLog.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* VS 표시 */}
      <div className="flex items-center justify-center gap-6 mb-6">
        {/* 플레이어 */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-700 rounded-lg overflow-hidden mx-auto mb-2">
            <Image src={`/Vygddrasilpage/character/${character.class}.jpg`} alt={character.nickname} width={80} height={80} className="object-cover w-full h-full" priority unoptimized />
          </div>
          <div className="text-white font-bold text-sm">{character.nickname}</div>
          <div className="text-gray-400 text-xs">Lv.{(character as { level?: number }).level || 1}</div>
        </div>

        {/* VS */}
        <div className="text-4xl font-bold text-yellow-500">⚔️</div>

        {/* 적 */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-700 rounded-lg overflow-hidden mx-auto mb-2">{enemy.image_url ? <Image src={enemy.image_url} alt={enemy.name} width={80} height={80} className="object-cover w-full h-full" priority unoptimized /> : <div className="w-full h-full flex items-center justify-center text-3xl">🐉</div>}</div>
          <div className="text-white font-bold text-sm">{enemy.name}</div>
          <div className="text-gray-400 text-xs">Lv.{enemy.level}</div>
        </div>
      </div>

      {/* 전투 진행 상태 */}
      {!autoBattleStarted ? (
        // 전투 시작 전 (턴제에서 넘어와도 자동전투 시작 버튼 표시)
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-lg text-gray-300 mb-4">{enemy.name}이(가) 나타났다!</div>
          {/* 턴제에서 전환된 경우 현재 HP 상태 표시 */}
          {battleState.isActive && battleState.result === "ongoing" && (
            <div className="text-sm text-yellow-400 mb-3">
              현재 HP: {battleState.playerCurrentHp}/{battleState.playerMaxHp} | 적 HP: {battleState.enemyCurrentHp}/{battleState.enemyMaxHp}
            </div>
          )}
          <button onClick={handleStartAutoBattle} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition">
            ⚔️ 자동 전투 시작
          </button>
        </div>
      ) : isAnimating ? (
        // 전투 진행 중
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-4">
            <div className="text-lg text-yellow-400 mb-2">⚔️ 전투 진행 중...</div>
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              턴 {displayedLogIndex} / {battleLog.length}
            </div>
          </div>

          {/* 전투 로그 */}
          <div className="flex-1 min-h-[150px] max-h-[200px]">
            <BattleLog logs={displayedLogs} />
          </div>
        </div>
      ) : isComplete ? (
        // 전투 완료
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-4">
            <div className={`text-2xl font-bold ${result === "victory" ? "text-green-400" : "text-red-400"}`}>{result === "victory" ? "🎉 승리!" : "💀 패배..."}</div>
            <div className="text-sm text-gray-400 mt-1">총 {battleState.turnCount}턴</div>
          </div>

          {/* 전투 로그 */}
          <div className="flex-1 min-h-[150px] max-h-[200px]">
            <BattleLog logs={battleLog} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
