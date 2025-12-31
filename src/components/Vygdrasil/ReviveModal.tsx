// components/Vygdrasil/ReviveModal.tsx

"use client";

import React, { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import NewStoryCreateAbi from "../../contracts/abi/NewStoryCreate.json";

const CONTRACT_ADDRESS = "0x54507082a8BD3f4aef9a69Ae58DeAD63cAB97244";
const VERY_CHAIN_ID = "0x1205"; // 4613 in decimal

// VERY Mainnet 네트워크 설정
const VERY_NETWORK_PARAMS = {
  chainId: VERY_CHAIN_ID,
  chainName: "VERY Mainnet",
  nativeCurrency: {
    name: "VERY",
    symbol: "VERY",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.verylabs.io"],
  blockExplorerUrls: ["https://veryscan.io"],
};

interface ReviveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReviveWithGold: () => Promise<void>;
  onReviveWithTransaction: () => Promise<void>;
  goldCost: number;
  currentGold: number;
  isProcessing: boolean;
  isRevivePending?: boolean; // 부활 처리 중 (선택지 비활성화용)
}

export default function ReviveModal({
  isOpen,
  onClose,
  onReviveWithGold,
  onReviveWithTransaction,
  goldCost,
  currentGold,
  isProcessing,
}: ReviveModalProps) {
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [isGoldProcessing, setIsGoldProcessing] = useState(false);
  const canAffordGold = currentGold >= goldCost;

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
    } catch (switchError: unknown) {
      // 네트워크가 추가되어 있지 않은 경우 (에러 코드 4902)
      const error = switchError as { code?: number };
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [VERY_NETWORK_PARAMS],
          });
          return true;
        } catch {
          toast.error("VERY 메인넷 추가에 실패했습니다.");
          return false;
        }
      }
      toast.error("VERY 메인넷으로 전환해주세요.");
      return false;
    }
  };

  // 골드 부활 핸들러
  const handleGoldRevive = async () => {
    if (isGoldProcessing || isProcessing) return;
    setIsGoldProcessing(true);
    try {
      await onReviveWithGold();
    } finally {
      setIsGoldProcessing(false);
    }
  };

  const handleTransactionRevive = async () => {
    if (isTransactionPending) return;

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
    const contract = new ethers.Contract(CONTRACT_ADDRESS, NewStoryCreateAbi, signer);

    setIsTransactionPending(true);
    try {
      // 컨트랙트의 StoryCreate 함수 호출 (1 VERY)
      const tx = await contract.StoryCreate({ value: ethers.parseEther("1") });
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        toast.success("부활 성공!");
        await onReviveWithTransaction();
      } else {
        toast.error("트랜잭션 실패");
      }
    } catch (err) {
      console.error(err);
      toast.error("트랜잭션 중 오류가 발생했습니다.");
    } finally {
      setIsTransactionPending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
          <h2 className="text-2xl font-bold text-white text-center">
            부활하기
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center text-gray-300 mb-6">
            <p className="text-lg mb-2">캐릭터가 사망했습니다.</p>
            <p className="text-sm text-gray-400">
              마지막 저장 지점에서 부활할 수 있습니다.
            </p>
          </div>

          {/* 골드 부활 옵션 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-yellow-400 font-bold">골드로 부활</h3>
                <p className="text-sm text-gray-400">
                  골드를 소모하여 부활합니다
                </p>
              </div>
              <div className="text-right">
                <p className="text-yellow-400 font-bold">{goldCost} G</p>
                <p className="text-xs text-gray-500">
                  보유: {currentGold} G
                </p>
              </div>
            </div>
            <button
              onClick={handleGoldRevive}
              disabled={!canAffordGold || isProcessing || isGoldProcessing}
              className={`w-full py-3 rounded-lg font-bold transition ${
                canAffordGold && !isProcessing && !isGoldProcessing
                  ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isProcessing || isGoldProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  처리 중...
                </span>
              ) : !canAffordGold ? (
                "골드 부족"
              ) : (
                `${goldCost} G 소모하고 부활`
              )}
            </button>
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-gray-700" />
            <span className="text-gray-500 text-sm">또는</span>
            <div className="flex-1 border-t border-gray-700" />
          </div>

          {/* 트랜잭션 부활 옵션 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-purple-400 font-bold">무료 부활</h3>
                <p className="text-sm text-gray-400">
                  트랜잭션으로 페널티 없이 부활
                </p>
              </div>
              <div className="text-right">
                <p className="text-purple-400 font-bold">1 VERY</p>
                <p className="text-xs text-gray-500">+ 가스비</p>
              </div>
            </div>
            <button
              onClick={handleTransactionRevive}
              disabled={isTransactionPending || isProcessing}
              className={`w-full py-3 rounded-lg font-bold transition ${
                !isTransactionPending && !isProcessing
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isTransactionPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  트랜잭션 처리 중...
                </span>
              ) : (
                "트랜잭션으로 부활"
              )}
            </button>
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            disabled={isProcessing || isTransactionPending}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition mt-4"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
