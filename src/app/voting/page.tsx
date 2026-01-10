"use client";

import { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import { VotingService, VotingSessionWithOptions, Proposal } from "../../services/voting.service";
import { useDAO } from "../../hooks/useDAO";
import { CreateVotingModal } from "../../components/Voting/CreateVotingModal";
import { ProposalModal } from "../../components/Voting/ProposalModal";
import { VotingModal } from "../../components/Vygdrasil/VotingModal";
import { DAO_CONTRACT_ADDRESS } from "../../lib/daoConfig";
import { Pagination } from "../../components/ppage/Pagination";
import { useLanguage } from "../../context/LanguageContext";

const ITEMS_PER_PAGE = 10;

// Proposal status style helper
function getProposalStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    converted: "bg-purple-500/20 text-purple-400",
  };
  return styles[status] || "bg-gray-500/20 text-gray-400";
}

// Proposal status label helper (returns translation key)
function getProposalStatusKey(status: string): string {
  const keys: Record<string, string> = {
    pending: "voting.pending",
    approved: "voting.approved",
    rejected: "voting.rejected",
    converted: "voting.approved",
    all: "common.all",
  };
  return keys[status] || status;
}

// Number format helper (abbreviate large numbers)
function formatNumber(value: bigint | number): string {
  const num = typeof value === "bigint" ? Number(value) : value;
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toFixed(0);
}

type CategoryType = "mainstream" | "stream";
type VotingStatus = "ongoing" | "ended" | "revote" | "deleted";
type ViewMode = "story" | "dao";

// Mainstream game list (official games)
const MAINSTREAM_GAMES = [
  { id: "vygddrasil", name: "Vygddrasil", color: "purple" },
  { id: "vpunk", name: "VPunk", color: "pink" },
  { id: "obfuscate", name: "Obfuscate", color: "cyan" },
];

