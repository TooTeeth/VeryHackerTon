// components/Battlemodal/ChoiceBattle.tsx

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { BattleState, Character, Enemy, BattleChoice, BattleRewardConfig, BattleLogEntry } from "../../types/vygddrasil.types";
import { getTotalStats, calculateChoiceRound, calculateDamage } from "../../utils/battleCalculations";
import BattleLog from "./BattleLog";

interface ChoiceBattleProps {
  character: Character;
  enemy: Enemy;
  battleState: BattleState;
  rewardConfig: BattleRewardConfig | null;
  choices: BattleChoice[];
  onSelectChoice: (choice: BattleChoice) => void;
}

export default function ChoiceBattle({ character, enemy, battleState, choices, onSelectChoice }: ChoiceBattleProps) {
  const [selectedChoice, setSelectedChoice] = useState<BattleChoice | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [round, setRound] = useState(1);
  const [playerHp, setPlayerHp] = useState(0);
  const [enemyHp, setEnemyHp] = useState(0);
  const [localLogs, setLocalLogs] = useState<BattleLogEntry[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const [battleEnded, setBattleEnded] = useState(false);
  const [finalResult, setFinalResult] = useState<"victory" | "defeat" | "fled" | null>(null);

  const playerStats = getTotalStats(character);

  // 초기화 - battleState의 HP가 있으면 그것을 사용 (모드 전환 시 HP 유지)
  useEffect(() => {
    // battleState에서 HP 가져오기 (진행 중인 전투가 있으면 해당 HP 사용)
    const initialPlayerHp = battleState.isActive && battleState.playerCurrentHp > 0 ? battleState.playerCurrentHp : playerStats.hp;
    const initialEnemyHp = battleState.isActive && battleState.enemyCurrentHp > 0 ? battleState.enemyCurrentHp : enemy.hp;

    setPlayerHp(initialPlayerHp);
    setEnemyHp(initialEnemyHp);
    setRound(battleState.turnCount || 1);

    // 이미 로그가 있으면 그것을 사용, 없으면 새로 생성
    if (battleState.battleLog && battleState.battleLog.length > 0) {
      setLocalLogs(battleState.battleLog);
    } else {
      setLocalLogs([
        {
          turn: 0,
          actor: "player",
          action: `${enemy.name}이(가) 나타났다!`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
    setBattleEnded(false);
    setFinalResult(null);
  }, [enemy.id, battleState.isActive, battleState.playerCurrentHp, battleState.enemyCurrentHp, battleState.turnCount, battleState.battleLog, playerStats.hp, enemy.hp, enemy.name]);

  const handleChoiceClick = (choice: BattleChoice) => {
    if (isAnimating || battleEnded) return;
    setSelectedChoice(choice);
    setIsConfirming(true);
  };

  const handleConfirm = () => {
    if (!selectedChoice || isAnimating) return;

    setIsConfirming(false);
    setIsAnimating(true);

    // 선택지 결과 계산
    const result = calculateChoiceRound(character, enemy, selectedChoice, playerHp, enemyHp);

    const timestamp = new Date().toISOString();
    const newLogs: BattleLogEntry[] = [
      {
        turn: round,
        actor: "player",
        action: selectedChoice.choice_text,
        timestamp,
      },
    ];

    if (result.success) {
      newLogs.push({
        turn: round,
        actor: "player",
        action: `${result.description}${result.isCritical ? " (크리티컬!)" : ""}`,
        damage: result.enemyDamage,
        isCritical: result.isCritical,
        timestamp,
      });
      if (result.playerDamage > 0) {
        newLogs.push({
          turn: round,
          actor: "enemy",
          action: `${enemy.name}의 반격!`,
          damage: result.playerDamage,
          timestamp,
        });
      }
    } else {
      newLogs.push({
        turn: round,
        actor: "enemy",
        action: `${result.description}${result.isCritical ? " (크리티컬!)" : ""}`,
        damage: result.playerDamage,
        isCritical: result.isCritical,
        timestamp,
      });
      if (result.enemyDamage > 0) {
        newLogs.push({
          turn: round,
          actor: "player",
          action: "미약한 반격...",
          damage: result.enemyDamage,
          timestamp,
        });
      }
    }

    // 결과 표시 후 상태 업데이트
    setTimeout(() => {
      setLocalLogs((prev) => [...prev, ...newLogs]);
      setPlayerHp(result.newPlayerHp);
      setEnemyHp(result.newEnemyHp);

      // 승패 체크
      if (result.newEnemyHp <= 0) {
        setLocalLogs((prev) => [
          ...prev,
          {
            turn: round,
            actor: "player",
            action: `${enemy.name}을(를) 쓰러뜨렸다!`,
            timestamp: new Date().toISOString(),
          },
        ]);
        setBattleEnded(true);
        setFinalResult("victory");
        // 부모 컴포넌트에 결과 전달
        onSelectChoice({ ...selectedChoice, outcome: "victory" });
      } else if (result.newPlayerHp <= 0) {
        setLocalLogs((prev) => [
          ...prev,
          {
            turn: round,
            actor: "enemy",
            action: "당신은 쓰러졌다...",
            timestamp: new Date().toISOString(),
          },
        ]);
        setBattleEnded(true);
        setFinalResult("defeat");
        onSelectChoice({ ...selectedChoice, outcome: "defeat" });
      } else {
        setRound((r) => r + 1);
      }

      setIsAnimating(false);
      setSelectedChoice(null);
    }, 500);
  };

  const handleCancel = () => {
    setIsConfirming(false);
    setSelectedChoice(null);
  };

  // 도주 선택지 처리
  const handleFlee = () => {
    if (isAnimating || battleEnded) return;

    const fleeChance = 0.3 + playerStats.agi * 0.02 + playerStats.luck * 0.01;
    const escaped = Math.random() < Math.min(0.7, fleeChance);

    const timestamp = new Date().toISOString();

    if (escaped) {
      setLocalLogs((prev) => [
        ...prev,
        {
          turn: round,
          actor: "player",
          action: "도망에 성공했다!",
          timestamp,
        },
      ]);
      setBattleEnded(true);
      setFinalResult("fled");
      // 도주용 가상 choice 생성
      onSelectChoice({
        id: -1,
        enemy_id: enemy.id,
        choice_text: "도망친다",
        outcome: "escape",
        description_success: "도망에 성공했다!",
        description_failure: "도망치지 못했다!",
      });
    } else {
      // 도주 실패 시 적이 공격
      const { damage } = calculateDamage(enemy, playerStats, enemy.attack_type, 1.0);
      const newHp = Math.max(0, playerHp - damage);

      setLocalLogs((prev) => [
        ...prev,
        {
          turn: round,
          actor: "player",
          action: "도망치지 못했다!",
          timestamp,
        },
        {
          turn: round,
          actor: "enemy",
          action: `${enemy.name}의 공격!`,
          damage,
          timestamp,
        },
      ]);

      setPlayerHp(newHp);

      if (newHp <= 0) {
        setLocalLogs((prev) => [
          ...prev,
          {
            turn: round,
            actor: "enemy",
            action: "당신은 쓰러졌다...",
            timestamp: new Date().toISOString(),
          },
        ]);
        setBattleEnded(true);
        setFinalResult("defeat");
        onSelectChoice({
          id: -1,
          enemy_id: enemy.id,
          choice_text: "도망친다",
          outcome: "defeat",
          description_success: "",
          description_failure: "도망치지 못했다...",
        });
      } else {
        setRound((r) => r + 1);
      }
    }
  };

  // 스탯 체크 힌트 표시
  const getStatHint = (choice: BattleChoice) => {
    if (!choice.stat_check_stat || !choice.stat_check_threshold) {
      return null;
    }

    const statNames: Record<string, string> = {
      str: "힘",
      agi: "민첩",
      int: "지능",
      hp: "체력",
      mp: "마력",
      luck: "행운",
    };

    const playerValue = playerStats[choice.stat_check_stat];
    const threshold = choice.stat_check_threshold;
    const isAdvantage = playerValue >= threshold;

    return {
      statName: statNames[choice.stat_check_stat] || choice.stat_check_stat,
      playerValue,
      threshold,
      isAdvantage,
    };
  };

  const playerHpPercent = (playerHp / playerStats.hp) * 100;
  const enemyHpPercent = (enemyHp / enemy.hp) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* 적 정보 */}
      <div className="bg-gray-800 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">{enemy.image_url ? <Image src={enemy.image_url} alt={enemy.name} width={64} height={64} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🐉</div>}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white">{enemy.name}</span>
              <span className="text-xs text-gray-400">Lv.{enemy.level}</span>
            </div>
            <div className="mb-1">
              <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                <span>HP</span>
                <span>
                  {enemyHp} / {enemy.hp}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${enemyHpPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 전투 로그 */}
      <div className="flex-1 mb-3 min-h-[100px] max-h-[150px]">
        <BattleLog logs={localLogs} />
      </div>

      {/* 플레이어 정보 */}
      <div className="bg-gray-800 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
            <Image src={`/Vygddrasilpage/character/${character.class}.jpg`} alt={character.nickname} width={48} height={48} className="object-cover w-full h-full" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-white text-sm">{character.nickname}</span>
              <span className="text-xs text-gray-400">Round {round}</span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                <span>HP</span>
                <span>
                  {playerHp} / {playerStats.hp}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${playerHpPercent > 50 ? "bg-green-500" : playerHpPercent > 25 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${playerHpPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 결과 표시 또는 선택지 */}
      {battleEnded ? (
        <div className="text-center py-4">
          <div className={`text-2xl font-bold mb-2 ${finalResult === "victory" ? "text-green-400" : finalResult === "fled" ? "text-yellow-400" : "text-red-400"}`}>{finalResult === "victory" ? "🎉 승리!" : finalResult === "fled" ? "🏃 도주 성공!" : "💀 패배..."}</div>
        </div>
      ) : (
        <>
          {/* 선택지 목록 */}
          <div className="space-y-2">
            {choices.map((choice) => {
              const hint = getStatHint(choice);

              return (
                <button key={choice.id} onClick={() => handleChoiceClick(choice)} disabled={isAnimating} className={`w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-yellow-500 rounded-lg p-3 text-left transition-all ${isAnimating ? "opacity-50 cursor-not-allowed" : ""}`}>
                  <div className="text-white font-medium text-sm">{choice.choice_text}</div>
                  {hint && (
                    <div className={`text-xs mt-1 ${hint.isAdvantage ? "text-green-400" : "text-orange-400"}`}>
                      {hint.statName} {hint.playerValue}/{hint.threshold}
                      {hint.isAdvantage ? " ✓" : " ⚠"}
                    </div>
                  )}
                </button>
              );
            })}

            {/* 도주 버튼 */}
            <button onClick={handleFlee} disabled={isAnimating} className={`w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg p-3 text-left transition-all ${isAnimating ? "opacity-50 cursor-not-allowed" : ""}`}>
              <div className="text-gray-300 font-medium text-sm">🏃 도망친다</div>
              <div className="text-xs text-gray-500 mt-1">민첩과 행운에 따라 성공률 변동</div>
            </button>
          </div>
        </>
      )}

      {/* 확인 모달 */}
      {isConfirming && selectedChoice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm mx-4">
            <div className="text-lg font-bold text-white mb-4">선택 확인</div>
            <div className="text-gray-300 mb-6">&ldquo;{selectedChoice.choice_text}&rdquo;를 선택하시겠습니까?</div>
            <div className="flex gap-3">
              <button onClick={handleCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition">
                취소
              </button>
              <button onClick={handleConfirm} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg transition font-bold">
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
