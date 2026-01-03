"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { VotingService, Proposal } from "../../services/voting.service";

interface Stage {
  id: number;
  slug: string;
  title: string;
}

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  walletAddress: string;
  onCreated: () => void;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({
  isOpen,
  onClose,
  gameId,
  walletAddress,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);

  // 스테이지 목록 로드
  useEffect(() => {
    if (isOpen) {
      VotingService.getStages().then(setStages);
      loadProposals();
    }
  }, [isOpen, gameId]);

  const loadProposals = async () => {
    setIsLoadingProposals(true);
    try {
      const data = await VotingService.getProposals(gameId, undefined, walletAddress);
      setProposals(data);
    } catch (error) {
      console.error("Error loading proposals:", error);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("제목을 입력하세요");
      return;
    }

    setIsLoading(true);
    try {
      const result = await VotingService.createProposal(
        gameId,
        title,
        description,
        walletAddress,
        selectedStage?.slug
      );

      if (result.success) {
        toast.success("제안이 등록되었습니다!");
        onCreated();
        // 폼 초기화
        setTitle("");
        setDescription("");
        setSelectedStage(null);
        // 제안 목록 새로고침
        loadProposals();
        setActiveTab("list");
      } else {
        toast.error(result.error || "제안 등록에 실패했습니다");
      }
    } catch (error) {
      console.error("Error creating proposal:", error);
      toast.error("제안 등록에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (proposalId: number, voteType: "up" | "down") => {
    const result = await VotingService.voteOnProposal(proposalId, walletAddress, voteType);
    if (result.success) {
      toast.success(voteType === "up" ? "추천했습니다!" : "비추천했습니다!");
      loadProposals();
    } else {
      toast.error("투표에 실패했습니다");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "검토중" },
      approved: { bg: "bg-green-500/20", text: "text-green-400", label: "승인됨" },
      rejected: { bg: "bg-red-500/20", text: "text-red-400", label: "거절됨" },
      converted: { bg: "bg-purple-500/20", text: "text-purple-400", label: "투표로 전환됨" },
    };
    const style = styles[status] || styles.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-purple-500/50 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-4 flex justify-between items-center sticky top-0">
          <h2 className="text-xl font-bold text-white">제안하기</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-3 font-semibold transition-all ${
              activeTab === "create"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            새 제안
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 font-semibold transition-all ${
              activeTab === "list"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            제안 목록 ({proposals.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "create" ? (
            <div className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">제안 제목 *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="어떤 투표를 제안하시나요?"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">상세 설명</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="제안에 대한 자세한 설명을 입력하세요 (선택)"
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* 스테이지 선택 (선택사항) */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">관련 스테이지 (선택)</label>
                <select
                  value={selectedStage?.slug || ""}
                  onChange={(e) => {
                    const stage = stages.find((s) => s.slug === e.target.value);
                    setSelectedStage(stage || null);
                  }}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">스테이지를 선택하세요 (선택사항)</option>
                  {stages.map((stage) => (
                    <option key={stage.slug} value={stage.slug}>
                      {stage.title || stage.slug}
                    </option>
                  ))}
                </select>
              </div>

              {/* 안내 */}
              <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-sm">
                  제안은 관리자/운영자가 검토 후 투표로 전환됩니다.
                  다른 유저들의 추천을 많이 받으면 더 빨리 검토될 수 있습니다.
                </p>
              </div>

              {/* 제출 버튼 */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || !title}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition mt-4"
              >
                {isLoading ? "제안 중..." : "제안하기"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoadingProposals ? (
                <div className="text-center py-8 text-gray-400">로딩 중...</div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  아직 제안이 없습니다. 첫 번째 제안을 해보세요!
                </div>
              ) : (
                proposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="p-4 bg-gray-800/50 rounded-xl border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-white">{proposal.title}</h3>
                      {getStatusBadge(proposal.status)}
                    </div>
                    {proposal.description && (
                      <p className="text-gray-400 text-sm mb-3">{proposal.description}</p>
                    )}
                    {proposal.stage_slug && (
                      <p className="text-gray-500 text-xs mb-2">
                        관련 스테이지: {proposal.stage_slug}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleVote(proposal.id, "up")}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                            proposal.userVote === "up"
                              ? "bg-green-500/30 text-green-400"
                              : "bg-gray-700 text-gray-400 hover:bg-green-500/20 hover:text-green-400"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                          </svg>
                          <span>{proposal.upvotes}</span>
                        </button>
                        <button
                          onClick={() => handleVote(proposal.id, "down")}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                            proposal.userVote === "down"
                              ? "bg-red-500/30 text-red-400"
                              : "bg-gray-700 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12l7 7 7-7"/>
                          </svg>
                          <span>{proposal.downvotes}</span>
                        </button>
                      </div>
                      <span className="text-gray-500 text-xs">
                        {new Date(proposal.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
