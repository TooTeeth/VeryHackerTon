"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { VotingService, VotingSessionWithOptions, VotingOption } from "../../services/voting.service";

const VOTING_CONTRACT_ADDRESS = "0x54507082a8BD3f4aef9a69Ae58DeAD63cAB97244";

const VotingAbi = [
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
  const [currentSession, setCurrentSession] = useState<VotingSessionWithOptions>(session);

  // Handle time up
  const handleTimeUp = useCallback(async () => {
    setVotingPhase("result");

    // Refresh session to get final results
    const updatedSession = await VotingService.getSessionById(session.id, walletAddress);
    if (updatedSession) {
      setCurrentSession(updatedSession);

      // Find winning choice
      if (updatedSession.winningOptionId) {
        const winningOption = updatedSession.options.find((o) => o.id === updatedSession.winningOptionId);
        if (winningOption) {
          toast.success(`투표 결과: "${winningOption.choice_text}"이(가) 선택되었습니다!`);
          onVoteComplete(winningOption.choice_id);
        }
      } else {
        toast.info("과반수를 획득한 선택지가 없습니다. 모든 선택지가 선택 가능합니다.");
        onVoteComplete();
      }
    }
  }, [session.id, walletAddress, onVoteComplete]);

  // Calculate time remaining
  useEffect(() => {
    if (!isOpen) return;

    const updateTime = () => {
      const end = new Date(session.end_time).getTime();
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

  // Handle vote
  const handleVote = async () => {
    if (!selectedOption) {
      toast.error("선택지를 먼저 선택해주세요");
      return;
    }

    setIsVoting(true);
    setVotingPhase("processing");

    try {
      // 1. Send transaction
      if (!window.ethereum) {
        throw new Error("MetaMask가 설치되어 있지 않습니다");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Send 0.1 VERY for voting
      const contract = new ethers.Contract(VOTING_CONTRACT_ADDRESS, VotingAbi, signer);
      const tx = await contract.VoteOnStory({ value: ethers.parseEther("0.1") });

      toast.info("트랜잭션 처리 중...");
      await tx.wait();

      // 2. Record vote in database
      const result = await VotingService.vote(session.id, selectedOption.id, walletAddress);

      if (result.success) {
        toast.success("투표가 완료되었습니다!");

        // Refresh session
        const updatedSession = await VotingService.getSessionById(session.id, walletAddress);
        if (updatedSession) {
          setCurrentSession(updatedSession);
        }
      } else {
        toast.error(result.error || "투표에 실패했습니다");
      }
    } catch (error: unknown) {
      console.error("Vote error:", error);
      const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류";

      if (errorMessage.includes("user rejected")) {
        toast.error("트랜잭션이 취소되었습니다");
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
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-4 text-center">
          <h2 className="text-2xl font-bold text-white">DAO 투표</h2>
          <p className="text-purple-300 text-sm mt-1">{session.title}</p>
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
          <div className="text-center mb-6">
            <div className={`text-4xl font-mono font-bold ${timeRemaining <= 5 ? "text-red-500 animate-pulse" : "text-white"}`}>{formatTime(timeRemaining)}</div>
            <p className="text-gray-400 text-sm mt-1">남은 시간</p>
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
              ) : (
                <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-4">
                  <p className="text-gray-300">과반수를 획득한 선택지가 없습니다.</p>
                  <p className="text-gray-400 text-sm mt-1">모든 선택지가 선택 가능합니다.</p>
                </div>
              )}
            </div>
          )}

          {/* Vote Button */}
          {votingPhase === "selecting" && !currentSession.userVote && (
            <button onClick={handleVote} disabled={!selectedOption || isVoting || timeRemaining <= 0} className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition">
              {isVoting ? "처리 중..." : "투표하기 (0.1 VERY)"}
            </button>
          )}

          {/* Already Voted Message */}
          {currentSession.userVote && votingPhase === "selecting" && (
            <div className="text-center py-3 bg-purple-600/20 rounded-xl border border-purple-500/50">
              <p className="text-purple-400 font-bold">투표 완료!</p>
              <p className="text-gray-400 text-sm">결과를 기다리는 중입니다...</p>
            </div>
          )}

          {/* Close Button */}
          {votingPhase === "result" && (
            <button onClick={onClose} className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition mt-4">
              확인
            </button>
          )}
        </div>

        {/* Info */}
        <div className="px-6 pb-4 text-center">
          <p className="text-gray-500 text-xs">투표에는 0.1 VERY가 필요합니다</p>
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
