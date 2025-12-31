// components/Battlemodal/TurnBasedBattle.tsx

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { BattleState, BattleAction, Character } from "../../types/vygddrasil.types";
import BattleLog from "./BattleLog";

interface TurnBasedBattleProps {
  character: Character;
  battleState: BattleState;
  onAction: (action: BattleAction) => void;
  onEnemyTurn: () => void;
  battleSpeed: "slow" | "normal" | "fast";
  showAnimations?: boolean;
}

const speedDelays = {
  slow: 2000,
  normal: 1000,
  fast: 500,
};

export default function TurnBasedBattle({ character, battleState, onAction, onEnemyTurn, battleSpeed, showAnimations = true }: TurnBasedBattleProps) {
  const { enemy, playerCurrentHp, playerMaxHp, playerCurrentMp, playerMaxMp, enemyCurrentHp, enemyMaxHp, turn, result, battleLog } = battleState;

  const prevLogLength = useRef(battleLog.length);

  // 애니메이션 상태
  const [isPlayerAttacking, setIsPlayerAttacking] = useState(false);
  const [isEnemyAttacking, setIsEnemyAttacking] = useState(false);
  const [showPlayerHitEffect, setShowPlayerHitEffect] = useState(false);
  const [showEnemyHitEffect, setShowEnemyHitEffect] = useState(false);
  const [playerDamagePopup, setPlayerDamagePopup] = useState<number | null>(null);
  const [enemyDamagePopup, setEnemyDamagePopup] = useState<number | null>(null);
  const [screenShake, setScreenShake] = useState(false);

  // 전투 로그 변화 감지해서 애니메이션 트리거 (간소화 모드에서도 작동)
  useEffect(() => {
    if (battleLog.length <= prevLogLength.current) {
      prevLogLength.current = battleLog.length;
      return;
    }

    const newLogs = battleLog.slice(prevLogLength.current);
    prevLogLength.current = battleLog.length;

    newLogs.forEach((log, index) => {
      setTimeout(() => {
        if (log.actor === "player" && log.damage) {
          // 플레이어 공격 애니메이션
          setIsPlayerAttacking(true);
          setTimeout(() => {
            setIsPlayerAttacking(false);
            setShowEnemyHitEffect(true);
            setEnemyDamagePopup(log.damage!);
            setScreenShake(true);
            setTimeout(() => {
              setShowEnemyHitEffect(false);
              setScreenShake(false);
            }, 400);
            setTimeout(() => setEnemyDamagePopup(null), 1200);
          }, 400);
        } else if (log.actor === "enemy" && log.damage) {
          // 적 공격 애니메이션
          setIsEnemyAttacking(true);
          setTimeout(() => {
            setIsEnemyAttacking(false);
            setShowPlayerHitEffect(true);
            setPlayerDamagePopup(log.damage!);
            setScreenShake(true);
            setTimeout(() => {
              setShowPlayerHitEffect(false);
              setScreenShake(false);
            }, 400);
            setTimeout(() => setPlayerDamagePopup(null), 1200);
          }, 400);
        }
      }, index * 700);
    });
  }, [battleLog]);

  // 적 턴 자동 실행
  useEffect(() => {
    if (turn === "enemy" && result === "ongoing") {
      const timer = setTimeout(() => {
        onEnemyTurn();
      }, speedDelays[battleSpeed]);

      return () => clearTimeout(timer);
    }
  }, [turn, result, onEnemyTurn, battleSpeed]);

  if (!enemy) return null;

  const playerHpPercent = (playerCurrentHp / playerMaxHp) * 100;
  const playerMpPercent = (playerCurrentMp / playerMaxMp) * 100;
  const enemyHpPercent = (enemyCurrentHp / enemyMaxHp) * 100;

  const isPlayerTurn = turn === "player" && result === "ongoing";

  // 클래스별 공격 이펙트 설정
  const classEffects: Record<string, { emoji: string; color: string; name: string }> = {
    warrior: { emoji: "⚔️", color: "#FFD700", name: "검격" },
    archer: { emoji: "🏹", color: "#00FF7F", name: "화살" },
    assassin: { emoji: "🌟", color: "#9400D3", name: "표창" },
    bard: { emoji: "🎵", color: "#FF69B4", name: "음파" },
    magician: { emoji: "✨", color: "#00BFFF", name: "마법" },
  };
  const currentClassEffect = classEffects[character.class] || classEffects.warrior;

  // 간소화 모드 - 양쪽 초상화 + 가운데 VS + 공격 애니메이션
  if (!showAnimations) {
    return (
      <div className="flex flex-col h-full">
        {/* 배틀 씬 - 양쪽 초상화 레이아웃 */}
        <div className={`relative rounded-lg overflow-hidden mb-3 border-2 border-gray-700 bg-gradient-to-b from-gray-800 to-gray-900 ${screenShake ? "animate-screen-shake-simple" : ""}`}>
          <div className="flex items-stretch h-44">
            {/* 왼쪽 - 플레이어 초상화 */}
            <div className={`relative w-1/3 overflow-hidden transition-all duration-300 ${isPlayerAttacking ? "translate-x-8 scale-110 z-10" : ""} ${showPlayerHitEffect ? "animate-hit-shake" : ""}`}>
              <Image src={`/Vygddrasilpage/character/${character.class}.jpg`} alt={character.nickname} fill className={`object-cover transition-all duration-200 ${showPlayerHitEffect ? "brightness-150" : ""}`} priority unoptimized />
              {/* 피격 효과 오버레이 */}
              {showPlayerHitEffect && <div className="absolute inset-0 bg-red-500/40 animate-flash-overlay z-10" />}
              {/* 플레이어 HP 바 */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1.5 z-20">
                <p className="text-[10px] text-white font-bold text-center mb-0.5">{character.nickname}</p>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-300 ${playerHpPercent > 50 ? "bg-green-500" : playerHpPercent > 25 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${playerHpPercent}%` }} />
                </div>
                <p className="text-[8px] text-gray-300 text-center mt-0.5">
                  {playerCurrentHp}/{playerMaxHp}
                </p>
              </div>
              {/* 데미지 표시 */}
              {playerDamagePopup !== null && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 animate-damage-popup">
                  <span className="text-3xl font-black text-red-500 drop-shadow-[0_2px_8px_rgba(255,0,0,0.8)]">-{playerDamagePopup}</span>
                </div>
              )}
            </div>

            {/* 중앙 - VS + 투사체 */}
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
              {/* 배경 효과 */}
              <div className="absolute inset-0 bg-gradient-radial from-purple-900/30 via-transparent to-transparent" />

              {/* VS 텍스트 */}
              <div className="text-5xl font-black text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] z-10">VS</div>

              {/* 턴 표시 */}
              <div className="mt-2 z-10">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${turn === "player" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>{turn === "player" ? "YOUR TURN" : "ENEMY TURN"}</span>
              </div>

              {/* 플레이어 공격 투사체 (클래스별) */}
              {isPlayerAttacking && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 animate-projectile-right">
                  <span className="text-4xl" style={{ filter: `drop-shadow(0 0 10px ${currentClassEffect.color})` }}>
                    {currentClassEffect.emoji}
                  </span>
                </div>
              )}

              {/* 적 공격 투사체 */}
              {isEnemyAttacking && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 animate-projectile-left">
                  <span className="text-4xl" style={{ filter: "drop-shadow(0 0 10px #FF4444)" }}>
                    🔥
                  </span>
                </div>
              )}

              {/* 충돌 이펙트 */}
              {(showEnemyHitEffect || showPlayerHitEffect) && (
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="w-16 h-16 animate-clash-effect">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                        <line key={angle} x1="50" y1="50" x2={50 + 35 * Math.cos((angle * Math.PI) / 180)} y2={50 + 35 * Math.sin((angle * Math.PI) / 180)} stroke={showEnemyHitEffect ? currentClassEffect.color : "#FF4444"} strokeWidth="3" className="animate-clash-line" />
                      ))}
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽 - 적 초상화 */}
            <div className={`relative w-1/3 overflow-hidden transition-all duration-300 ${isEnemyAttacking ? "-translate-x-8 scale-110 z-10" : ""} ${showEnemyHitEffect ? "animate-hit-shake" : ""}`}>
              {enemy.image_url ? (
                <Image src={enemy.image_url} alt={enemy.name} fill className={`object-cover transition-all duration-200 ${showEnemyHitEffect ? "brightness-150" : ""}`} priority unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-900 to-gray-900">
                  <span className="text-6xl">🐉</span>
                </div>
              )}
              {/* 피격 효과 오버레이 */}
              {showEnemyHitEffect && <div className="absolute inset-0 bg-yellow-500/40 animate-flash-overlay z-10" />}
              {/* 적 HP 바 */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1.5 z-20">
                <p className="text-[10px] text-white font-bold text-center mb-0.5">{enemy.name}</p>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${enemyHpPercent}%` }} />
                </div>
                <p className="text-[8px] text-gray-300 text-center mt-0.5">
                  {enemyCurrentHp}/{enemyMaxHp}
                </p>
              </div>
              {/* 데미지 표시 */}
              {enemyDamagePopup !== null && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 animate-damage-popup">
                  <span className="text-3xl font-black text-yellow-400 drop-shadow-[0_2px_8px_rgba(255,200,0,0.8)]">-{enemyDamagePopup}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MP 바 */}
        <div className="bg-gray-800 rounded-lg p-2 mb-2">
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-blue-400">MP</span>
            <span className="text-gray-400">
              {playerCurrentMp}/{playerMaxMp}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${playerMpPercent}%` }} />
          </div>
        </div>

        {/* 전투 로그 */}
        <div className="flex-1 mb-2 min-h-[60px] max-h-[80px]">
          <BattleLog logs={battleLog} compact />
        </div>

        {/* 액션 버튼 */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onAction("attack")} disabled={!isPlayerTurn} className={`py-2 px-3 rounded-lg font-bold transition text-sm ${isPlayerTurn ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}>
            {currentClassEffect.emoji} 공격
          </button>
          <button onClick={() => onAction("defend")} disabled={!isPlayerTurn} className={`py-2 px-3 rounded-lg font-bold transition text-sm ${isPlayerTurn ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}>
            🛡️ 방어
          </button>
          <button onClick={() => onAction("skill")} disabled={!isPlayerTurn || playerCurrentMp < 10} className={`py-2 px-3 rounded-lg font-bold transition text-sm ${isPlayerTurn && playerCurrentMp >= 10 ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}>
            ✨ 스킬
          </button>
          <button onClick={() => onAction("flee")} disabled={!isPlayerTurn} className={`py-2 px-3 rounded-lg font-bold transition text-sm ${isPlayerTurn ? "bg-gray-500 hover:bg-gray-600 text-white" : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}>
            🏃 도주
          </button>
        </div>

        {/* 간소화 모드 애니메이션 */}
        <style jsx global>{`
          @keyframes screen-shake-simple {
            0%,
            100% {
              transform: translateX(0);
            }
            10% {
              transform: translateX(-4px) rotate(-0.5deg);
            }
            20% {
              transform: translateX(4px) rotate(0.5deg);
            }
            30% {
              transform: translateX(-3px) rotate(-0.3deg);
            }
            40% {
              transform: translateX(3px) rotate(0.3deg);
            }
            50% {
              transform: translateX(-2px);
            }
            60% {
              transform: translateX(2px);
            }
          }
          .animate-screen-shake-simple {
            animation: screen-shake-simple 0.3s ease-out;
          }

          @keyframes hit-shake {
            0%,
            100% {
              transform: translateX(0);
            }
            20% {
              transform: translateX(-6px);
            }
            40% {
              transform: translateX(6px);
            }
            60% {
              transform: translateX(-4px);
            }
            80% {
              transform: translateX(4px);
            }
          }
          .animate-hit-shake {
            animation: hit-shake 0.3s ease-out;
          }

          @keyframes damage-popup {
            0% {
              transform: translate(-50%, -50%) scale(0.5);
              opacity: 1;
            }
            20% {
              transform: translate(-50%, -70%) scale(1.2);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -100%) scale(1);
              opacity: 0;
            }
          }
          .animate-damage-popup {
            animation: damage-popup 0.8s ease-out forwards;
          }

          @keyframes projectile-right {
            0% {
              transform: translateX(0) translateY(-50%) scale(1);
              opacity: 1;
            }
            50% {
              transform: translateX(60px) translateY(-50%) scale(1.2);
              opacity: 1;
            }
            100% {
              transform: translateX(120px) translateY(-50%) scale(0.8);
              opacity: 0;
            }
          }
          .animate-projectile-right {
            animation: projectile-right 0.4s ease-out forwards;
          }

          @keyframes projectile-left {
            0% {
              transform: translateX(0) translateY(-50%) scale(1);
              opacity: 1;
            }
            50% {
              transform: translateX(-60px) translateY(-50%) scale(1.2);
              opacity: 1;
            }
            100% {
              transform: translateX(-120px) translateY(-50%) scale(0.8);
              opacity: 0;
            }
          }
          .animate-projectile-left {
            animation: projectile-left 0.4s ease-out forwards;
          }

          @keyframes clash-effect {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            50% {
              transform: scale(1.2);
              opacity: 1;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
          .animate-clash-effect {
            animation: clash-effect 0.3s ease-out forwards;
          }

          @keyframes clash-line {
            0% {
              stroke-dasharray: 0 50;
            }
            100% {
              stroke-dasharray: 50 0;
            }
          }
          .animate-clash-line {
            animation: clash-line 0.3s ease-out forwards;
          }

          @keyframes flash-overlay {
            0% {
              opacity: 0.6;
            }
            100% {
              opacity: 0;
            }
          }
          .animate-flash-overlay {
            animation: flash-overlay 0.3s ease-out forwards;
          }

          .bg-gradient-radial {
            background: radial-gradient(circle, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to));
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className={`relative w-full h-52 rounded-lg overflow-hidden mb-4 border-2 border-gray-700 ${screenShake ? "animate-screen-shake" : ""}`}>
        <div className="absolute inset-0">
          <Image src="/Vygddrasilpage/VTDNLogo.png" alt="Battle Scene" fill className={`object-cover transition-all duration-200 ${isPlayerAttacking ? "scale-105" : ""}`} priority unoptimized />
        </div>

        {/* Player Attack Effect - Swinging the Sword */}
        {isPlayerAttacking && (
          <div className="absolute inset-0 z-10">
            {/* 스윙 트레일 */}
            <div className="absolute left-[15%] top-[30%] w-32 h-32 animate-sword-swing">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path d="M20 80 Q50 20 80 40" stroke="rgba(255,255,255,0.9)" strokeWidth="6" fill="none" strokeLinecap="round" className="animate-swing-trail" />
                <path d="M25 75 Q55 25 85 45" stroke="rgba(200,220,255,0.7)" strokeWidth="4" fill="none" strokeLinecap="round" className="animate-swing-trail-delay" />
              </svg>
            </div>
            {/* 스파크 이펙트 */}
            <div className="absolute right-[25%] top-[35%] animate-spark-burst">
              <div className="w-16 h-16 bg-yellow-300/80 rounded-full blur-md animate-pulse" />
            </div>
          </div>
        )}

        {/* 적 피격 이펙트 */}
        {showEnemyHitEffect && (
          <div className="absolute inset-0 z-10">
            {/* 임팩트 이펙트 */}
            <div className="absolute right-[20%] top-[30%] animate-impact">
              <svg viewBox="0 0 100 100" className="w-24 h-24">
                {/* 방사형 라인 */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <line key={angle} x1="50" y1="50" x2={50 + 40 * Math.cos((angle * Math.PI) / 180)} y2={50 + 40 * Math.sin((angle * Math.PI) / 180)} stroke="white" strokeWidth="3" className="animate-impact-line" />
                ))}
              </svg>
            </div>
            {/* 플래시 오버레이 */}
            <div className="absolute inset-0 bg-white/30 animate-flash-overlay" />
          </div>
        )}

        {/* 적 공격 이펙트 - 드래곤 브레스/공격 */}
        {isEnemyAttacking && (
          <div className="absolute inset-0 z-10">
            {/* 드래곤 공격 웨이브 */}
            <div className="absolute right-[30%] top-[40%] animate-dragon-attack">
              <div className="w-20 h-20 border-4 border-red-500/80 rounded-full animate-expand-ring" />
              <div className="absolute inset-0 w-16 h-16 m-auto border-2 border-orange-400/60 rounded-full animate-expand-ring-delay" />
            </div>
            {/* 에너지 볼 */}
            <div className="absolute right-[35%] top-[35%] animate-energy-ball">
              <div className="w-12 h-12 bg-gradient-radial from-red-400 via-orange-500 to-transparent rounded-full blur-sm" />
            </div>
          </div>
        )}

        {/* 플레이어 피격 이펙트 */}
        {showPlayerHitEffect && (
          <div className="absolute inset-0 z-10">
            {/* 임팩트 */}
            <div className="absolute left-[15%] top-[50%] animate-impact">
              <svg viewBox="0 0 80 80" className="w-20 h-20">
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <line key={angle} x1="40" y1="40" x2={40 + 30 * Math.cos((angle * Math.PI) / 180)} y2={40 + 30 * Math.sin((angle * Math.PI) / 180)} stroke="red" strokeWidth="3" className="animate-impact-line" />
                ))}
              </svg>
            </div>
            {/* 레드 플래시 */}
            <div className="absolute inset-0 bg-red-500/30 animate-flash-overlay" />
          </div>
        )}

        {/* 데미지 팝업 - 적 */}
        {enemyDamagePopup !== null && (
          <div className="absolute right-[25%] top-[15%] z-20 animate-damage-float">
            <span className="text-4xl font-black text-yellow-400 drop-shadow-[0_2px_10px_rgba(255,200,0,1)]">-{enemyDamagePopup}</span>
          </div>
        )}

        {/* 데미지 팝업 - 플레이어 */}
        {playerDamagePopup !== null && (
          <div className="absolute left-[15%] top-[20%] z-20 animate-damage-float">
            <span className="text-4xl font-black text-red-500 drop-shadow-[0_2px_10px_rgba(255,0,0,1)]">-{playerDamagePopup}</span>
          </div>
        )}

        {/* 턴 표시 오버레이 */}
        {result === "ongoing" && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
            <span className={`text-sm font-bold px-4 py-1.5 rounded-full shadow-lg backdrop-blur-sm ${turn === "player" ? "bg-green-600/90 text-white shadow-green-500/50" : "bg-red-600/90 text-white shadow-red-500/50"}`}>{turn === "player" ? "⚔️ YOUR TURN" : "🐉 ENEMY TURN"}</span>
          </div>
        )}

        {/* HP 오버레이 바 */}
        <div className="absolute bottom-2 left-2 right-2 z-20 flex gap-2">
          {/* 플레이어 HP */}
          <div className="flex-1 bg-black/60 rounded px-2 py-1 backdrop-blur-sm">
            <div className="flex justify-between text-[10px] text-white mb-0.5">
              <span>{character.nickname}</span>
              <span>
                {playerCurrentHp}/{playerMaxHp}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-300 ${playerHpPercent > 50 ? "bg-green-500" : playerHpPercent > 25 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${playerHpPercent}%` }} />
            </div>
          </div>
          {/* 적 HP */}
          <div className="flex-1 bg-black/60 rounded px-2 py-1 backdrop-blur-sm">
            <div className="flex justify-between text-[10px] text-white mb-0.5">
              <span>{enemy.name}</span>
              <span>
                {enemyCurrentHp}/{enemyMaxHp}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${enemyHpPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* MP 바 */}
      <div className="bg-gray-800 rounded-lg p-2 mb-3">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-blue-400">MP</span>
          <span className="text-gray-400">
            {playerCurrentMp}/{playerMaxMp}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${playerMpPercent}%` }} />
        </div>
      </div>

      {/* 전투 로그 */}
      <div className="flex-1 mb-3 min-h-[50px] max-h-[70px]">
        <BattleLog logs={battleLog} />
      </div>

      {/* 액션 버튼 */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onAction("attack")} disabled={!isPlayerTurn} className={`py-2.5 px-3 rounded-lg font-bold transition text-sm ${isPlayerTurn ? "bg-red-600 hover:bg-red-700 text-white" : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}>
          ⚔️ 공격
        </button>
        <button onClick={() => onAction("defend")} disabled={!isPlayerTurn} className={`py-2.5 px-3 rounded-lg font-bold transition text-sm ${isPlayerTurn ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}>
          🛡️ 방어
        </button>
        <button onClick={() => onAction("skill")} disabled={!isPlayerTurn || playerCurrentMp < 10} className={`py-2.5 px-3 rounded-lg font-bold transition text-sm ${isPlayerTurn && playerCurrentMp >= 10 ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}>
          ✨ 스킬 (10MP)
        </button>
        <button onClick={() => onAction("flee")} disabled={!isPlayerTurn} className={`py-2.5 px-3 rounded-lg font-bold transition text-sm ${isPlayerTurn ? "bg-gray-500 hover:bg-gray-600 text-white" : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}>
          🏃 도주
        </button>
      </div>

      {/* 애니메이션 스타일 */}
      <style jsx global>{`
        /* 화면 흔들림 */
        @keyframes screen-shake {
          0%,
          100% {
            transform: translateX(0);
          }
          10% {
            transform: translateX(-5px) translateY(2px);
          }
          20% {
            transform: translateX(5px) translateY(-2px);
          }
          30% {
            transform: translateX(-4px) translateY(1px);
          }
          40% {
            transform: translateX(4px) translateY(-1px);
          }
          50% {
            transform: translateX(-3px);
          }
          60% {
            transform: translateX(3px);
          }
          70% {
            transform: translateX(-2px);
          }
          80% {
            transform: translateX(2px);
          }
        }

        .animate-screen-shake {
          animation: screen-shake 0.4s ease-out;
        }

        /* 검 휘두르기 */
        @keyframes sword-swing {
          0% {
            transform: rotate(-30deg) scale(0.8);
            opacity: 0;
          }
          30% {
            transform: rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: rotate(45deg) scale(1.2);
            opacity: 0;
          }
        }

        .animate-sword-swing {
          animation: sword-swing 0.4s ease-out forwards;
        }

        /* 스윙 트레일 */
        @keyframes swing-trail {
          0% {
            stroke-dasharray: 0 200;
            opacity: 1;
          }
          100% {
            stroke-dasharray: 200 0;
            opacity: 0;
          }
        }

        .animate-swing-trail {
          animation: swing-trail 0.3s ease-out forwards;
        }

        .animate-swing-trail-delay {
          animation: swing-trail 0.3s ease-out 0.05s forwards;
        }

        /* 스파크 버스트 */
        @keyframes spark-burst {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.8;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .animate-spark-burst {
          animation: spark-burst 0.3s ease-out forwards;
        }

        /* 임팩트 */
        @keyframes impact {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .animate-impact {
          animation: impact 0.4s ease-out forwards;
        }

        /* 임팩트 라인 */
        @keyframes impact-line {
          0% {
            stroke-dasharray: 0 50;
            opacity: 1;
          }
          100% {
            stroke-dasharray: 50 0;
            opacity: 0;
          }
        }

        .animate-impact-line {
          animation: impact-line 0.3s ease-out forwards;
        }

        /* 플래시 오버레이 */
        @keyframes flash-overlay {
          0% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 0;
          }
        }

        .animate-flash-overlay {
          animation: flash-overlay 0.3s ease-out forwards;
        }

        /* 드래곤 공격 */
        @keyframes dragon-attack {
          0% {
            transform: translateX(50px);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          100% {
            transform: translateX(-100px);
            opacity: 0;
          }
        }

        .animate-dragon-attack {
          animation: dragon-attack 0.5s ease-out forwards;
        }

        /* 확장 링 */
        @keyframes expand-ring {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .animate-expand-ring {
          animation: expand-ring 0.4s ease-out forwards;
        }

        .animate-expand-ring-delay {
          animation: expand-ring 0.4s ease-out 0.1s forwards;
        }

        /* 에너지 볼 */
        @keyframes energy-ball {
          0% {
            transform: scale(0.5) translateX(0);
            opacity: 0;
          }
          30% {
            transform: scale(1) translateX(-20px);
            opacity: 1;
          }
          100% {
            transform: scale(0.3) translateX(-150px);
            opacity: 0;
          }
        }

        .animate-energy-ball {
          animation: energy-ball 0.5s ease-out forwards;
        }

        /* 데미지 플로팅 */
        @keyframes damage-float {
          0% {
            transform: translateY(0) scale(0.5);
            opacity: 1;
          }
          20% {
            transform: translateY(-10px) scale(1.3);
            opacity: 1;
          }
          100% {
            transform: translateY(-40px) scale(1);
            opacity: 0;
          }
        }

        .animate-damage-float {
          animation: damage-float 1.2s ease-out forwards;
        }

        /* 그라데이션 배경 */
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-from), var(--tw-gradient-via), var(--tw-gradient-to));
        }
      `}</style>
    </div>
  );
}
