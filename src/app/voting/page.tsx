"use client";

import { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import { VotingService, VotingSessionWithOptions } from "../../services/voting.service";
import { useDAO, FormattedProposal } from "../../hooks/useDAO";
import { CreateVotingModal } from "../../components/Voting/CreateVotingModal";
import { ProposalModal } from "../../components/Voting/ProposalModal";
import { VotingModal } from "../../components/Vygdrasil/VotingModal";
import {
  ProposalState,
  getProposalStateLabel,
  getProposalStateColor,
  getProposalStateBg,
  formatVotes,
  formatTimeRemaining,
  DAO_CONTRACT_ADDRESS,
} from "../../lib/daoConfig";

type CategoryType = "mainstream" | "stream";
type VotingStatus = "ongoing" | "ended";
type ViewMode = "story" | "dao";

// Mainstream 게임 목록 (공식 게임)
const MAINSTREAM_GAMES = [
  { id: "vygddrasil", name: "Vygddrasil", color: "purple" },
  { id: "vpunk", name: "VPunk", color: "pink" },
  { id: "obfuscate", name: "Obfuscate", color: "cyan" },
];

export default function VotingPage() {
  const { wallet } = useWallet();
  const { proposals, loading: daoLoading, treasuryBalance, votingPower } = useDAO();
  const [sessions, setSessions] = useState<VotingSessionWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryType, setCategoryType] = useState<CategoryType>("mainstream");
  const [selectedGame, setSelectedGame] = useState<string>("vygddrasil");
  const [selectedStatus, setSelectedStatus] = useState<VotingStatus>("ongoing");
  const [viewMode, setViewMode] = useState<ViewMode>("story");

  // 유저 생성 게임 목록 (Stream 테이블)
  const [userCreatedGames, setUserCreatedGames] = useState<{ id: number; title: string }[]>([]);

  // 투표 생성 모달
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  // 제안 모달
  const [showProposalModal, setShowProposalModal] = useState(false);
  // 투표 상세 모달
  const [selectedSession, setSelectedSession] = useState<VotingSessionWithOptions | null>(null);
  const [showVotingModal, setShowVotingModal] = useState(false);

  // DAO 컨트랙트 활성화 여부
  const isDAOActive = DAO_CONTRACT_ADDRESS.toLowerCase() !== "0x0000000000000000000000000000000000000000";

  // 유저 생성 게임 목록 로드
  useEffect(() => {
    VotingService.getUserCreatedGames().then(setUserCreatedGames);
  }, []);

  // 게임별 투표 세션 로드
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const gameSessions = await VotingService.getSessionsByGame(selectedGame);

      if (wallet?.address) {
        const sessionsWithUserVote = await Promise.all(
          gameSessions.map(async (session) => {
            const detailed = await VotingService.getSessionById(session.id, wallet.address);
            return detailed || session;
          })
        );
        setSessions(sessionsWithUserVote);
      } else {
        setSessions(gameSessions);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("투표 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  }, [wallet?.address, selectedGame]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // 투표 생성 권한 체크
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

  // 카테고리 변경 시 첫 번째 게임 선택
  useEffect(() => {
    if (categoryType === "mainstream") {
      setSelectedGame(MAINSTREAM_GAMES[0].id);
    } else if (userCreatedGames.length > 0) {
      setSelectedGame(`stream_${userCreatedGames[0].id}`);
    }
  }, [categoryType, userCreatedGames]);

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime();
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
    return new Date(endTime) < new Date();
  };

  // filter
  const filteredSessions = sessions.filter((session) => {
    const isEnded = isVotingEnded(session.end_time);
    return selectedStatus === "ongoing" ? !isEnded : isEnded;
  });

  // DAO proposals filter
  const filteredProposals = proposals.filter((p) => {
    if (selectedStatus === "ongoing") {
      return p.state === ProposalState.Active || p.state === ProposalState.Pending;
    } else {
      return p.state !== ProposalState.Active && p.state !== ProposalState.Pending;
    }
  });

  const handleSessionClick = (session: VotingSessionWithOptions) => {
    setSelectedSession(session);
    setShowVotingModal(true);
  };

  const handleVoteComplete = (winningChoiceId?: number) => {
    setShowVotingModal(false);
    loadSessions();
    if (winningChoiceId) {
      toast.success("투표 결과가 반영되었습니다!");
    }
  };

  if (loading || daoLoading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex justify-center items-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8 pt-24">
      <ToastContainer />
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">DAO Voting</h1>
          <p className="text-gray-400">게임 세계의 운명을 투표로 결정하세요</p>
          <div className="flex justify-center gap-2 mt-4">
            {isDAOActive && (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/50">
                VeryDAOIntegrated 활성
              </span>
            )}
            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/50">
              VERY 잔액 기준 투표권
            </span>
          </div>
        </div>

        {/* View Mode Toggle (Story vs DAO) */}
        {isDAOActive && (
          <div className="flex justify-center gap-4 mb-8">
            <button
              onClick={() => setViewMode("story")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                viewMode === "story"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
              }`}
            >
              스토리 투표
            </button>
            <button
              onClick={() => setViewMode("dao")}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                viewMode === "dao"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
              }`}
            >
              DAO 프로포절
            </button>
          </div>
        )}

        {/* DAO Stats (only in DAO mode) */}
        {viewMode === "dao" && isDAOActive && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800/80 rounded-xl p-4 text-center border border-gray-700">
              <p className="text-gray-400 text-sm">트레저리 잔액</p>
              <p className="text-2xl font-bold text-green-400">{formatVotes(treasuryBalance)}</p>
            </div>
            <div className="bg-gray-800/80 rounded-xl p-4 text-center border border-gray-700">
              <p className="text-gray-400 text-sm">내 투표권</p>
              <p className="text-2xl font-bold text-purple-400">{formatVotes(votingPower)}</p>
            </div>
            <div className="bg-gray-800/80 rounded-xl p-4 text-center border border-gray-700">
              <p className="text-gray-400 text-sm">총 프로포절</p>
              <p className="text-2xl font-bold text-white">{proposals.length}</p>
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
                <select
                  value={categoryType}
                  onChange={(e) => setCategoryType(e.target.value as CategoryType)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="mainstream">Mainstream</option>
                  <option value="stream">Stream</option>
                </select>

                {/* Game Dropdown */}
                <select
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500 min-w-[180px]"
                >
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
                    <option value="">유저 생성 게임 없음</option>
                  )}
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as VotingStatus)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="ongoing">진행중</option>
                  <option value="ended">종료됨</option>
                </select>
              </div>

              {/* Action Buttons */}
              {wallet?.address && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowProposalModal(true)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    제안
                  </button>
                  {canCreate && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      투표 생성
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Voting Table */}
            <div className="bg-gray-800/80 rounded-2xl border border-gray-700 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-900/50 border-b border-gray-700 text-gray-400 text-sm font-semibold">
                <div className="col-span-5">제목</div>
                <div className="col-span-2 text-center">총 투표</div>
                <div className="col-span-2 text-center">상태</div>
                <div className="col-span-3 text-center">남은 시간</div>
              </div>

              {/* Table Body */}
              {filteredSessions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  {selectedStatus === "ongoing" ? "진행 중인 투표가 없습니다" : "종료된 투표가 없습니다"}
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {filteredSessions.map((session) => {
                    const ended = isVotingEnded(session.end_time);
                    const userVoted = session.userVote !== undefined;
                    const hasWinner = session.winningOptionId !== undefined;

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSessionClick(session)}
                        className="grid grid-cols-12 gap-4 p-4 hover:bg-gray-700/30 cursor-pointer transition-all"
                      >
                        {/* Title */}
                        <div className="col-span-5 flex items-center gap-3">
                          <div>
                            <p className="text-white font-medium">{session.title}</p>
                            {session.description && (
                              <p className="text-gray-500 text-sm truncate max-w-xs">{session.description}</p>
                            )}
                          </div>
                          {session.isOnChain && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                              온체인
                            </span>
                          )}
                          {userVoted && (
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                              투표함
                            </span>
                          )}
                        </div>

                        {/* Total Votes */}
                        <div className="col-span-2 flex items-center justify-center">
                          <span className="text-white font-bold">{session.totalVotes}</span>
                          <span className="text-gray-500 text-sm ml-1">/ {session.eligibleVoters || "?"}</span>
                        </div>

                        {/* Status */}
                        <div className="col-span-2 flex items-center justify-center">
                          {ended ? (
                            hasWinner ? (
                              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full font-semibold">
                                결정됨
                              </span>
                            ) : session.needsRevote ? (
                              <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">
                                재투표 필요
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-gray-600/50 text-gray-400 text-xs rounded-full font-semibold">
                                종료
                              </span>
                            )
                          ) : (
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold">
                              진행중
                            </span>
                          )}
                        </div>

                        {/* Time Remaining */}
                        <div className="col-span-3 flex items-center justify-center">
                          <span className={`font-medium ${ended ? "text-gray-500" : "text-white"}`}>
                            {getTimeRemaining(session.end_time)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* DAO Proposals View */}
        {viewMode === "dao" && (
          <>
            {/* Status Filter for DAO */}
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => setSelectedStatus("ongoing")}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                  selectedStatus === "ongoing" ? "bg-green-600 text-white" : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
                }`}
              >
                진행중
              </button>
              <button
                onClick={() => setSelectedStatus("ended")}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                  selectedStatus === "ended" ? "bg-gray-600 text-white" : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"
                }`}
              >
                종료됨
              </button>
            </div>

            {filteredProposals.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">{selectedStatus === "ongoing" ? "현재 진행 중인 프로포절이 없습니다" : "종료된 프로포절이 없습니다"}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredProposals.map((proposal) => (
                  <DAOProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        <div className="mt-12 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
          <h3 className="text-base font-semibold text-white mb-3">투표 안내</h3>
          <ul className="text-gray-400 space-y-2 text-sm">
            <li className="text-yellow-400 font-semibold">투표는 게임 플레이 중 해당 선택지에서만 가능합니다</li>
            <li className="text-green-400">온체인 투표: 블록체인에 영구 기록되며 투명하게 검증 가능합니다</li>
            <li>이 페이지에서는 현재 진행 중인 투표 현황을 확인할 수 있습니다</li>
            <li>지갑 주소당 1회 투표 가능합니다</li>
            <li>투표 종료 후 과반수를 득표한 선택지만 게임에서 선택할 수 있습니다</li>
            <li>과반수를 득표하지 못한 경우 재투표가 필요합니다</li>
          </ul>

          {/* DAO Info */}
          {isDAOActive && (
            <div className="mt-6 pt-4 border-t border-gray-700">
              <h4 className="text-sm font-semibold text-white mb-2">VeryDAOIntegrated 컨트랙트</h4>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs font-mono break-all">{DAO_CONTRACT_ADDRESS}</p>
                <div className="mt-2 flex gap-4">
                  <div>
                    <span className="text-gray-500 text-xs">투표 기간:</span>
                    <span className="text-white text-xs ml-2">3일</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">프로포절 생성 조건:</span>
                    <span className="text-white text-xs ml-2">최소 1 VERY 보유</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 투표 생성 모달 */}
      {wallet?.address && (
        <CreateVotingModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          gameId={selectedGame}
          walletAddress={wallet.address}
          onCreated={loadSessions}
        />
      )}

      {/* 제안 모달 */}
      {wallet?.address && (
        <ProposalModal
          isOpen={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          gameId={selectedGame}
          walletAddress={wallet.address}
          onCreated={loadSessions}
        />
      )}

      {/* 투표 상세 모달 */}
      {selectedSession && wallet?.address && (
        <VotingModal
          isOpen={showVotingModal}
          onClose={() => setShowVotingModal(false)}
          session={selectedSession}
          walletAddress={wallet.address}
          onVoteComplete={handleVoteComplete}
        />
      )}
    </div>
  );
}

// DAO Proposal Card Component
function DAOProposalCard({ proposal }: { proposal: FormattedProposal }) {
  const totalVotes = proposal.totalVotes;

  return (
    <div className="bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-700 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-gray-500 text-sm">#{proposal.id}</span>
            <span className={`px-2 py-1 text-xs rounded-full border ${getProposalStateBg(proposal.state)} ${getProposalStateColor(proposal.state)}`}>
              {getProposalStateLabel(proposal.state)}
            </span>
            {proposal.hasVoted && (
              <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/50">
                투표완료
              </span>
            )}
          </div>
          <p className="text-white text-lg">{proposal.description}</p>
          <p className="text-gray-500 text-sm mt-1">
            제안자: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-sm">
            {proposal.isActive ? formatTimeRemaining(BigInt(Math.floor(proposal.endTime.getTime() / 1000))) : "종료됨"}
          </p>
        </div>
      </div>

      {/* Vote Bars */}
      <div className="space-y-3">
        {/* For */}
        <div className="relative rounded-lg overflow-hidden bg-gray-700/50">
          <div
            className="absolute inset-y-0 left-0 bg-green-500/30"
            style={{ width: `${proposal.forPercentage}%` }}
          />
          <div className="relative p-3 flex justify-between items-center">
            <span className="text-green-400 font-semibold">찬성</span>
            <div className="flex items-center gap-3">
              <span className="text-white font-bold">{formatVotes(proposal.forVotes)}</span>
              <span className="text-gray-400 text-sm">({proposal.forPercentage}%)</span>
            </div>
          </div>
        </div>

        {/* Against */}
        <div className="relative rounded-lg overflow-hidden bg-gray-700/50">
          <div
            className="absolute inset-y-0 left-0 bg-red-500/30"
            style={{ width: `${proposal.againstPercentage}%` }}
          />
          <div className="relative p-3 flex justify-between items-center">
            <span className="text-red-400 font-semibold">반대</span>
            <div className="flex items-center gap-3">
              <span className="text-white font-bold">{formatVotes(proposal.againstVotes)}</span>
              <span className="text-gray-400 text-sm">({proposal.againstPercentage}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Total Votes */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
        <span className="text-gray-400 text-sm">총 투표: {formatVotes(totalVotes)}</span>
        <span className="text-gray-500 text-sm">
          {proposal.startTime.toLocaleDateString()} - {proposal.endTime.toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}
