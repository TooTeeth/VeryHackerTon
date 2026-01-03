// hooks/useDAO.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { DAOService } from "../services/dao.service";
import { ProposalState, ProposalWithState } from "../lib/daoConfig";
import { useWallet } from "../app/context/WalletContext";

// ========== TYPES ==========
export interface FormattedProposal {
  id: number;
  description: string;
  proposer: string;
  startTime: Date;
  endTime: Date;
  forVotes: bigint;
  againstVotes: bigint;
  totalVotes: bigint;
  forPercentage: number;
  againstPercentage: number;
  state: ProposalState;
  executed: boolean;
  hasVoted: boolean;
  isActive: boolean;
  isEnded: boolean;
}

// ========== HOOK: useDAO ==========
export function useDAO() {
  const { wallet } = useWallet();
  const [proposals, setProposals] = useState<FormattedProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treasuryBalance, setTreasuryBalance] = useState<bigint>(0n);
  const [votingPower, setVotingPower] = useState<bigint>(0n);

  // Load all proposals
  const loadProposals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const allProposals = await DAOService.getAllProposals(wallet?.address);

      // Format proposals
      const formatted = allProposals.map((p) =>
        DAOService.formatProposalForDisplay(p) as FormattedProposal
      );

      setProposals(formatted);
    } catch (err) {
      console.error("Error loading proposals:", err);
      setError("프로포절을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  // Load treasury and voting power
  const loadConfig = useCallback(async () => {
    try {
      const balance = await DAOService.getTreasuryBalance();
      setTreasuryBalance(balance);

      if (wallet?.address) {
        const power = await DAOService.getVotingPower(wallet.address);
        setVotingPower(power);
      }
    } catch (err) {
      console.error("Error loading DAO config:", err);
    }
  }, [wallet?.address]);

  // Initial load
  useEffect(() => {
    loadProposals();
    loadConfig();
  }, [loadProposals, loadConfig]);

  // Refresh function
  const refresh = useCallback(() => {
    loadProposals();
    loadConfig();
  }, [loadProposals, loadConfig]);

  return {
    proposals,
    loading,
    error,
    treasuryBalance,
    votingPower,
    refresh,
  };
}

// ========== HOOK: useProposal ==========
export function useProposal(proposalId: number) {
  const { wallet } = useWallet();
  const [proposal, setProposal] = useState<FormattedProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingPower, setVotingPower] = useState<bigint>(0n);

  const loadProposal = useCallback(async () => {
    if (!proposalId) return;

    setLoading(true);
    setError(null);

    try {
      const p = await DAOService.getProposal(proposalId, wallet?.address);
      if (!p) {
        setError("프로포절을 찾을 수 없습니다");
        return;
      }

      const formatted = DAOService.formatProposalForDisplay(p) as FormattedProposal;
      setProposal(formatted);

      // Get voting power
      if (wallet?.address) {
        const power = await DAOService.getVotingPower(wallet.address);
        setVotingPower(power);
      }
    } catch (err) {
      console.error("Error loading proposal:", err);
      setError("프로포절을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  }, [proposalId, wallet?.address]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  return {
    proposal,
    loading,
    error,
    votingPower,
    refresh: loadProposal,
  };
}

// ========== HOOK: useVoting ==========
export function useVoting(proposalId: number) {
  const { wallet } = useWallet();
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vote 찬성/반대
  const vote = useCallback(
    async (support: boolean): Promise<boolean> => {
      if (!wallet?.address) {
        setError("지갑을 연결해주세요");
        return false;
      }

      setIsVoting(true);
      setError(null);

      try {
        const result = await DAOService.vote(proposalId, support);
        if (!result.success) {
          setError(result.error || "투표 실패");
          return false;
        }
        return true;
      } catch (err) {
        console.error("Voting error:", err);
        setError(err instanceof Error ? err.message : "투표 중 오류 발생");
        return false;
      } finally {
        setIsVoting(false);
      }
    },
    [proposalId, wallet?.address]
  );

  return {
    vote,
    isVoting,
    error,
    clearError: () => setError(null),
  };
}

// ========== HOOK: useCreateProposal ==========
export function useCreateProposal() {
  const { wallet } = useWallet();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 기본 3일 투표 기간
  const createProposal = useCallback(
    async (description: string): Promise<number | null> => {
      if (!wallet?.address) {
        setError("지갑을 연결해주세요");
        return null;
      }

      setIsCreating(true);
      setError(null);

      try {
        const result = await DAOService.createProposal(description);

        if (!result.success) {
          setError(result.error || "프로포절 생성 실패");
          return null;
        }

        return result.proposalId || null;
      } catch (err) {
        console.error("Create proposal error:", err);
        setError(err instanceof Error ? err.message : "프로포절 생성 중 오류 발생");
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [wallet?.address]
  );

  // 커스텀 투표 기간 (초 단위)
  const createProposalWithDuration = useCallback(
    async (description: string, durationSeconds: number): Promise<number | null> => {
      if (!wallet?.address) {
        setError("지갑을 연결해주세요");
        return null;
      }

      setIsCreating(true);
      setError(null);

      try {
        const result = await DAOService.createProposalWithDuration(description, durationSeconds);

        if (!result.success) {
          setError(result.error || "프로포절 생성 실패");
          return null;
        }

        return result.proposalId || null;
      } catch (err) {
        console.error("Create proposal error:", err);
        setError(err instanceof Error ? err.message : "프로포절 생성 중 오류 발생");
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [wallet?.address]
  );

  return {
    createProposal,
    createProposalWithDuration,
    isCreating,
    error,
    clearError: () => setError(null),
  };
}

// ========== HOOK: useExecuteProposal ==========
export function useExecuteProposal() {
  const { wallet } = useWallet();
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeProposal = useCallback(
    async (proposalId: number): Promise<boolean> => {
      if (!wallet?.address) {
        setError("지갑을 연결해주세요");
        return false;
      }

      setIsExecuting(true);
      setError(null);

      try {
        const result = await DAOService.executeProposal(proposalId);

        if (!result.success) {
          setError(result.error || "실행 실패");
          return false;
        }

        return true;
      } catch (err) {
        console.error("Execute proposal error:", err);
        setError(err instanceof Error ? err.message : "실행 중 오류 발생");
        return false;
      } finally {
        setIsExecuting(false);
      }
    },
    [wallet?.address]
  );

  return {
    executeProposal,
    isExecuting,
    error,
    clearError: () => setError(null),
  };
}

export default useDAO;
