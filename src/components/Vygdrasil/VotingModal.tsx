"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { VotingService, VotingSessionWithOptions, VotingOption } from "../../services/voting.service";
import { DAO_CONTRACT_ADDRESS, DAO_ABI } from "../../lib/daoConfig";

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletedInfo, setDeletedInfo] = useState<{ reason: string; deletedBy: string; deletedAt: string } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [votingPhase, setVotingPhase] = useState<"selecting" | "processing" | "result" | "deleted">("selecting");
  const [currentSession, setCurrentSession] = useState<VotingSessionWithOptions>({
    ...session,
    eligibleVoters: session.eligibleVoters || 0,
    needsRevote: session.needsRevote || false,
  });
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [createdProposalId, setCreatedProposalId] = useState<number | null>(null);
  const [stageName, setStageName] = useState<string>("");

  // Reset state when modal opens with new session
  useEffect(() => {
    if (isOpen) {
      // Reset to initial state
      setSelectedOption(null);
      setDeletedInfo(null);
      setShowDeleteModal(false);
      setDeleteReason("");

      // Set initial phase based on deletion status
      if (session.is_deleted === true) {
        setDeletedInfo({
          reason: session.delete_reason || "삭제 사유 없음",
          deletedBy: session.deleted_by || "",
          deletedAt: session.deleted_at || new Date().toISOString(),
        });
        setVotingPhase("deleted");
      } else {
        setVotingPhase("selecting");
      }

      // Update currentSession with new session data
      setCurrentSession({
        ...session,
        eligibleVoters: session.eligibleVoters || 0,
        needsRevote: session.needsRevote || false,
      });
    }
  }, [isOpen, session]);

  // Load stage name
  useEffect(() => {
    if (isOpen && session.stage_id) {
      VotingService.getStages().then((stages) => {
        const stage = stages.find((s) => s.id === session.stage_id);
        setStageName(stage?.title || stage?.slug || "");
      });
    }
  }, [isOpen, session.stage_id]);

  // Check if user can delete session
  useEffect(() => {
    if (isOpen && walletAddress) {
      VotingService.canDeleteSession(session.id, walletAddress).then(setCanDelete);
    }
  }, [isOpen, session.id, walletAddress]);

  // All voting is now on-chain via VeryDAOIntegrated contract

  // Get latest session data when modal opens + real-time polling
  useEffect(() => {
    if (!isOpen) return;

    const refreshSession = () => {
      VotingService.getSessionById(session.id, walletAddress).then((updatedSession) => {
        if (updatedSession) {
          setCurrentSession(updatedSession);
        }
      });
    };

    // Initial load
    refreshSession();

    // Poll every 5 seconds for real-time updates
    const interval = setInterval(refreshSession, 5000);

    return () => clearInterval(interval);
  }, [isOpen, session.id, walletAddress]);

  // Handle time up
  const handleTimeUp = useCallback(async () => {
    setVotingPhase("result");

    // Refresh session to get final results
    const updatedSession = await VotingService.getSessionById(session.id, walletAddress);

    // Use current session state (Supabase data may not exist in test mode)
    const sessionToCheck = updatedSession || currentSession;

    if (sessionToCheck) {
      if (updatedSession) {
        setCurrentSession(updatedSession);
      }

      // Majority check: must exceed half of total votes to win
      const totalVotes = sessionToCheck.totalVotes;
      const halfVotes = totalVotes / 2;

      // Find option that exceeded majority
      const winnerOption = sessionToCheck.options.find(opt => opt.vote_count > halfVotes);

      if (winnerOption) {
        // Majority achieved - winner!
        toast.success(`Vote result: "${winnerOption.choice_text}" was selected!`);
        onVoteComplete(winnerOption.choice_id);
      } else if (totalVotes > 0) {
        // Votes exist but no majority - revote needed
        toast.warning("No option achieved majority. Revote is required!");
        // Update needsRevote state
        setCurrentSession(prev => ({ ...prev, needsRevote: true }));
        // Keep revote modal open (don't call onVoteComplete)
      } else {
        // No one voted - revote needed
        toast.warning("No votes were cast. Revote is required!");
        setCurrentSession(prev => ({ ...prev, needsRevote: true }));
      }
    }
  }, [session.id, walletAddress, onVoteComplete, currentSession]);

  // Calculate time remaining
  // Use actual end_time
  const TEST_MODE = false;

  useEffect(() => {
    // Don't run timer if modal is closed or session is deleted
    if (!isOpen || votingPhase === "deleted") return;

    const updateTime = () => {
      // Fix timezone: ensure end_time is parsed as UTC
      const endTimeStr = session.end_time.endsWith('Z') ? session.end_time : session.end_time + 'Z';
      const end = new Date(endTimeStr).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setTimeRemaining(diff);

      // Time's up - show result (only if not deleted)
      if (diff <= 0 && votingPhase === "selecting") {
        handleTimeUp();
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [isOpen, session.end_time, votingPhase, handleTimeUp]);

  // Create test proposal (60 second voting period)
  const handleCreateProposal = async () => {
    setIsCreatingProposal(true);
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const daoContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, signer);

      toast.info("Creating proposal...");

      // Create proposal with 60 second voting period
      const tx = await daoContract.createProposalWithDuration(
        `Story Vote: ${session.title}`,
        60
      );
      const receipt = await tx.wait();

      // Extract proposalId from event
      const event = receipt.logs.find((log: { topics: string[] }) => log.topics[0] === ethers.id("ProposalCreated(uint256,address,string)"));

      if (event) {
        const proposalId = parseInt(event.topics[1], 16);
        setCreatedProposalId(proposalId);
        toast.success(`Proposal #${proposalId} created!`);
      } else {
        toast.success("Proposal created!");
      }
    } catch (error: unknown) {
      console.error("Create proposal error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("user rejected")) {
        toast.error("Transaction was cancelled");
      } else if (errorMessage.includes("Insufficient VERY")) {
        toast.error("Insufficient VERY balance (minimum 1 VERY required)");
      } else {
        toast.error(`Proposal creation failed: ${errorMessage}`);
      }
    } finally {
      setIsCreatingProposal(false);
    }
  };

  // Start revote
  const handleStartRevote = async () => {
    // Reset voting state
    setVotingPhase("selecting");
    setSelectedOption(null);

    // Create new proposal (60 seconds)
    toast.info("Creating new proposal for revote...");
    await handleCreateProposal();
  };

  // Handle vote - uses VeryDAOIntegrated contract
  const handleVote = async () => {
    if (!selectedOption) {
      toast.error("Please select an option first");
      return;
    }

    setIsVoting(true);
    setVotingPhase("processing");

    try {
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // ========== On-chain DAO voting (VeryDAOIntegrated) ==========
      const daoContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, signer);

      toast.info("트랜잭션 처리 중...");

      // Use proposalId if exists, otherwise use session.id as proposal reference
      const proposalId = session.proposalId || session.id;

      // vote(uint256 id, bool support) - vote in favor
      // For story selection, choice selection is recorded in Supabase
      // Contract only records participation
      const tx = await daoContract.vote(proposalId, true);
      await tx.wait();

      toast.success("온체인 투표 완료!");

      // Record actual choice in Supabase
      try {
        await VotingService.vote(session.id, selectedOption.id, walletAddress);
      } catch (cacheError) {
        console.warn("Supabase recording failed:", cacheError);
      }

      // Refresh session
      const updatedSession = await VotingService.getSessionById(session.id, walletAddress);
      if (updatedSession) {
        setCurrentSession(updatedSession);
      }
    } catch (error: unknown) {
      console.error("Vote error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("user rejected")) {
        toast.error("트랜잭션이 취소되었습니다");
      } else if (errorMessage.includes("Already voted")) {
        toast.error("이미 투표하셨습니다");
      } else if (errorMessage.includes("No voting power")) {
        toast.error("투표권이 없습니다 (VERY 잔액 부족)");
      } else if (errorMessage.includes("Voting inactive")) {
        toast.error("투표가 활성화되지 않았습니다");
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
          {stageName && (
            <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/50">
              {stageName}
            </span>
          )}
          <span className="inline-block mt-2 ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/50">온체인 투표</span>
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
                className={`object-contain ${votingPhase === "deleted" ? "grayscale opacity-50" : ""}`}
                style={{
                  animation: votingPhase === "deleted" ? "none" : "spinVariation 4s ease-in-out infinite",
                }}
              />
            </div>
          </div>

          {/* Status Text */}
          {votingPhase !== "deleted" && (
            <p className="text-center text-xl font-bold text-purple-300 mb-4 animate-pulse">세계관을 결정하는 중입니다.</p>
          )}

          {/* Timer - Hide when deleted */}
          {votingPhase !== "deleted" && (
            <div className="text-center mb-4">
              <div className={`text-4xl font-mono font-bold ${timeRemaining <= 5 ? "text-red-500 animate-pulse" : "text-white"}`}>{formatTime(timeRemaining)}</div>
              <p className="text-gray-400 text-sm mt-1">남은 시간</p>
            </div>
          )}

          {/* 투표 현황 표시 - Hide when deleted */}
          {votingPhase !== "deleted" && (
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
          )}

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
              <p className="text-gray-400 text-sm mt-2">블록체인에 투표가 기록됩니다</p>
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
              {isVoting ? "처리 중..." : "투표하기 (DAO)"}
            </button>
          )}

          {/* Already Voted Message */}
          {currentSession.userVote && votingPhase === "selecting" && (
            <div className="text-center py-3 bg-purple-600/20 rounded-xl border border-purple-500/50">
              <p className="text-purple-400 font-bold">투표 완료!</p>
              <p className="text-gray-400 text-sm">결과를 기다리는 중입니다...</p>
            </div>
          )}

          {/* Delete Session Button (Admin/Operator only) */}
          {canDelete && votingPhase === "selecting" && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-xs mb-2">관리자 권한: 이 투표를 삭제할 수 있습니다</p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition"
              >
                투표 삭제
              </button>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
              <div className="bg-gray-800 rounded-xl border border-red-500/50 w-full max-w-md mx-4 p-6">
                <h3 className="text-xl font-bold text-red-400 mb-4">투표 삭제</h3>
                <p className="text-gray-300 text-sm mb-4">
                  이 투표를 삭제하시겠습니까? 삭제 사유를 입력해주세요.
                </p>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="삭제 사유를 입력하세요..."
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500 resize-none"
                  rows={3}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteReason("");
                    }}
                    className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={async () => {
                      if (!deleteReason.trim()) {
                        toast.error("삭제 사유를 입력해주세요");
                        return;
                      }
                      if (isDeleting) return;

                      setIsDeleting(true);
                      try {
                        const result = await VotingService.deleteSession(session.id, walletAddress, deleteReason.trim());
                        if (result.success) {
                          setDeletedInfo({
                            reason: deleteReason.trim(),
                            deletedBy: walletAddress,
                            deletedAt: new Date().toISOString(),
                          });
                          setShowDeleteModal(false);
                          setVotingPhase("deleted");
                        } else {
                          toast.error(result.error || "투표 삭제 실패");
                        }
                      } catch (error) {
                        console.error("Delete session error:", error);
                        toast.error("투표 삭제 중 오류가 발생했습니다");
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    disabled={isDeleting || !deleteReason.trim()}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition"
                  >
                    {isDeleting ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Deleted Phase */}
          {votingPhase === "deleted" && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">🗑️</div>
              <p className="text-red-400 font-bold text-xl mb-2">투표가 삭제되었습니다</p>

              {deletedInfo && (
                <div className="mt-4 p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-left">
                  <div className="mb-3">
                    <p className="text-gray-400 text-xs mb-1">삭제 사유</p>
                    <p className="text-white text-sm">{deletedInfo.reason}</p>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>삭제자: {deletedInfo.deletedBy.slice(0, 6)}...{deletedInfo.deletedBy.slice(-4)}</span>
                    <span>{new Date(deletedInfo.deletedAt).toLocaleString("ko-KR")}</span>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
              >
                닫기
              </button>
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
          <p className="text-gray-500 text-xs">투표는 블록체인에 영구 기록됩니다 (VERY 잔액 기준 투표권)</p>
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