export default function VotingPage() {
  const { wallet } = useWallet();
  const { votingPower } = useDAO();
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<VotingSessionWithOptions[]>([]);
  const [categoryType, setCategoryType] = useState<CategoryType>("mainstream");
  const [selectedGame, setSelectedGame] = useState<string>("vygddrasil");
  const [selectedStatus, setSelectedStatus] = useState<VotingStatus>("ongoing");
  const [viewMode, setViewMode] = useState<ViewMode>("story");

  // Treasury: vtdn_balance (based on approved proposal count)
  const [vtdnBalance, setVtdnBalance] = useState<number>(0);

  // User created game list (Stream table)
  const [userCreatedGames, setUserCreatedGames] = useState<{ id: number; title: string }[]>([]);

  // Vote creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  // Proposal modal
  const [showProposalModal, setShowProposalModal] = useState(false);
  // Vote detail modal
  const [selectedSession, setSelectedSession] = useState<VotingSessionWithOptions | null>(null);
  const [showVotingModal, setShowVotingModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // DAO proposals (Supabase proposals table)
  const [daoProposals, setDaoProposals] = useState<Proposal[]>([]);
  const [selectedProposalStatus, setSelectedProposalStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Proposal statistics (total / approved / rejected)
  const proposalStats = {
    total: daoProposals.length,
    approved: daoProposals.filter((p) => p.status === "approved" || p.status === "converted").length,
    rejected: daoProposals.filter((p) => p.status === "rejected").length,
  };

  // Admin/Operator permission
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingProposalId, setProcessingProposalId] = useState<number | null>(null);

  // Approval modal (voting duration selection)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveTargetProposal, setApproveTargetProposal] = useState<Proposal | null>(null);
  const [durationMode, setDurationMode] = useState<"preset" | "custom">("preset");
  const [selectedPreset, setSelectedPreset] = useState<number>(7);
  const [customDays, setCustomDays] = useState<number>(0);
  const [customHours, setCustomHours] = useState<number>(0);
  const [customMinutes, setCustomMinutes] = useState<number>(30);

  // Calculate total minutes
  const getTotalMinutes = () => {
    if (durationMode === "preset") {
      return selectedPreset * 24 * 60;
    }
    return customDays * 24 * 60 + customHours * 60 + customMinutes;
  };

  // Duration display string
  const getDurationText = () => {
    const totalMin = getTotalMinutes();
    const days = Math.floor(totalMin / (24 * 60));
    const hours = Math.floor((totalMin % (24 * 60)) / 60);
    const mins = totalMin % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}일`);
    if (hours > 0) parts.push(`${hours}시간`);
    if (mins > 0) parts.push(`${mins}분`);
    return parts.length > 0 ? parts.join(" ") : "0분";
  };

  // Stage list (slug -> title, id -> title mapping)
  const [stageMap, setStageMap] = useState<Map<string, string>>(new Map());
  const [stageIdMap, setStageIdMap] = useState<Map<number, string>>(new Map());

  // DAO contract activation status
  const isDAOActive = DAO_CONTRACT_ADDRESS.toLowerCase() !== "0x0000000000000000000000000000000000000000";

  // Load user created game list and stage list
  useEffect(() => {
    VotingService.getUserCreatedGames().then(setUserCreatedGames);
    VotingService.getStages().then((stages) => {
      const slugMap = new Map<string, string>();
      const idMap = new Map<number, string>();
      stages.forEach((s) => {
        slugMap.set(s.slug, s.title || s.slug);
        idMap.set(s.id, s.title || s.slug);
      });
      setStageMap(slugMap);
      setStageIdMap(idMap);
    });
  }, []);

  // Admin permission check
  useEffect(() => {
    const checkAdmin = async () => {
      if (!wallet?.address) {
        setIsAdmin(false);
        return;
      }
      const adminStatus = await VotingService.isAdmin(wallet.address);
      setIsAdmin(adminStatus);
    };
    checkAdmin();
  }, [wallet?.address]);

  // Load DAO proposals
  const loadDaoProposals = useCallback(async () => {
    try {
      // Load all proposals for statistics
      const allData = await VotingService.getAllProposals(undefined, wallet?.address);
      setDaoProposals(allData);

      // Calculate vtdn_balance: approved proposal count (approved + converted)
      const approvedCount = allData.filter((p) => p.status === "approved" || p.status === "converted").length;
      setVtdnBalance(approvedCount);
    } catch (error) {
      console.error("Error loading DAO proposals:", error);
    }
  }, [wallet?.address]);

  useEffect(() => {
    if (viewMode === "dao") {
      loadDaoProposals();
    }
  }, [viewMode, loadDaoProposals]);

  // Load voting sessions by game (optimized: single call for all data)
  const loadSessions = useCallback(async () => {
    try {
      const gameSessions = await VotingService.getSessionsByGame(selectedGame, wallet?.address);
      setSessions(gameSessions);
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("투표 목록을 불러오는데 실패했습니다");
    }
  }, [wallet?.address, selectedGame]);

  useEffect(() => {
    loadSessions();

    // Real-time polling: refresh every 10 seconds
    const interval = setInterval(() => {
      loadSessions();
    }, 10000);

    return () => clearInterval(interval);
  }, [loadSessions]);

  // Vote creation permission check
  useEffect(() => {
    const checkPermission = async () => {
      if (!wallet?.address) {
        setCanCreate(false);
        return;
      }
      console.log("[DEBUG] Checking permission for:", wallet.address, "game:", selectedGame);
      const hasPermission = await VotingService.canCreateVoting(selectedGame, wallet.address);
      console.log("[DEBUG] canCreate result:", hasPermission);
      setCanCreate(hasPermission);
    };
    checkPermission();
  }, [wallet?.address, selectedGame]);

  // Select first game when category changes
  useEffect(() => {
    if (categoryType === "mainstream") {
      setSelectedGame(MAINSTREAM_GAMES[0].id);
    } else if (userCreatedGames.length > 0) {
      setSelectedGame(`stream_${userCreatedGames[0].id}`);
    }
  }, [categoryType, userCreatedGames]);

  const getTimeRemaining = (endTime: string) => {
    // Fix timezone: ensure end_time is parsed as UTC
    const endTimeStr = endTime.endsWith('Z') ? endTime : endTime + 'Z';
    const end = new Date(endTimeStr).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return "종료됨";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}일 ${hours}시간`;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    return `${minutes}분`;
  };

  const isVotingEnded = (endTime: string) => {
    // Fix timezone: ensure end_time is parsed as UTC
    const endTimeStr = endTime.endsWith('Z') ? endTime : endTime + 'Z';
    return new Date(endTimeStr) < new Date();
  };

  // Open approval modal
  const openApproveModal = (proposal: Proposal) => {
    setApproveTargetProposal(proposal);
    setDurationMode("preset");
    setSelectedPreset(7);
    setCustomDays(0);
    setCustomHours(0);
    setCustomMinutes(30);
    setShowApproveModal(true);
  };

  // Execute proposal approval (called from modal)
  const handleApproveConfirm = async () => {
    if (!approveTargetProposal || !wallet?.address || !isAdmin) return;

    const totalMinutes = getTotalMinutes();
    if (totalMinutes <= 0) {
      toast.error("Please set the voting period");
      return;
    }

    setProcessingProposalId(approveTargetProposal.id);
    setShowApproveModal(false);

    try {
      const result = await VotingService.updateProposalStatus(approveTargetProposal.id, "approved", undefined, totalMinutes);
      if (result.success) {
        if (result.sessionId) {
          toast.success(`Proposal approved! Voting will run for ${getDurationText()}`);
          loadSessions();
        } else {
          toast.success("Proposal approved (no stage specified)");
        }
        await loadDaoProposals();
      } else {
        toast.error(result.error || "Processing failed");
      }
    } finally {
      setProcessingProposalId(null);
      setApproveTargetProposal(null);
    }
  };

  // Proposal rejection handler (admin only)
  const handleRejectProposal = async (proposalId: number) => {
    if (!wallet?.address || !isAdmin) {
      toast.error("Admin permission required");
      return;
    }
    if (processingProposalId !== null) return;

    setProcessingProposalId(proposalId);
    try {
      const result = await VotingService.updateProposalStatus(proposalId, "rejected");
      if (result.success) {
        toast.success("Proposal rejected");
        await loadDaoProposals();
      } else {
        toast.error(result.error || "Processing failed");
      }
    } finally {
      setProcessingProposalId(null);
    }
  };

  // Proposal upvote/downvote handler
  const [votingProposalId, setVotingProposalId] = useState<number | null>(null);
  const handleProposalVote = async (proposalId: number, voteType: "up" | "down") => {
    if (!wallet?.address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (votingProposalId !== null) return;

    setVotingProposalId(proposalId);
    try {
      const result = await VotingService.voteOnProposal(proposalId, wallet.address, voteType);
      if (result.success) {
        toast.success(voteType === "up" ? "Upvoted" : "Downvoted");
        await loadDaoProposals();
      } else {
        toast.error("Vote failed");
      }
    } catch {
      toast.error("Error occurred while voting");
    } finally {
      setVotingProposalId(null);
    }
  };

  // filter
  const filteredSessions = sessions.filter((session) => {
    const isEnded = isVotingEnded(session.end_time);
    const isDeleted = session.is_deleted === true;
    const needsRevote = session.needsRevote === true;
    const hasWinner = session.winningOptionId !== undefined;

    if (selectedStatus === "deleted") {
      return isDeleted;
    }
    if (selectedStatus === "revote") {
      // 시간 종료 + 재투표 필요 + 삭제되지 않음
      return isEnded && needsRevote && !isDeleted;
    }
    if (selectedStatus === "ongoing") {
      return !isEnded && !isDeleted;
    }
    // ended - 시간 종료 + 승자 결정됨 + 삭제되지 않음 (재투표 필요 제외)
    return isEnded && hasWinner && !needsRevote && !isDeleted;
  });

  // DAO proposals filter - filter by selected game + status
  const filteredDaoProposals = daoProposals.filter((p) => {
    // Game filter
    if (p.game_id !== selectedGame) return false;

    // Status filter
    if (selectedProposalStatus === "all") return true;
    if (selectedProposalStatus === "approved") {
      // Both approved and converted are displayed as "approved"
      return p.status === "approved" || p.status === "converted";
    }
    return p.status === selectedProposalStatus;
  });

  // Apply pagination
  const paginatedSessions = filteredSessions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedDaoProposals = filteredDaoProposals.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filter/status changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedGame, viewMode, selectedProposalStatus]);

  const handleSessionClick = (session: VotingSessionWithOptions) => {
    setSelectedSession(session);
    setShowVotingModal(true);
  };

  const handleVoteComplete = (winningChoiceId?: number) => {
    setShowVotingModal(false);
    loadSessions();
    if (winningChoiceId) {
      toast.success("Vote result has been applied!");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8 pt-24">
      <ToastContainer />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">{t("voting.title")}</h1>
          <p className="text-gray-400">{t("voting.subtitle")}</p>
          <div className="flex justify-center gap-2 mt-4"></div>
        </div>

        {/* View Mode Toggle (Story vs DAO) */}
        {isDAOActive && (
          <div className="flex justify-center gap-4 mb-8">
            <button onClick={() => setViewMode("story")} className={`px-6 py-3 rounded-lg font-semibold transition-all ${viewMode === "story" ? "bg-purple-600 text-white" : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"}`}>
              Vote
            </button>
            <button onClick={() => setViewMode("dao")} className={`px-6 py-3 rounded-lg font-semibold transition-all ${viewMode === "dao" ? "bg-blue-600 text-white" : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"}`}>
              Proposal
            </button>
          </div>
        )}

        {/* DAO Stats (only in DAO mode) */}
        {viewMode === "dao" && isDAOActive && (
          <div className="grid grid-cols-2 gap-4 mb-8 px-20">
            {/* Treasury: vtdn_balance (based on approved proposal count) */}
            <div className="bg-gray-800/80 rounded-xl p-4 text-center border border-gray-700">
              <p className="text-gray-400 text-sm">{t("voting.treasury")}</p>
              <p className="text-2xl font-bold text-green-400">{vtdnBalance}</p>
            </div>

            {/* Proposal statistics: total / approved / rejected */}
            <div className="bg-gray-800/80 rounded-xl text-center border border-gray-700 p-4">
              <div className="flex items-center justify-center gap-3 mt-1">
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{proposalStats.total}</p>
                  <p className="text-gray-500 text-xs">{t("voting.proposalCount")}</p>
                </div>
                <div className="text-gray-600">/</div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-400">{proposalStats.approved}</p>
                  <p className="text-gray-500 text-xs">{t("voting.approvedCount")}</p>
                </div>
                <div className="text-gray-600">/</div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-400">{proposalStats.rejected}</p>
                  <p className="text-gray-500 text-xs">{t("voting.rejectedCount")}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Story View */}
        {viewMode === "story" && (
          <>
            {/* Category & Game Selection */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              {/* Category Dropdown (Mainstream / Stream) */}
              <div className="flex items-center gap-3">
                <select value={categoryType} onChange={(e) => setCategoryType(e.target.value as CategoryType)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-semibold focus:outline-none focus:border-purple-500">
                  <option value="mainstream">Mainstream</option>
                  <option value="stream">Stream</option>
                </select>

                {/* Game Dropdown */}
                <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 min-w-[180px]">
                  {categoryType === "mainstream" ? (
                    MAINSTREAM_GAMES.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.name}
                      </option>
                    ))
                  ) : userCreatedGames.length > 0 ? (
                    userCreatedGames.map((game) => (
                      <option key={game.id} value={`stream_${game.id}`}>
                        {game.title}
                      </option>
                    ))
                  ) : (
                    <option value="">{t("voting.noUserGames")}</option>
                  )}
                </select>

                {/* Status Filter */}
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as VotingStatus)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500">
                  <option value="ongoing">{t("voting.ongoing")}</option>
                  <option value="ended">{t("voting.ended")}</option>
                  <option value="revote">{t("voting.revoteNeeded") || "재투표 필요"}</option>
                  <option value="deleted">{t("voting.deleted") || "취소됨"}</option>
                </select>
              </div>

              {/* Action Buttons */}
              {wallet?.address && (
                <div className="flex gap-2">
                  <button onClick={() => setShowProposalModal(true)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    {t("voting.proposal")}
                  </button>
                  <div className="relative group">
                    <button
                      onClick={() => canCreate && setShowCreateModal(true)}
                      disabled={!canCreate}
                      className={`px-4 py-2 font-semibold rounded-lg transition-all flex items-center gap-2 ${
                        canCreate
                          ? "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                          : "bg-gray-600 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      {t("voting.createVoting")}
                    </button>
                    {!canCreate && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-gray-300 text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-gray-700">
                        {t("voting.noPermission")}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Voting Table */}
            <div className="bg-gray-800/80 rounded-2xl border border-gray-700 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-900/50 border-b border-gray-700 text-gray-400 text-sm font-semibold">
                <div className="col-span-4">{t("voting.titleColumn")}</div>
                <div className="col-span-2 text-center">{t("voting.stage")}</div>
                <div className="col-span-2 text-center">{t("voting.participation")}</div>
                <div className="col-span-2 text-center">{t("voting.status")}</div>
                <div className="col-span-2 text-center">{t("voting.remaining")}</div>
              </div>

              {/* Table Body */}
              {filteredSessions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  {selectedStatus === "ongoing"
                    ? t("voting.noOngoing")
                    : selectedStatus === "revote"
                    ? (t("voting.noRevote") || "재투표가 필요한 투표가 없습니다")
                    : selectedStatus === "deleted"
                    ? (t("voting.noDeleted") || "취소된 투표가 없습니다")
                    : t("voting.noEnded")}
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {paginatedSessions.map((session) => {
                    const ended = isVotingEnded(session.end_time);
                    const userVoted = session.userVote !== undefined;
                    const hasWinner = session.winningOptionId !== undefined;
                    const isDeleted = session.is_deleted === true;

                    return (
                      <div key={session.id} onClick={() => handleSessionClick(session)} className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-700/30 cursor-pointer transition-all">
                        {/* Title */}
                        <div className="col-span-4 flex items-center gap-2">
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${isDeleted ? "text-gray-500 line-through" : "text-white"}`}>{session.title}</p>
                            {session.description && <p className="text-gray-500 text-sm truncate">{session.description}</p>}
                          </div>
                          {session.isOnChain && <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full shrink-0">{t("voting.onchain")}</span>}
                          {userVoted && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full shrink-0">{t("voting.voted")}</span>}
                        </div>

                        {/* Stage */}
                        <div className="col-span-2 flex items-center justify-center">
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full truncate">{stageIdMap.get(session.stage_id) || "-"}</span>
                        </div>

                        {/* Participation (unique wallets) */}
                        <div className="col-span-2 flex items-center justify-center">
                          <span className="text-white font-bold">{session.totalVotes}</span>
                          <span className="text-gray-500 text-sm ml-1">/ {session.eligibleVoters || "?"}</span>
                        </div>

                        {/* Status */}
                        <div className="col-span-2 flex items-center justify-center">
                          {isDeleted ? (
                            <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full font-semibold">{t("voting.deleted") || "취소됨"}</span>
                          ) : ended ? (
                            hasWinner ? (
                              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-semibold">{t("voting.decided")}</span>
                            ) : session.needsRevote ? (
                              <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">{t("voting.revoteNeeded")}</span>
                            ) : (
                              <span className="px-3 py-1 bg-gray-600/50 text-gray-400 text-xs rounded-full font-semibold">{t("voting.ended")}</span>
                            )
                          ) : (
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold">{t("voting.ongoing")}</span>
                          )}
                        </div>

                        {/* Time Remaining */}
                        <div className="col-span-2 flex items-center justify-center">
                          <span className={`font-medium text-sm ${ended || isDeleted ? "text-gray-500" : "text-white"}`}>
                            {isDeleted ? "-" : getTimeRemaining(session.end_time)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination for Story */}
            {filteredSessions.length > ITEMS_PER_PAGE && (
              <div className="mt-6">
                <Pagination totalItems={filteredSessions.length} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} setCurrentPage={setCurrentPage} variant="dark" />
              </div>
            )}
          </>
        )}

        {/* DAO Proposals View */}
        {viewMode === "dao" && (
          <>
            {/* Category & Status Filter for DAO */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                {/* Category Dropdown (Mainstream / Stream) */}
                <select value={categoryType} onChange={(e) => setCategoryType(e.target.value as CategoryType)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-semibold focus:outline-none focus:border-purple-500">
                  <option value="mainstream">Mainstream</option>
                  <option value="stream">Stream</option>
                </select>

                {/* Game Dropdown */}
                <select value={selectedGame} onChange={(e) => setSelectedGame(e.target.value)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 min-w-[180px]">
                  {categoryType === "mainstream" ? (
                    MAINSTREAM_GAMES.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.name}
                      </option>
                    ))
                  ) : userCreatedGames.length > 0 ? (
                    userCreatedGames.map((game) => (
                      <option key={game.id} value={`stream_${game.id}`}>
                        {game.title}
                      </option>
                    ))
                  ) : (
                    <option value="">{t("voting.noUserGames")}</option>
                  )}
                </select>

                {/* Status Filter */}
                <select value={selectedProposalStatus} onChange={(e) => setSelectedProposalStatus(e.target.value as typeof selectedProposalStatus)} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500">
                  <option value="all">{t("common.all")}</option>
                  <option value="pending">{t("voting.pending")}</option>
                  <option value="approved">{t("voting.approved")}</option>
                  <option value="rejected">{t("voting.rejected")}</option>
                </select>
              </div>

              {/* Action Button */}
              {wallet?.address && (
                <button onClick={() => setShowProposalModal(true)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  {t("voting.proposal")}
                </button>
              )}
            </div>

            {/* Proposals Table */}
            <div className="bg-gray-800/80 rounded-2xl border border-gray-700 overflow-hidden overflow-x-auto">
              {/* Table Header */}
              <div className="flex items-center gap-4 p-4 bg-gray-900/50 border-b border-gray-700 text-gray-400 text-sm font-semibold min-w-[900px]">
                <div className="w-[180px] shrink-0">{t("voting.titleColumn")}</div>
                <div className="w-[100px] shrink-0 text-center">{t("voting.stage")}</div>
                <div className="flex-1 min-w-[150px]">{t("voting.proposalContent")}</div>
                <div className="w-[100px] shrink-0 text-center">{t("voting.upvoteDownvote")}</div>
                <div className="w-[90px] shrink-0 text-center">{t("voting.proposalDate")}</div>
                <div className="w-[180px] shrink-0 text-center">{isAdmin ? t("voting.statusAdmin") : t("voting.status")}</div>
              </div>

              {/* Table Body */}
              {filteredDaoProposals.length === 0 ? (
                <div className="p-12 text-center text-gray-500">{selectedProposalStatus === "all" ? t("voting.noProposals") : `${t(getProposalStatusKey(selectedProposalStatus))} ${t("voting.noProposalsStatus")}`}</div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {paginatedDaoProposals.map((proposal) => (
                    <div key={proposal.id} className="flex items-center gap-4 p-4 hover:bg-gray-700/30 transition-all min-w-[900px]">
                      {/* Title */}
                      <div className="w-[180px] shrink-0">
                        <p className="text-white font-medium text-sm truncate">{proposal.title}</p>
                        <p className="text-gray-600 text-xs mt-1">
                          {proposal.proposer_wallet.slice(0, 6)}...{proposal.proposer_wallet.slice(-4)}
                        </p>
                      </div>

                      {/* Stage */}
                      <div className="w-[100px] shrink-0 flex justify-center">{proposal.stage_slug ? <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full truncate">{stageMap.get(proposal.stage_slug) || proposal.stage_slug}</span> : <span className="text-gray-600 text-xs">-</span>}</div>

                      {/* Description */}
                      <div className="flex-1 min-w-[150px]">
                        <p className="text-gray-400 text-sm truncate">{proposal.description || "-"}</p>
                      </div>

                      {/* Votes - clickable buttons */}
                      <div className="w-[100px] shrink-0 flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProposalVote(proposal.id, "up");
                          }}
                          disabled={votingProposalId === proposal.id || proposal.userVote === "up"}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${proposal.userVote === "up" ? "bg-green-500/30 text-green-300 cursor-default" : votingProposalId === proposal.id ? "text-gray-500 cursor-wait" : "text-green-400 hover:bg-green-500/20 cursor-pointer"}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 19V5M5 12l7-7 7 7" />
                          </svg>
                          {proposal.upvotes}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProposalVote(proposal.id, "down");
                          }}
                          disabled={votingProposalId === proposal.id || proposal.userVote === "down"}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${proposal.userVote === "down" ? "bg-red-500/30 text-red-300 cursor-default" : votingProposalId === proposal.id ? "text-gray-500 cursor-wait" : "text-red-400 hover:bg-red-500/20 cursor-pointer"}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12l7 7 7-7" />
                          </svg>
                          {proposal.downvotes}
                        </button>
                      </div>

                      {/* Date */}
                      <div className="w-[90px] shrink-0 flex justify-center">
                        <span className="text-gray-400 text-xs">{new Date(proposal.created_at).toLocaleDateString("ko-KR")}</span>
                      </div>

                      {/* Status & Admin Actions */}
                      <div className="w-[180px] shrink-0 flex items-center justify-center gap-2">
                        <span className={`px-3 py-1 text-xs rounded-full font-semibold ${getProposalStatusStyle(proposal.status)}`}>{t(getProposalStatusKey(proposal.status))}</span>
                        {isAdmin && proposal.status === "pending" && (
                          <>
                            <button onClick={() => openApproveModal(proposal)} disabled={processingProposalId === proposal.id} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${processingProposalId === proposal.id ? "bg-gray-600 text-gray-400 cursor-wait" : "bg-green-500/20 text-green-400 hover:bg-green-500/40"}`}>
                              {t("voting.approve")}
                            </button>
                            <button onClick={() => handleRejectProposal(proposal.id)} disabled={processingProposalId === proposal.id} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${processingProposalId === proposal.id ? "bg-gray-600 text-gray-400 cursor-wait" : "bg-red-500/20 text-red-400 hover:bg-red-500/40"}`}>
                              {t("voting.reject")}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination for DAO */}
            {filteredDaoProposals.length > ITEMS_PER_PAGE && (
              <div className="mt-6">
                <Pagination totalItems={filteredDaoProposals.length} itemsPerPage={ITEMS_PER_PAGE} currentPage={currentPage} setCurrentPage={setCurrentPage} variant="dark" />
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        <div className="mt-12 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
          <h3 className="text-base font-semibold text-white mb-3">{t("voting.votingGuide")}</h3>
          <ul className="text-gray-400 space-y-2 text-sm">
            <li className="text-yellow-400 font-semibold">{t("voting.guide1")}</li>
            <li className="text-green-400">{t("voting.guide2")}</li>
            <li>{t("voting.guide3")}</li>
            <li>{t("voting.guide4")}</li>
            <li>{t("voting.guide5")}</li>
            <li>{t("voting.guide6")}</li>
          </ul>

          {/* DAO Info */}
          {isDAOActive && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <h4 className="text-sm font-semibold text-white mb-2">{t("voting.daoContract")}</h4>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs font-mono break-all">{DAO_CONTRACT_ADDRESS}</p>
                <div className="mt-2 flex gap-4">
                  <div>
                    <span className="text-gray-500 text-xs">{t("voting.votingPeriod")}:</span>
                    <span className="text-white text-xs ml-2">{t("voting.threeDays")}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">{t("voting.proposalRequirement")}:</span>
                    <span className="text-white text-xs ml-2">{t("voting.minVery")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vote creation modal */}
      {wallet?.address && <CreateVotingModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} gameId={selectedGame} walletAddress={wallet.address} onCreated={loadSessions} />}

      {/* Proposal modal */}
      {wallet?.address && <ProposalModal isOpen={showProposalModal} onClose={() => setShowProposalModal(false)} gameId={selectedGame} walletAddress={wallet.address} onCreated={loadSessions} />}

      {/* Vote detail modal */}
      {selectedSession && wallet?.address && <VotingModal isOpen={showVotingModal} onClose={() => setShowVotingModal(false)} session={selectedSession} walletAddress={wallet.address} onVoteComplete={handleVoteComplete} />}

      {/* Approval modal (voting duration selection) */}
      {showApproveModal && approveTargetProposal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">{t("voting.approveConfirm")}</h3>

            <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
              <p className="text-white font-medium">{approveTargetProposal.title}</p>
              <p className="text-gray-400 text-sm mt-1">{approveTargetProposal.description || "-"}</p>
            </div>

            {/* Mode selection tabs */}
            <div className="flex mb-4 bg-gray-700/50 rounded-lg p-1">
              <button onClick={() => setDurationMode("preset")} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${durationMode === "preset" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>
                {t("voting.preset")}
              </button>
              <button onClick={() => setDurationMode("custom")} className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${durationMode === "custom" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>
                {t("voting.custom")}
              </button>
            </div>

            {/* Preset mode */}
            {durationMode === "preset" && (
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-2">{t("voting.selectDuration")}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 7, 14].map((days) => (
                    <button key={days} onClick={() => setSelectedPreset(days)} className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all ${selectedPreset === days ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                      {days}{t("voting.days")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom mode */}
            {durationMode === "custom" && (
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-2">{t("voting.customDuration")}</label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Days */}
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">{t("voting.days")}</label>
                    <select value={customDays} onChange={(e) => setCustomDays(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                      {Array.from({ length: 31 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Hours */}
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">{t("voting.hours")}</label>
                    <select value={customHours} onChange={(e) => setCustomHours(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Minutes */}
                  <div>
                    <label className="block text-gray-500 text-xs mb-1">{t("voting.minutes")}</label>
                    <select value={customMinutes} onChange={(e) => setCustomMinutes(Number(e.target.value))} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500">
                      {[0, 1, 2, 3, 4, 5, 10, 15, 20, 30, 35, 40, 45, 50, 55].map((min) => (
                        <option key={min} value={min}>
                          {min}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Display configured duration */}
                <p className="text-center text-purple-400 text-sm mt-3">
                  {t("voting.setting")}: <span className="font-semibold">{getDurationText()}</span>
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setApproveTargetProposal(null);
                }}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
              >
                {t("common.cancel")}
              </button>
              <button onClick={handleApproveConfirm} disabled={getTotalMinutes() <= 0} className={`flex-1 py-2 font-semibold rounded-lg transition-all ${getTotalMinutes() > 0 ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-600 text-gray-400 cursor-not-allowed"}`}>
                {getDurationText()} {t("voting.startVoting")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
