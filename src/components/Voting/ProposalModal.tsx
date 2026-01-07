"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import { VotingService, Proposal } from "../../services/voting.service";
import NewStoryCreateAbi from "../../contracts/abi/NewStoryCreate.json";
import { useLanguage } from "../../context/LanguageContext";

// Same contract address as revive feature
const CONTRACT_ADDRESS = "0x54507082a8BD3f4aef9a69Ae58DeAD63cAB97244";
const VERY_CHAIN_ID = "0x1205";

// VERY Mainnet network configuration
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
  const { t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState<"create" | "list">("create");
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);
  const [isTransactionPending, setIsTransactionPending] = useState(false);

  // Stage slug -> title mapping
  const stageMap = new Map(stages.map((s) => [s.slug, s.title || s.slug]));

  // Switch to VERY chain
  const switchToVeryChain = async () => {
    if (!window.ethereum) {
      toast.error(t("voting.proposalModal.noMetaMask"));
      return false;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: VERY_CHAIN_ID }],
      });
      return true;
    } catch (switchError: unknown) {
      const error = switchError as { code?: number };
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [VERY_NETWORK_PARAMS],
          });
          return true;
        } catch {
          toast.error(t("voting.proposalModal.veryMainnetFailed"));
          return false;
        }
      }
      toast.error(t("voting.proposalModal.switchVery"));
      return false;
    }
  };

  // Load stage list
  useEffect(() => {
    if (isOpen) {
      VotingService.getStages().then(setStages);
      loadProposals();
    }
  }, [isOpen, gameId]);

  const loadProposals = async () => {
    setIsLoadingProposals(true);
    try {
      // Show only my proposals
      const data = await VotingService.getMyProposals(gameId, walletAddress);
      setProposals(data);
    } catch (error) {
      console.error("Error loading proposals:", error);
    } finally {
      setIsLoadingProposals(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t("voting.proposalModal.enterTitle"));
      return;
    }

    if (isTransactionPending || isLoading) return;

    const ethereum = window.ethereum;
    if (!ethereum) {
      toast.error(t("voting.proposalModal.noMetaMask"));
      return;
    }

    // Check wallet connection
    let accounts = await ethereum.request({ method: "eth_accounts" });
    if (!Array.isArray(accounts) || accounts.length === 0) {
      toast.info(t("voting.proposalModal.connectWallet"));
      try {
        accounts = await ethereum.request({ method: "eth_requestAccounts" });
      } catch {
        toast.error(t("voting.proposalModal.walletRejected"));
        return;
      }
    }

    // Switch to VERY chain
    const switched = await switchToVeryChain();
    if (!switched) return;

    setIsTransactionPending(true);
    try {
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, NewStoryCreateAbi, signer);

      // Send 1 VERY to register proposal
      toast.info(t("voting.proposalModal.txApprove"));
      const tx = await contract.StoryCreate({ value: ethers.parseEther("1") });

      toast.info(t("voting.proposalModal.txPending"));
      const receipt = await tx.wait();

      if (receipt && receipt.status === 1) {
        // Register proposal on transaction success
        setIsLoading(true);
        const result = await VotingService.createProposal(
          gameId,
          title,
          description,
          walletAddress,
          selectedStage?.slug
        );

        if (result.success) {
          toast.success(t("voting.proposalModal.registered"));
          onCreated();
          // Reset form
          setTitle("");
          setDescription("");
          setSelectedStage(null);
          // Refresh proposal list
          loadProposals();
          setActiveTab("list");
        } else {
          toast.error(result.error || t("voting.proposalModal.registerFailed"));
        }
      } else {
        toast.error(t("voting.proposalModal.txFailed"));
      }
    } catch (error) {
      console.error("Error creating proposal:", error);
      toast.error(t("voting.proposalModal.txError"));
    } finally {
      setIsTransactionPending(false);
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; labelKey: string }> = {
      pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", labelKey: "voting.proposalModal.pendingStatus" },
      approved: { bg: "bg-green-500/20", text: "text-green-400", labelKey: "voting.proposalModal.approvedStatus" },
      rejected: { bg: "bg-red-500/20", text: "text-red-400", labelKey: "voting.proposalModal.rejectedStatus" },
      converted: { bg: "bg-purple-500/20", text: "text-purple-400", labelKey: "voting.proposalModal.convertedStatus" },
    };
    const style = styles[status] || styles.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${style.bg} ${style.text}`}>
        {t(style.labelKey)}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-2xl border border-purple-500/50 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-4 flex justify-between items-center sticky top-0">
          <h2 className="text-xl font-bold text-white">{t("voting.proposalModal.title")}</h2>
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
            {t("voting.proposalModal.newProposal")}
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`flex-1 py-3 font-semibold transition-all ${
              activeTab === "list"
                ? "text-purple-400 border-b-2 border-purple-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {t("voting.proposalModal.proposalList")} ({proposals.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "create" ? (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">{t("voting.proposalModal.titleLabel")}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("voting.proposalModal.titlePlaceholder")}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">{t("voting.proposalModal.descLabel")}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("voting.proposalModal.descPlaceholder")}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Stage selection (optional) */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">{t("voting.proposalModal.stageLabel")}</label>
                <select
                  value={selectedStage?.slug || ""}
                  onChange={(e) => {
                    const stage = stages.find((s) => s.slug === e.target.value);
                    setSelectedStage(stage || null);
                  }}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">{t("voting.proposalModal.stagePlaceholder")}</option>
                  {stages.map((stage) => (
                    <option key={stage.slug} value={stage.slug}>
                      {stage.title || stage.slug}
                    </option>
                  ))}
                </select>
              </div>

              {/* Information */}
              <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                <p className="text-gray-400 text-sm">
                  {t("voting.proposalModal.costInfo")} <span className="text-purple-400 font-semibold">1 VERY</span>{t("voting.proposalModal.costSuffix")}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {t("voting.proposalModal.reviewInfo")}
                </p>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading || isTransactionPending || !title}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition mt-4"
              >
                {isTransactionPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {t("voting.proposalModal.txProcessing")}
                  </span>
                ) : isLoading ? (
                  t("voting.proposalModal.registering")
                ) : (
                  t("voting.proposalModal.submitButton")
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoadingProposals ? (
                <div className="text-center py-8 text-gray-400">{t("common.loading")}</div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {t("voting.proposalModal.noProposals")}
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
                        {t("voting.proposalModal.relatedStage")}: {stageMap.get(proposal.stage_slug) || proposal.stage_slug}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-green-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 19V5M5 12l7-7 7 7"/>
                          </svg>
                          <span className="font-semibold">{proposal.upvotes}</span>
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12l7 7 7-7"/>
                          </svg>
                          <span className="font-semibold">{proposal.downvotes}</span>
                        </span>
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
