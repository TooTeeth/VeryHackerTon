"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { VotingService, VotingSessionWithOptions, VotingOption } from "../../services/voting.service";
import { DAO_CONTRACT_ADDRESS, DAO_ABI } from "../../lib/daoConfig";

// 레거시 컨트랙트 (fallback)
const LEGACY_VOTING_CONTRACT_ADDRESS = "0x54507082a8BD3f4aef9a69Ae58DeAD63cAB97244";
const LegacyVotingAbi = [
  {
    inputs: [],
    name: "VoteOnStory",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
];

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: VotingSessionWithOptions;
  walletAddress: string;
  onVoteComplete: (winningChoiceId?: number) => void;
}

export const VotingModal: React.FC<VotingModalProps> = ({ isOpen, onClose, session, walletAddress, onVoteComplete }) => {
  const [selectedOption, setSelectedOption] = useState<VotingOption | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [votingPhase, setVotingPhase] = useState<"selecting" | "processing" | "result">("selecting");
  const [currentSession, setCurrentSession] = useState<VotingSessionWithOptions>({
    ...session,
    eligibleVoters: session.eligibleVoters || 0,
    needsRevote: session.needsRevote || false,
  });
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [createdProposalId, setCreatedProposalId] = useState<number | null>(null);

  // 온체인 여부 확인 (VeryDAOIntegrated)
  // 테스트: 항상 새 DAO 컨트랙트 사용 (테스트 후 원래대로 복구)
  const isOnChainVoting = true; // 원래: session.isOnChain && DAO_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000"

  // 모달 열릴 때 최신 세션 데이터 가져오기
  useEffect(() => {
    if (isOpen) {
      VotingService.getSessionById(session.id, walletAddress).then((updatedSession) => {
        if (updatedSession) {
          setCurrentSession(updatedSession);
        }
      });
    }
  }, [isOpen, session.id, walletAddress]);

  // Handle time up
  const handleTimeUp = useCallback(async () => {
    setVotingPhase("result");

    // Refresh session to get final results
    const updatedSession = await VotingService.getSessionById(session.id, walletAddress);

    // 현재 세션 상태를 사용 (테스트 모드에서는 Supabase 데이터가 없을 수 있음)
    const sessionToCheck = updatedSession || currentSession;

    if (sessionToCheck) {
      if (updatedSession) {
        setCurrentSession(updatedSession);
      }

      // 과반수 체크: 총 투표 수의 절반 초과해야 승리
      const totalVotes = sessionToCheck.totalVotes;
      const halfVotes = totalVotes / 2;

      // 과반수를 넘은 선택지 찾기
      const winnerOption = sessionToCheck.options.find(opt => opt.vote_count > halfVotes);

      if (winnerOption) {
        // 과반수 획득 - 승리!
        toast.success(`투표 결과: "${winnerOption.choice_text}"이(가) 선택되었습니다!`);
        onVoteComplete(winnerOption.choice_id);
      } else if (totalVotes > 0) {
        // 투표는 있지만 과반수 미달 - 재투표 필요
        toast.warning("과반수를 획득한 선택지가 없습니다. 재투표가 필요합니다!");
        // needsRevote 상태 업데이트
        setCurrentSession(prev => ({ ...prev, needsRevote: true }));
        // 재투표 모달 유지 (onVoteComplete 호출하지 않음)
      } else {
        // 아무도 투표 안함 - 재투표 필요
        toast.warning("투표한 사람이 없습니다. 재투표가 필요합니다!");
        setCurrentSession(prev => ({ ...prev, needsRevote: true }));
      }
    }
  }, [session.id, walletAddress, onVoteComplete, currentSession]);

  // Calculate time remaining
  // 테스트용: 투표 시간을 30초로 설정 (테스트 후 삭제)
  const TEST_MODE = true; // false로 바꾸면 원래 end_time 사용
  const TEST_DURATION = 30; // 테스트 투표 시간 (초)
  const [testEndTime] = useState(() => Date.now() + TEST_DURATION * 1000);

  useEffect(() => {
    if (!isOpen) return;

    const updateTime = () => {
      const end = TEST_MODE ? testEndTime : new Date(session.end_time).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeRemaining(diff);

      // Time's up - show result
      if (diff <= 0 && votingPhase === "selecting") {
        handleTimeUp();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [isOpen, session.end_time, votingPhase, handleTimeUp]);

  // 테스트용 프로포절 생성 (60초 투표 기간)
  const handleCreateProposal = async () => {
    setIsCreatingProposal(true);
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask가 설치되어 있지 않습니다");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const daoContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, signer);

      toast.info("프로포절 생성 중...");

      // 60초 투표 기간으로 프로포절 생성
      const tx = await daoContract.createProposalWithDuration(
        `Story Vote: ${session.title}`,
        60 // 60초
      );
      const receipt = await tx.wait();

      // 이벤트에서 proposalId 추출
      const event = receipt.logs.find((log: { topics: string[] }) => log.topics[0] === ethers.id("ProposalCreated(uint256,address,string)"));

      if (event) {
        const proposalId = parseInt(event.topics[1], 16);
        setCreatedProposalId(proposalId);
        toast.success(`프로포절 #${proposalId} 생성 완료!`);
      } else {
        toast.success("프로포절 생성 완료!");
      }
    } catch (error: unknown) {
      console.error("Create proposal error:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";
      if (errorMessage.includes("user rejected")) {
        toast.error("트랜잭션이 취소되었습니다");
      } else if (errorMessage.includes("Insufficient VERY")) {
        toast.error("VERY 잔액이 부족합니다 (최소 1 VERY 필요)");
      } else {
        toast.error(`프로포절 생성 실패: ${errorMessage}`);
      }
    } finally {
      setIsCreatingProposal(false);
    }
  };

  // 재투표 시작
  const handleStartRevote = async () => {
    // 투표 상태 리셋
    setVotingPhase("selecting");
    setSelectedOption(null);

    // 새 프로포절 생성 (60초)
    toast.info("재투표를 위한 새 프로포절을 생성합니다...");
    await handleCreateProposal();
  };

  // Handle vote - VeryDAOIntegrated 컨트랙트 사용 (찬성/반대 방식)
  const handleVote = async () => {
    if (!selectedOption) {
      toast.error("선택지를 먼저 선택해주세요");
      return;
    }

    setIsVoting(true);
    setVotingPhase("processing");

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask가 설치되어 있지 않습니다");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 테스트: proposalId 없으면 1 사용
      const proposalId = session.proposalId || 1;

      if (isOnChainVoting) {
        // ========== 온체인 DAO 투표 (VeryDAOIntegrated) ==========
        const daoContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, signer);

        toast.info("트랜잭션 처리 중...");

        // vote(uint256 id, bool support) - 찬성으로 투표
        // 스토리 선택의 경우, 선택지 선택은 Supabase에 기록하고
        // 컨트랙트에는 참여 기록만 남김
        const tx = await daoContract.vote(proposalId, true);
        await tx.wait();

        toast.success("온체인 투표가 완료되었습니다!");

        // Supabase에 실제 선택지 기록
        try {
          await VotingService.vote(session.id, selectedOption.id, walletAddress);
        } catch (cacheError) {
          console.warn("Supabase 기록 실패:", cacheError);
        }
      } else {
        // ========== 레거시 투표 (기존 방식) ==========
        const contract = new ethers.Contract(LEGACY_VOTING_CONTRACT_ADDRESS, LegacyVotingAbi, signer);
        const tx = await contract.VoteOnStory({ value: ethers.parseEther("0.1") });

        toast.info("트랜잭션 처리 중...");
        await tx.wait();

        // Supabase에 투표 기록
        const result = await VotingService.vote(session.id, selectedOption.id, walletAddress);

        if (result.success) {
          toast.success("투표가 완료되었습니다!");
        } else {
          toast.error(result.error || "투표에 실패했습니다");
        }
      }

      // Refresh session
      const updatedSession = await VotingService.getSessionById(session.id, walletAddress);
      if (updatedSession) {
        setCurrentSession(updatedSession);
      }
    } catch (error: unknown) {
      console.error("Vote error:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";

      if (errorMessage.includes("user rejected")) {
        toast.error("트랜잭션이 취소되었습니다");
      } else if (errorMessage.includes("Already voted")) {
        toast.error("이미 투표하셨습니다");
      } else if (errorMessage.includes("No voting power")) {
        toast.error("투표권이 없습니다 (VERY 잔액 부족)");
      } else if (errorMessage.includes("Voting inactive")) {
        toast.error("투표가 진행 중이 아닙니다");
      } else {
        toast.error(`투표 실패: ${errorMessage}`);
      }
    } finally {
      setIsVoting(false);
      setVotingPhase("selecting");
    }
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-purple-500/50 w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-4 text-center relative">
          {/* X 닫기 버튼 */}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-white">DAO 투표</h2>
          <p className="text-purple-300 text-sm mt-1">{session.title}</p>
          {isOnChainVoting && <span className="inline-block mt-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/50">온체인 투표</span>}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Animated Image */}
          <div className="flex justify-center mb-6">
            <div className="relative w-48 h-48">
              <Image
                src="/Vygddrasilpage/voting.png"
                alt="Voting"
                fill
                className="object-contain animate-spin-slow"
                style={{
                  animation: "spinVariation 4s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Status Text */}
          <p className="text-center text-xl font-bold text-purple-300 mb-4 animate-pulse">세계관을 결정하는 중입니다.</p>

          {/* Timer */}
          <div className="text-center mb-4">
            <div className={`text-4xl font-mono font-bold ${timeRemaining <= 5 ? "text-red-500 animate-pulse" : "text-white"}`}>{formatTime(timeRemaining)}</div>
            <p className="text-gray-400 text-sm mt-1">남은 시간</p>
          </div>

          {/* 투표 현황 표시 */}
          <div className="flex justify-center items-center gap-4 mb-6 p-3 bg-gray-800/50 rounded-xl border border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{currentSession.totalVotes}</div>
              <div className="text-xs text-gray-400">투표 완료</div>
            </div>
            <div className="text-gray-500">/</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-300">{currentSession.eligibleVoters || '?'}</div>
              <div className="text-xs text-gray-400">투표 가능자</div>
            </div>
            <div className="ml-4 px-3 py-1 rounded-full text-xs font-bold" style={{
              backgroundColor: currentSession.totalVotes > 0 && currentSession.eligibleVoters
                ? (currentSession.totalVotes / currentSession.eligibleVoters > 0.5 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)')
                : 'rgba(107, 114, 128, 0.2)',
              color: currentSession.totalVotes > 0 && currentSession.eligibleVoters
                ? (currentSession.totalVotes / currentSession.eligibleVoters > 0.5 ? '#22c55e' : '#eab308')
                : '#6b7280'
            }}>
              {currentSession.totalVotes > 0 && currentSession.eligibleVoters
                ? `${Math.round((currentSession.totalVotes / currentSession.eligibleVoters) * 100)}% 참여`
                : '0% 참여'}
            </div>
          </div>

          {/* Options */}
          {votingPhase === "selecting" && (
            <div className="space-y-3 mb-6">
              {currentSession.options.map((option) => {
                const isSelected = selectedOption?.id === option.id;
                const hasVoted = currentSession.userVote !== undefined;
                const isUserVote = currentSession.userVote === option.id;
                const percentage = currentSession.totalVotes > 0 ? Math.round((option.vote_count / currentSession.totalVotes) * 100) : 0;

                return (
                  <button key={option.id} onClick={() => !hasVoted && setSelectedOption(option)} disabled={hasVoted || isVoting} className={`w-full p-4 rounded-xl transition-all relative overflow-hidden ${isSelected ? "bg-purple-600 border-2 border-purple-400" : isUserVote ? "bg-purple-600/30 border-2 border-purple-500" : "bg-gray-800 border border-gray-700 hover:border-gray-500"} ${hasVoted ? "cursor-default" : "cursor-pointer"}`}>
                    {/* Progress bar */}
                    <div className="absolute inset-0 bg-purple-500/20 transition-all" style={{ width: `${percentage}%` }} />

                    <div className="relative flex justify-between items-center">
                      <span className="font-bold text-white">{option.choice_text}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{option.vote_count}표</span>
                        <span className="text-purple-400">({percentage}%)</span>
                        {isUserVote && <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded">내 투표</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Processing Phase */}
          {votingPhase === "processing" && (
            <div className="text-center py-8">
              <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-white">트랜잭션 처리 중...</p>
              {isOnChainVoting && <p className="text-gray-400 text-sm mt-2">블록체인에 투표가 기록됩니다</p>}
            </div>
          )}

          {/* Result Phase */}
          {votingPhase === "result" && (
            <div className="text-center py-4">
              {currentSession.winningOptionId ? (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4">
                  <p className="text-yellow-400 font-bold text-lg">{currentSession.options.find((o) => o.id === currentSession.winningOptionId)?.choice_text}</p>
                  <p className="text-gray-400 text-sm mt-1">이(가) 선택되었습니다!</p>
                </div>
              ) : currentSession.needsRevote ? (
                <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
                  <p className="text-red-400 font-bold text-lg">과반수 미달!</p>
                  <p className="text-gray-400 text-sm mt-2">
                    투표 결과: {currentSession.options.map(o => `${o.choice_text}(${o.vote_count}표)`).join(' vs ')}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    과반수({Math.floor(currentSession.totalVotes / 2) + 1}표 이상)를 획득한 선택지가 없습니다.
                  </p>
                  <p className="text-red-300 text-sm mt-2 font-bold">재투표가 필요합니다.</p>
                </div>
              ) : (
                <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4">
                  <p className="text-gray-300">투표가 종료되었습니다.</p>
                </div>
              )}
            </div>
          )}

          {/* 테스트용 프로포절 생성 버튼 */}
          {votingPhase === "selecting" && TEST_MODE && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <p className="text-yellow-400 text-xs mb-2">⚠️ 테스트 모드: 블록체인에 프로포절이 없으면 먼저 생성하세요</p>
              <div className="flex gap-2 items-center">
                <button onClick={handleCreateProposal} disabled={isCreatingProposal} className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition text-sm">
                  {isCreatingProposal ? "생성 중..." : "프로포절 생성 (60초)"}
                </button>
                {createdProposalId && <span className="text-green-400 text-sm">ID: {createdProposalId}</span>}
              </div>
            </div>
          )}

          {/* Vote Button */}
          {votingPhase === "selecting" && !currentSession.userVote && (
            <button onClick={handleVote} disabled={!selectedOption || isVoting || timeRemaining <= 0} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition">
              {isVoting ? "처리 중..." : isOnChainVoting ? "투표하기 (DAO)" : "투표하기 (0.1 VERY)"}
            </button>
          )}

          {/* Already Voted Message */}
          {currentSession.userVote && votingPhase === "selecting" && (
            <div className="text-center py-3 bg-purple-600/20 rounded-xl border border-purple-500/50">
              <p className="text-purple-400 font-bold">투표 완료!</p>
              <p className="text-gray-400 text-sm">결과를 기다리는 중입니다...</p>
            </div>
          )}

          {/* Close Button / Revote Button */}
          {votingPhase === "result" && (
            <div className="mt-4 space-y-2">
              {currentSession.needsRevote ? (
                <button
                  onClick={handleStartRevote}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition"
                >
                  재투표 시작
                </button>
              ) : null}
              <button onClick={onClose} className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition">
                {currentSession.needsRevote ? '나중에' : '확인'}
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-6 pb-4 text-center">
          <p className="text-gray-500 text-xs">{isOnChainVoting ? "투표는 블록체인에 영구 기록됩니다 (VERY 잔액 기준 투표권)" : "투표에는 0.1 VERY가 필요합니다"}</p>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx global>{`
        @keyframes spinVariation {
          0% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(180deg);
          }
          30% {
            transform: rotate(180deg);
          }
          50% {
            transform: rotate(540deg);
          }
          55% {
            transform: rotate(540deg);
          }
          75% {
            transform: rotate(720deg);
          }
          80% {
            transform: rotate(720deg);
          }
          100% {
            transform: rotate(1080deg);
          }
        }
      `}</style>
    </div>
  );
};
