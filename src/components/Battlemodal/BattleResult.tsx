// components/Battlemodal/BattleResult.tsx

import React, { useState } from "react";
import Image from "next/image";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { BattleState, Character, Enemy, BattleRewards } from "../../types/vygddrasil.types";
import { VygddrasilService } from "../../services/vygddrasil.service";
import MintContractAbi from "../../contracts/abi/1155mint.json";

const VERY_CHAIN_ID = "0x1205";

interface BattleResultProps {
  character: Character;
  characterId: number;
  enemy: Enemy;
  battleState: BattleState;
  rewards: BattleRewards | undefined;
  onRetry: () => void;
  onExit: () => void;
  onClaimReward?: () => void;
  isRetrying?: boolean;
}

export default function BattleResult({ character, characterId, enemy, battleState, rewards, onRetry, onExit, onClaimReward, isRetrying = false }: BattleResultProps) {
  const { result, turnCount } = battleState;
  const isVictory = result === "victory";
  const isFled = result === "fled";

  const [isMinting, setIsMinting] = useState(false);
  const [isMinted, setIsMinted] = useState(false);

  const switchToVeryChain = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask가 감지되지 않았습니다.");
      return false;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: VERY_CHAIN_ID }],
      });
      return true;
    } catch {
      toast.error("VERY 메인넷으로 전환해주세요.");
      return false;
    }
  };

  const handleMintNFT = async () => {
    if (isMinting || isMinted) return;
    if (!rewards?.nftContractAddress || !rewards?.nftTokenId) {
      toast.error("NFT 정보가 없습니다.");
      return;
    }

    const ethereum = window.ethereum;
    if (!ethereum) {
      toast.error("MetaMask가 감지되지 않았습니다.");
      return;
    }

    let accounts = await ethereum.request({ method: "eth_accounts" });

    if (!Array.isArray(accounts) || accounts.length === 0) {
      toast.info("지갑 연결을 해주세요.");
      try {
        accounts = await ethereum.request({ method: "eth_requestAccounts" });
      } catch {
        toast.error("지갑 연결을 거부했습니다.");
        return;
      }
    }

    const switched = await switchToVeryChain();
    if (!switched) return;

    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(rewards.nftContractAddress, MintContractAbi, signer);

    setIsMinting(true);
    try {
      const tokenId = parseInt(rewards.nftTokenId, 10);
      const tx = await contract.mint(await signer.getAddress(), tokenId, 1);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        // 캐릭터 NFT 획득 기록
        await VygddrasilService.recordCharacterNFT(
          characterId,
          rewards.nftContractAddress,
          rewards.nftTokenId
        );

        toast.success("도감 수집 완료!");
        setIsMinted(true);
        if (onClaimReward) {
          onClaimReward();
        }
      } else {
        toast.error("트랜잭션 실패");
      }
    } catch (err) {
      console.error(err);
      toast.error("민팅 중 오류가 발생했습니다.");
    } finally {
      setIsMinting(false);
    }
  };

  // 스탯 이름 매핑
  const statNames: Record<string, string> = {
    str: "힘",
    agi: "민첩",
    int: "지능",
    hp: "체력",
    mp: "마력",
    luck: "행운",
  };

  return (
    <div className="flex flex-col h-full">
      {/* 결과 헤더 */}
      <div className="text-center mb-6">
        <div className={`text-4xl font-bold mb-2 ${isVictory ? "text-green-400" : isFled ? "text-yellow-400" : "text-red-400"}`}>{isVictory ? "🎉 승리!" : isFled ? "🏃 도주!" : "💀 패배"}</div>
        <div className="text-gray-400">총 {turnCount}턴</div>
      </div>

      {/* VS 디스플레이 */}
      <div className="flex items-center justify-center gap-8 mb-6">
        {/* 플레이어 */}
        <div className="text-center">
          <div className={`w-20 h-20 rounded-lg overflow-hidden mx-auto mb-2 border-2 ${isVictory || isFled ? "border-green-500" : "border-red-500 grayscale"}`}>
            <Image src={`/Vygddrasilpage/character/${character.class}.jpg`} alt={character.nickname} width={80} height={80} className="object-cover w-full h-full" />
          </div>
          <div className="text-white font-bold text-sm">{character.nickname}</div>
          <div className="text-xs text-gray-400">
            HP: {battleState.playerCurrentHp}/{battleState.playerMaxHp}
          </div>
        </div>

        {/* VS */}
        <div className="text-2xl font-bold text-gray-500">VS</div>

        {/* 적 */}
        <div className="text-center">
          <div className={`w-20 h-20 rounded-lg overflow-hidden mx-auto mb-2 border-2 ${isVictory ? "border-red-500 grayscale" : isFled ? "border-gray-500" : "border-green-500"}`}>{enemy.image_url ? <Image src={enemy.image_url} alt={enemy.name} width={80} height={80} className="object-cover w-full h-full" /> : <div className="w-full h-full flex items-center justify-center text-3xl bg-gray-700">🐉</div>}</div>
          <div className="text-white font-bold text-sm">{enemy.name}</div>
          <div className="text-xs text-gray-400">
            HP: {battleState.enemyCurrentHp}/{battleState.enemyMaxHp}
          </div>
        </div>
      </div>

      {/* 보상 표시 (승리 시) */}
      {isVictory && rewards && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="text-lg font-bold text-yellow-400 mb-3 text-center">🎁 획득 보상</div>
          <div className="grid grid-cols-2 gap-3">
            {rewards.exp > 0 && (
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-blue-400 text-sm">경험치</div>
                <div className="text-white font-bold">+{rewards.exp} EXP</div>
              </div>
            )}
            {rewards.gold > 0 && (
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-yellow-400 text-sm">골드</div>
                <div className="text-white font-bold">+{rewards.gold} G</div>
              </div>
            )}
            {rewards.statBonus && (
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-green-400 text-sm">스탯 보너스</div>
                <div className="text-white font-bold">
                  {statNames[rewards.statBonus.stat] || rewards.statBonus.stat} +{rewards.statBonus.value}
                </div>
              </div>
            )}
            {rewards.nftReward && (
              <div className="bg-gray-700 rounded p-2 text-center">
                <div className="text-purple-400 text-sm">도감</div>
                <div className="text-white font-bold">{isMinted ? "📖 수집 완료!" : "📖 수집 가능!"}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 패배 메시지 */}
      {result === "defeat" && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-6 text-center">
          <div className="text-red-400 mb-2">전투에서 패배했습니다...</div>
          <div className="text-sm text-gray-400">재도전하려면 트랜잭션이 필요합니다.</div>
          <div className="text-sm text-gray-400">트랜잭션 없이 종료하면 처음부터 다시 시작합니다.</div>
        </div>
      )}

      {/* 도주 메시지 */}
      {isFled && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-6 text-center">
          <div className="text-yellow-400">성공적으로 도망쳤습니다!</div>
          <div className="text-sm text-gray-400 mt-1">전투 없이 다음으로 진행합니다.</div>
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="mt-auto space-y-3">
        {/* 승리: 도감 수집 + 계속하기 */}
        {isVictory && (
          <div className="flex gap-4 justify-center">
            {rewards?.nftReward && rewards?.nftContractAddress && rewards?.nftTokenId && !isMinted && (
              <button onClick={handleMintNFT} disabled={isMinting} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 text-white py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1">
                {isMinting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    민팅 중...
                  </>
                ) : (
                  <>📖 도감 수집</>
                )}
              </button>
            )}
            {isMinted && <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2 px-4 rounded-lg text-sm font-bold text-center">✓ 수집 완료</div>}
            <button onClick={onExit} disabled={isMinting} className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-2 px-4 rounded-lg text-sm font-bold transition-all">
              계속하기 →
            </button>
          </div>
        )}

        {/* 도주: 계속하기 */}
        {isFled && (
          <button onClick={onExit} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-3 rounded-lg font-bold transition">
            → 계속 진행하기
          </button>
        )}

        {/* 패배: 재도전 + 종료 */}
        {result === "defeat" && (
          <>
            <button onClick={onRetry} disabled={isRetrying} className="w-full bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2">
              {isRetrying ? (
                <>
                  <span className="animate-spin">⏳</span>
                  트랜잭션 처리 중...
                </>
              ) : (
                <>⚔️ 재도전 (트랜잭션 필요)</>
              )}
            </button>
            <button onClick={onExit} disabled={isRetrying} className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white py-3 rounded-lg transition">
              처음부터 다시 시작
            </button>
          </>
        )}
      </div>
    </div>
  );
}
