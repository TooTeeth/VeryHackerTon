// components/Battlemodal/Battlemodal.tsx

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MintButton from "../Vygdrasil/MintButton";
import TurnBasedBattle from "./TurnBasedBattle";
import AutoBattle from "./AutoBattle";
import ChoiceBattle from "./ChoiceBattle";
import BattleResult from "./BattleResult";
import { BattleMode, BattleState, BattleAction, Character, Enemy, BattleChoice, BattleRewardConfig, Skill } from "../../types/vygddrasil.types";

// 레거시 모드: NFT 민팅만 하는 기존 모달
type LegacyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode?: "legacy";
  content?: string;
};

// 전투 모드: 새로운 전투 시스템
type BattleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: BattleMode;
  character: Character;
  characterId: number;
  enemy: Enemy;
  battleState: BattleState;
  rewardConfig: BattleRewardConfig | null;
  choices?: BattleChoice[];
  battleSpeed?: "slow" | "normal" | "fast";
  showAnimations?: boolean; // 애니메이션 ON/OFF
  onStartBattle: () => void;
  onPlayerAction: (action: BattleAction, skill?: Skill) => void;
  onChoiceSelect: (choice: BattleChoice) => void;
  onBattleEnd: (result: "victory" | "defeat" | "fled") => void;
  onRetry: () => void;
  onClaimNftReward?: () => void;
  isRetrying?: boolean;
};

type ModalProps = LegacyModalProps | BattleModalProps;

// 타입 가드
function isBattleMode(props: ModalProps): props is BattleModalProps {
  return "mode" in props && props.mode !== undefined && props.mode !== "legacy";
}

export default function BattleModal(props: ModalProps) {
  const { isOpen, onClose } = props;
  const [showResult, setShowResult] = useState(false);

  // 전투 결과가 나오면 결과 화면으로 전환
  useEffect(() => {
    if (isBattleMode(props)) {
      const { battleState } = props;
      if (battleState.result !== "ongoing" && battleState.isActive) {
        // 자동 전투는 애니메이션 후 결과 표시
        if (props.mode === "auto") {
          const delay = props.battleSpeed === "slow" ? 1000 : props.battleSpeed === "fast" ? 300 : 500;
          const timer = setTimeout(() => setShowResult(true), delay);
          return () => clearTimeout(timer);
        } else {
          setShowResult(true);
        }
      }
    }
  }, [props]);

  // 모달 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setShowResult(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 레거시 모드: 기존 NFT 민팅 모달
  if (!isBattleMode(props)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
        <div className="bg-gray-100 rounded-lg max-w-md w-full p-6 relative">
          <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
            ✕
          </button>
          <div className="font-bold text-2xl mb-5 items-center justify-center flex">칭호 NFT: 비그드라실을 지켜낸</div>
          <div className="flex justify-center items-center">
            <Image src="/Vygddrasilpage/compensation.png" alt="NFT" width={320} height={320} />
          </div>
          <div className="flex items-center flex-col justify-center mt-10 text-2xl font-bold">
            <MintButton tokenId={0} amount={1} />
            <div className="mt-3">
              <Link href="/play">처음으로 돌아가기</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 전투 모드
  const { mode, character, characterId, enemy, battleState, rewardConfig, choices = [], battleSpeed = "normal", showAnimations = true, onStartBattle, onPlayerAction, onChoiceSelect, onBattleEnd, onRetry, onClaimNftReward, isRetrying = false } = props;

  // 자동전투가 시작되었는지 확인 (로그가 생성되었으면 시작된 것)
  // 전투가 시작되었고 아직 결과가 ongoing이면 진행중
  const isAutoBattleStarted = mode === "auto" && battleState.battleLog.length > 0;
  const isAutoBattleInProgress = isAutoBattleStarted && battleState.result === "ongoing";

  const handleClose = () => {
    // 자동전투가 시작되고 진행중일 때만 닫기 방지
    if (isAutoBattleInProgress) {
      return;
    }
    onClose();
  };

  const handleExit = () => {
    onBattleEnd(battleState.result as "victory" | "defeat" | "fled");
    onClose();
  };

  const handleRetry = () => {
    setShowResult(false);
    onRetry();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
        {/* 헤더 */}
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚔️</span>
            <span className="font-bold text-white">{mode === "turn-based" ? "턴제 전투" : mode === "auto" ? "자동 전투" : "선택지 전투"}</span>
          </div>
          <button
            onClick={handleClose}
            disabled={isAutoBattleInProgress}
            className={`transition w-8 h-8 flex items-center justify-center rounded ${
              isAutoBattleInProgress
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
            title={isAutoBattleInProgress ? "전투 진행중에는 닫을 수 없습니다" : "닫기"}
          >
            ✕
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-auto p-4">
          {/* 결과 화면 */}
          {showResult && battleState.result !== "ongoing" ? (
            <BattleResult character={character} characterId={characterId} enemy={enemy} battleState={battleState} rewards={battleState.rewards} onRetry={handleRetry} onExit={handleExit} onClaimReward={onClaimNftReward} isRetrying={isRetrying} />
          ) : (
            <>
              {/* 턴제 전투 */}
              {mode === "turn-based" && (
                <TurnBasedBattle
                  character={character}
                  battleState={battleState}
                  onAction={onPlayerAction}
                  onEnemyTurn={() => {}} // Enemy turn은 useVygddrasilGame에서 handlePlayerAction 내에서 처리됨
                  battleSpeed={battleSpeed}
                  showAnimations={showAnimations}
                />
              )}

              {/* 자동 전투 */}
              {mode === "auto" && <AutoBattle character={character} enemy={enemy} battleState={battleState} rewardConfig={rewardConfig} onStartBattle={onStartBattle} battleSpeed={battleSpeed} />}

              {/* 선택지 전투 */}
              {mode === "choice" && <ChoiceBattle character={character} enemy={enemy} battleState={battleState} rewardConfig={rewardConfig} choices={choices} onSelectChoice={onChoiceSelect} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
