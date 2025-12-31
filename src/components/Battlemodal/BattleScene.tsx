// components/Battlemodal/BattleScene.tsx

import React, { useState, useEffect } from "react";
import Image from "next/image";

interface BattleSceneProps {
  playerImage: string;
  enemyImage: string;
  playerDamage?: number;
  enemyDamage?: number;
  playerAttacking?: boolean;
  enemyAttacking?: boolean;
  playerHit?: boolean;
  enemyHit?: boolean;
  showAnimations?: boolean;
}

export default function BattleScene({
  playerImage,
  enemyImage,
  playerDamage,
  enemyDamage,
  playerAttacking = false,
  enemyAttacking = false,
  playerHit = false,
  enemyHit = false,
  showAnimations = true,
}: BattleSceneProps) {
  const [showPlayerDamage, setShowPlayerDamage] = useState(false);
  const [showEnemyDamage, setShowEnemyDamage] = useState(false);
  const [playerShake, setPlayerShake] = useState(false);
  const [enemyShake, setEnemyShake] = useState(false);
  const [playerFlash, setPlayerFlash] = useState(false);
  const [enemyFlash, setEnemyFlash] = useState(false);

  // 플레이어 피격 애니메이션
  useEffect(() => {
    if (playerHit && showAnimations) {
      setPlayerShake(true);
      setPlayerFlash(true);
      setShowPlayerDamage(true);

      const shakeTimer = setTimeout(() => setPlayerShake(false), 300);
      const flashTimer = setTimeout(() => setPlayerFlash(false), 200);
      const damageTimer = setTimeout(() => setShowPlayerDamage(false), 1000);

      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(flashTimer);
        clearTimeout(damageTimer);
      };
    }
  }, [playerHit, playerDamage, showAnimations]);

  // 적 피격 애니메이션
  useEffect(() => {
    if (enemyHit && showAnimations) {
      setEnemyShake(true);
      setEnemyFlash(true);
      setShowEnemyDamage(true);

      const shakeTimer = setTimeout(() => setEnemyShake(false), 300);
      const flashTimer = setTimeout(() => setEnemyFlash(false), 200);
      const damageTimer = setTimeout(() => setShowEnemyDamage(false), 1000);

      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(flashTimer);
        clearTimeout(damageTimer);
      };
    }
  }, [enemyHit, enemyDamage, showAnimations]);

  return (
    <div className="relative w-full h-48 bg-gradient-to-b from-gray-700 to-gray-900 rounded-lg overflow-hidden">
      {/* 배경 */}
      <div className="absolute inset-0 bg-[url('/Vygddrasilpage/background.png')] bg-cover bg-center opacity-30" />

      {/* 전투 씬 */}
      <div className="relative h-full flex items-end justify-between px-4 pb-4">
        {/* 플레이어 */}
        <div className="relative">
          <div
            className={`
              relative w-20 h-20 transition-transform duration-100
              ${playerShake ? "animate-shake" : ""}
              ${playerAttacking ? "animate-attack-right" : ""}
            `}
          >
            <Image
              src={playerImage}
              alt="Player"
              width={80}
              height={80}
              className={`
                rounded-lg object-cover
                ${playerFlash ? "brightness-200" : ""}
                transition-all duration-100
              `}
              priority
              unoptimized
            />
            {/* 피격 오버레이 */}
            {playerFlash && (
              <div className="absolute inset-0 bg-red-500/50 rounded-lg animate-pulse" />
            )}
          </div>

          {/* 플레이어 데미지 표시 */}
          {showPlayerDamage && playerDamage !== undefined && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-damage-popup">
              <span className="text-2xl font-bold text-red-500 drop-shadow-lg">
                -{playerDamage}
              </span>
            </div>
          )}
        </div>

        {/* VS 이펙트 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="text-3xl font-bold text-yellow-500 drop-shadow-lg animate-pulse">
            ⚔️
          </span>
        </div>

        {/* 적 */}
        <div className="relative">
          <div
            className={`
              relative w-24 h-24 transition-transform duration-100
              ${enemyShake ? "animate-shake" : ""}
              ${enemyAttacking ? "animate-attack-left" : ""}
            `}
          >
            <Image
              src={enemyImage}
              alt="Enemy"
              width={96}
              height={96}
              className={`
                rounded-lg object-cover
                ${enemyFlash ? "brightness-200" : ""}
                transition-all duration-100
              `}
              priority
              unoptimized
            />
            {/* 피격 오버레이 */}
            {enemyFlash && (
              <div className="absolute inset-0 bg-red-500/50 rounded-lg animate-pulse" />
            )}
          </div>

          {/* 적 데미지 표시 */}
          {showEnemyDamage && enemyDamage !== undefined && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-damage-popup">
              <span className="text-2xl font-bold text-yellow-400 drop-shadow-lg">
                -{enemyDamage}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 스타일 정의 */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }

        @keyframes attack-right {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(30px); }
        }

        @keyframes attack-left {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-30px); }
        }

        @keyframes damage-popup {
          0% {
            opacity: 1;
            transform: translate(-50%, 0) scale(0.5);
          }
          20% {
            transform: translate(-50%, -10px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -30px) scale(1);
          }
        }

        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        .animate-attack-right {
          animation: attack-right 0.3s ease-in-out;
        }

        .animate-attack-left {
          animation: attack-left 0.3s ease-in-out;
        }

        .animate-damage-popup {
          animation: damage-popup 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
