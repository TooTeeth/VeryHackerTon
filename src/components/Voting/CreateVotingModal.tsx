"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { VotingService } from "../../services/voting.service";
import { useLanguage } from "../../context/LanguageContext";
import { DAO_CONTRACT_ADDRESS, DAO_ABI } from "../../lib/daoConfig";

interface Stage {
  id: number;
  slug: string;
  title: string;
}

interface CreateVotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId: string;
  walletAddress: string;
  onCreated: () => void;
}

export const CreateVotingModal: React.FC<CreateVotingModalProps> = ({
  isOpen,
  onClose,
  gameId,
  walletAddress,
  onCreated,
}) => {
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");

  // Load stage list
  useEffect(() => {
    if (isOpen) {
      VotingService.getStages().then(setStages);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t("voting.createModal.enterTitle"));
      return;
    }
    if (!selectedStage) {
      toast.error(t("voting.createModal.selectStage"));
      return;
    }
    if (!walletAddress) {
      toast.error("지갑을 연결해주세요");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Create DAO proposal on blockchain
      setLoadingStep("블록체인에 프로포절 생성 중...");

      if (!window.ethereum) {
        throw new Error("MetaMask가 설치되어 있지 않습니다");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const daoContract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, signer);

      // Convert duration to seconds for the contract
      const durationSeconds = durationMinutes * 60;

      // Create proposal with the specified duration
      const tx = await daoContract.createProposalWithDuration(
        `Story Vote: ${title}`,
        durationSeconds
      );

      setLoadingStep("트랜잭션 확인 대기 중...");
      const receipt = await tx.wait();

      // Extract proposalId from event
      let proposalId: number | null = null;
      const proposalCreatedTopic = ethers.id("ProposalCreated(uint256,address,string)");
      const event = receipt.logs.find((log: { topics: string[] }) =>
        log.topics[0] === proposalCreatedTopic
      );

      if (event) {
        proposalId = parseInt(event.topics[1], 16);
        console.log("[CreateVotingModal] Created proposal ID:", proposalId);
      }

      // Step 2: Create voting session in DB
      setLoadingStep("투표 세션 생성 중...");

      const result = await VotingService.createVotingSessionByStage(
        gameId,
        selectedStage.id,
        selectedStage.slug,
        title,
        description,
        durationMinutes,
        proposalId ?? undefined
      );

      if (result.success) {
        toast.success(`투표가 생성되었습니다${proposalId ? ` (Proposal #${proposalId})` : ""}`);
        onCreated();
        onClose();
        // Reset form
        setTitle("");
        setDescription("");
        setSelectedStage(null);
      } else {
        toast.error(result.error || t("voting.createModal.failed"));
      }
    } catch (error: unknown) {
      console.error("Error creating voting:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("user rejected")) {
        toast.error("트랜잭션이 취소되었습니다");
      } else if (errorMessage.includes("Insufficient VERY")) {
        toast.error("VERY 잔액이 부족합니다 (최소 1 VERY 필요)");
      } else {
        toast.error(`투표 생성 실패: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-purple-500/50 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-4 flex justify-between items-center sticky top-0">
          <h2 className="text-xl font-bold text-white">{t("voting.createModal.title")}</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">{t("voting.createModal.titleLabel")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("voting.createModal.titlePlaceholder")}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">{t("voting.createModal.descLabel")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("voting.createModal.descPlaceholder")}
              rows={3}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none disabled:opacity-50"
            />
          </div>

          {/* Stage selection */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">{t("voting.createModal.stageLabel")}</label>
            <select
              value={selectedStage?.slug || ""}
              onChange={(e) => {
                const stage = stages.find((s) => s.slug === e.target.value);
                setSelectedStage(stage || null);
              }}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
            >
              <option value="">{t("voting.createModal.stagePlaceholder")}</option>
              {stages.map((stage) => (
                <option key={stage.slug} value={stage.slug}>
                  {stage.title || stage.slug}
                </option>
              ))}
            </select>
          </div>

          {/* Voting duration */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">{t("voting.createModal.duration")}</label>
            <div className="flex gap-2">
              {[
                { label: `1${t("voting.createModal.hour")}`, value: 60 },
                { label: `6${t("voting.createModal.hour")}`, value: 360 },
                { label: `1${t("voting.createModal.day")}`, value: 1440 },
                { label: `3${t("voting.createModal.day")}`, value: 4320 },
                { label: `7${t("voting.createModal.day")}`, value: 10080 },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDurationMinutes(option.value)}
                  disabled={isLoading}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    durationMinutes === option.value
                      ? "bg-purple-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  } disabled:opacity-50`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Loading status */}
          {isLoading && loadingStep && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                <span className="text-purple-400 text-sm">{loadingStep}</span>
              </div>
            </div>
          )}

          {/* Create button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !title || !selectedStage}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition mt-4"
          >
            {isLoading ? loadingStep || "생성 중..." : t("voting.createModal.title")}
          </button>
        </div>
      </div>
    </div>
  );
};
