"use client";

import { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import { useWallet } from "../context/WalletContext";
import { VotingService, VotingSessionWithOptions } from "../../services/voting.service";

type Era = "vygddrasil" | "vpunk" | "user-created";
type VotingStatus = "ongoing" | "ended";

export default function VotingPage() {
  const { wallet } = useWallet();
  const [sessions, setSessions] = useState<VotingSessionWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEra, setSelectedEra] = useState<Era>("vygddrasil");
  const [selectedStatus, setSelectedStatus] = useState<VotingStatus>("ongoing");

  // voting load
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const activeSessions = await VotingService.getActiveSessions();

      // voting infor
      if (wallet?.address) {
        const sessionsWithUserVote = await Promise.all(
          activeSessions.map(async (session) => {
            const detailed = await VotingService.getSessionById(session.id, wallet.address);
            return detailed || session;
          })
        );
        setSessions(sessionsWithUserVote);
      } else {
        setSessions(activeSessions);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("투표 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const getTimeRemaining = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return "종료됨";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}일 ${hours}시간 남음`;
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
    return `${minutes}분 남음`;
  };

  const isVotingEnded = (endTime: string) => {
    return new Date(endTime) < new Date();
  };

  // Era
  const eraInfo = {
    vygddrasil: { name: "Vygddrasil", color: "purple" },
    vpunk: { name: "VPunk", color: "pink" },
    "user-created": { name: "User Created", color: "blue" },
  };

  // filter
  const filteredSessions = sessions.filter((session) => {
    const isEnded = isVotingEnded(session.end_time);
    const statusMatch = selectedStatus === "ongoing" ? !isEnded : isEnded;

    return statusMatch;
  });

  if (loading) {
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
        </div>

        {/* Era Selection Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          {(Object.keys(eraInfo) as Era[]).map((era) => {
            const info = eraInfo[era];
            const isSelected = selectedEra === era;
            const colorClasses = {
              purple: isSelected ? "bg-purple-600 text-white border-purple-400" : "bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-gray-300",
              pink: isSelected ? "bg-pink-600 text-white border-pink-400" : "bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-gray-300",
              blue: isSelected ? "bg-blue-600 text-white border-blue-400" : "bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-gray-300",
            };

            return (
              <button key={era} onClick={() => setSelectedEra(era)} className={`px-6 py-3 rounded-lg font-semibold transition-all ${colorClasses[info.color as keyof typeof colorClasses]}`}>
                {info.name}
              </button>
            );
          })}
        </div>

        {/* Ongoing / Ended Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button onClick={() => setSelectedStatus("ongoing")} className={`px-8 py-3 rounded-lg font-semibold transition-all ${selectedStatus === "ongoing" ? "bg-green-600 text-white" : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"}`}>
            Ongoing
          </button>
          <button onClick={() => setSelectedStatus("ended")} className={`px-8 py-3 rounded-lg font-semibold transition-all ${selectedStatus === "ended" ? "bg-gray-600 text-white" : "bg-gray-800/50 text-gray-400 hover:bg-gray-800"}`}>
            Ended
          </button>
        </div>

        {/* Voting Sessions */}
        {filteredSessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">{selectedStatus === "ongoing" ? "현재 진행 중인 투표가 없습니다" : "종료된 투표가 없습니다"}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredSessions.map((session) => {
              const ended = isVotingEnded(session.end_time);
              const userVoted = session.userVote !== undefined;

              return (
                <div key={session.id} className="bg-gray-800/80 backdrop-blur rounded-2xl p-6 border border-gray-700 shadow-xl">
                  {/* Session Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{session.title}</h2>
                      <p className="text-gray-400">{session.description}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-bold ${ended ? "bg-gray-600 text-gray-300" : "bg-green-600/20 text-green-400 border border-green-500"}`}>{ended ? "종료됨" : getTimeRemaining(session.end_time)}</div>
                  </div>

                  {/* Total Votes */}
                  <div className="mb-6 text-center">
                    <span className="text-gray-400">총 투표 수: </span>
                    <span className="text-white font-bold text-xl">{session.totalVotes}</span>
                  </div>

                  {/* Options */}
                  <div className="space-y-4">
                    {session.options.map((option) => {
                      const percentage = session.totalVotes > 0 ? Math.round((option.vote_count / session.totalVotes) * 100) : 0;
                      const isWinner = ended && session.winningOptionId === option.id;
                      const isLoser = ended && session.winningOptionId && session.winningOptionId !== option.id;
                      const isUserVote = session.userVote === option.id;

                      return (
                        <div key={option.id} className={`relative rounded-xl overflow-hidden transition-all ${isLoser ? "opacity-50 grayscale" : isWinner ? "ring-2 ring-yellow-400" : ""}`}>
                          {/* Progress Bar Background */}
                          <div className={`absolute inset-0 transition-all ${isWinner ? "bg-gradient-to-r from-yellow-600/30 to-yellow-500/20" : isLoser ? "bg-gray-700/50" : "bg-gradient-to-r from-purple-600/30 to-blue-500/20"}`} style={{ width: `${percentage}%` }} />

                          {/* Content */}
                          <div className="relative p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {isWinner && <span className="text-2xl">👑</span>}
                              <div>
                                <p className={`font-bold text-lg ${isLoser ? "text-gray-500" : "text-white"}`}>{option.choice_text}</p>
                                {isUserVote && <span className="text-xs text-purple-400">내 투표</span>}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Vote Count */}
                              <div className="text-right">
                                <p className={`font-bold text-xl ${isLoser ? "text-gray-500" : "text-white"}`}>{option.vote_count}</p>
                                <p className={`text-sm ${isLoser ? "text-gray-600" : "text-gray-400"}`}>{percentage}%</p>
                              </div>

                              {/* Progress indicator for ongoing votes */}
                              {!ended && !userVoted && <div className="px-4 py-2 bg-yellow-600/20 text-yellow-400 font-bold rounded-lg border border-yellow-500/50">진행 중</div>}

                              {/* Already Voted Indicator */}
                              {userVoted && isUserVote && <div className="px-4 py-2 bg-purple-600/20 text-purple-400 font-bold rounded-lg border border-purple-500">✓ 투표완료</div>}

                              {/* Ended - Loser */}
                              {isLoser && <div className="px-4 py-2 bg-gray-700 text-gray-500 font-bold rounded-lg">선택불가</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Result Message */}
                  {ended && session.winningOptionId && (
                    <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
                      <p className="text-yellow-400 font-bold">투표 결과: {session.options.find((o) => o.id === session.winningOptionId)?.choice_text}이(가) 선택되었습니다!</p>
                    </div>
                  )}

                  {ended && !session.winningOptionId && session.totalVotes > 0 && (
                    <div className="mt-6 p-4 bg-gray-700/50 border border-gray-600 rounded-xl text-center">
                      <p className="text-gray-400">과반수를 획득한 선택지가 없습니다. 두 선택지 모두 선택 가능합니다.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-12 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
          <h3 className="text-base font-semibold text-white mb-3">투표 안내</h3>
          <ul className="text-gray-400 space-y-2 text-sm">
            <li className="text-yellow-400 font-semibold">투표는 게임 플레이 중 해당 선택지에서만 가능합니다 (0.1 VERY 필요)</li>
            <li>이 페이지에서는 현재 진행 중인 투표 현황을 확인할 수 있습니다</li>
            <li>각 Era마다 독립적인 투표 시스템이 적용됩니다</li>
            <li>지갑 주소당 1회 투표 가능합니다</li>
            <li>투표 종료 후 과반수를 득표한 선택지만 게임에서 선택할 수 있습니다</li>
            <li>과반수를 득표하지 못한 경우 모든 선택지가 선택 가능합니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
