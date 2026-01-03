// services/dao.service.ts
import { ethers } from "ethers";
import {
  DAO_CONTRACT_ADDRESS,
  DAO_ABI,
  VERY_NETWORK,
  ProposalState,
  Proposal,
  ProposalWithState,
} from "../lib/daoConfig";

// ========== PROVIDER ==========
const getProvider = () => {
  return new ethers.JsonRpcProvider(VERY_NETWORK.rpcUrl);
};

const getContract = (signerOrProvider?: ethers.Signer | ethers.Provider) => {
  const provider = signerOrProvider || getProvider();
  return new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, provider);
};

const getSigner = async () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask가 설치되어 있지 않습니다");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
};

// ========== DAO SERVICE ==========
export class DAOService {
  // ========== READ FUNCTIONS ==========

  /**
   * Get total proposal count
   */
  static async getProposalCount(): Promise<number> {
    try {
      const contract = getContract();
      const count = await contract.proposalCount();
      return Number(count);
    } catch (error) {
      console.error("Error getting proposal count:", error);
      return 0;
    }
  }

  /**
   * Get a single proposal by ID
   */
  static async getProposal(proposalId: number, voterAddress?: string): Promise<ProposalWithState | null> {
    try {
      const contract = getContract();

      // proposals 매핑에서 데이터 가져오기
      const proposal = await contract.proposals(proposalId);
      const state = await contract.getProposalState(proposalId);

      // 투표 여부 확인
      let hasVoted = false;
      if (voterAddress) {
        hasVoted = await contract.hasVoted(proposalId, voterAddress);
      }

      return {
        proposal: {
          id: proposalId,
          proposer: proposal.proposer,
          description: proposal.description,
          startTime: proposal.startTime,
          endTime: proposal.endTime,
          forVotes: proposal.forVotes,
          againstVotes: proposal.againstVotes,
          executed: proposal.executed,
        },
        state: Number(state) as ProposalState,
        hasVoted,
      };
    } catch (error) {
      console.error("Error getting proposal:", error);
      return null;
    }
  }

  /**
   * Get all proposals
   */
  static async getAllProposals(voterAddress?: string): Promise<ProposalWithState[]> {
    try {
      const count = await this.getProposalCount();
      const proposals: ProposalWithState[] = [];

      for (let i = 1; i <= count; i++) {
        const proposal = await this.getProposal(i, voterAddress);
        if (proposal) {
          proposals.push(proposal);
        }
      }

      return proposals.reverse(); // Newest first
    } catch (error) {
      console.error("Error getting all proposals:", error);
      return [];
    }
  }

  /**
   * Get active proposals only
   */
  static async getActiveProposals(voterAddress?: string): Promise<ProposalWithState[]> {
    const all = await this.getAllProposals(voterAddress);
    return all.filter((p) => p.state === ProposalState.Active);
  }

  /**
   * Get proposal state
   */
  static async getProposalState(proposalId: number): Promise<ProposalState> {
    try {
      const contract = getContract();
      const state = await contract.getProposalState(proposalId);
      return Number(state) as ProposalState;
    } catch (error) {
      console.error("Error getting proposal state:", error);
      return ProposalState.Pending;
    }
  }

  /**
   * Check if user has voted
   */
  static async hasVoted(proposalId: number, voter: string): Promise<boolean> {
    try {
      const contract = getContract();
      return await contract.hasVoted(proposalId, voter);
    } catch (error) {
      console.error("Error checking vote status:", error);
      return false;
    }
  }

  /**
   * Get user's voting power (VERY balance)
   */
  static async getVotingPower(voter: string): Promise<bigint> {
    try {
      const provider = getProvider();
      return await provider.getBalance(voter);
    } catch (error) {
      console.error("Error getting voting power:", error);
      return 0n;
    }
  }

  /**
   * Get treasury balance (ETH in contract)
   */
  static async getTreasuryBalance(): Promise<bigint> {
    try {
      const contract = getContract();
      return await contract.getETHBalance();
    } catch (error) {
      console.error("Error getting treasury balance:", error);
      return 0n;
    }
  }

  /**
   * Get voting period
   */
  static async getVotingPeriod(): Promise<number> {
    try {
      const contract = getContract();
      const period = await contract.votingPeriod();
      return Number(period);
    } catch (error) {
      console.error("Error getting voting period:", error);
      return 3 * 24 * 60 * 60; // Default 3 days
    }
  }

  /**
   * Get proposal threshold
   */
  static async getProposalThreshold(): Promise<bigint> {
    try {
      const contract = getContract();
      return await contract.proposalThreshold();
    } catch (error) {
      console.error("Error getting proposal threshold:", error);
      return ethers.parseEther("1"); // Default 1 VERY
    }
  }

  // ========== WRITE FUNCTIONS ==========

  /**
   * Create a new proposal (기본 3일 투표 기간)
   */
  static async createProposal(
    description: string
  ): Promise<{ success: boolean; proposalId?: number; error?: string }> {
    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      const tx = await contract.createProposal(description);
      const receipt = await tx.wait();

      // Get proposal ID from event
      const event = receipt.logs.find(
        (log: ethers.Log) => log.topics[0] === ethers.id("ProposalCreated(uint256,address,string)")
      );

      let proposalId = 0;
      if (event) {
        proposalId = Number(ethers.toBigInt(event.topics[1]));
      }

      return { success: true, proposalId };
    } catch (error) {
      console.error("Error creating proposal:", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      return { success: false, error: message };
    }
  }

  /**
   * Create a proposal with custom duration (프론트에서 투표 기간 지정)
   * @param description 프로포절 설명
   * @param durationSeconds 투표 기간 (초 단위, 최소 1시간 ~ 최대 30일)
   */
  static async createProposalWithDuration(
    description: string,
    durationSeconds: number
  ): Promise<{ success: boolean; proposalId?: number; error?: string }> {
    try {
      // 프론트 검증
      const MIN_DURATION = 60 * 60; // 1시간
      const MAX_DURATION = 30 * 24 * 60 * 60; // 30일

      if (durationSeconds < MIN_DURATION) {
        return { success: false, error: "최소 1시간 이상이어야 합니다" };
      }
      if (durationSeconds > MAX_DURATION) {
        return { success: false, error: "최대 30일까지만 가능합니다" };
      }

      const signer = await getSigner();
      const contract = getContract(signer);

      const tx = await contract.createProposalWithDuration(description, durationSeconds);
      const receipt = await tx.wait();

      // Get proposal ID from event
      const event = receipt.logs.find(
        (log: ethers.Log) => log.topics[0] === ethers.id("ProposalCreated(uint256,address,string)")
      );

      let proposalId = 0;
      if (event) {
        proposalId = Number(ethers.toBigInt(event.topics[1]));
      }

      return { success: true, proposalId };
    } catch (error) {
      console.error("Error creating proposal with duration:", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      return { success: false, error: message };
    }
  }

  /**
   * Vote on a proposal (찬성/반대)
   */
  static async vote(
    proposalId: number,
    support: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      const tx = await contract.vote(proposalId, support);
      await tx.wait();

      return { success: true };
    } catch (error) {
      console.error("Error voting:", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      return { success: false, error: message };
    }
  }

  /**
   * Execute a succeeded proposal
   */
  static async executeProposal(proposalId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      const tx = await contract.executeProposal(proposalId);
      await tx.wait();

      return { success: true };
    } catch (error) {
      console.error("Error executing proposal:", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      return { success: false, error: message };
    }
  }

  /**
   * Deposit ETH to treasury
   */
  static async depositToTreasury(amount: string): Promise<{ success: boolean; error?: string }> {
    try {
      const signer = await getSigner();
      const contract = getContract(signer);

      const tx = await contract.depositETH({ value: ethers.parseEther(amount) });
      await tx.wait();

      return { success: true };
    } catch (error) {
      console.error("Error depositing to treasury:", error);
      const message = error instanceof Error ? error.message : "알 수 없는 오류";
      return { success: false, error: message };
    }
  }

  // ========== UTILITY ==========

  /**
   * Format proposal for display
   */
  static formatProposalForDisplay(proposalWithState: ProposalWithState) {
    const { proposal, state, hasVoted } = proposalWithState;
    const totalVotes = proposal.forVotes + proposal.againstVotes;

    return {
      id: proposal.id,
      description: proposal.description,
      proposer: proposal.proposer,
      startTime: new Date(Number(proposal.startTime) * 1000),
      endTime: new Date(Number(proposal.endTime) * 1000),
      forVotes: proposal.forVotes,
      againstVotes: proposal.againstVotes,
      totalVotes,
      forPercentage: totalVotes > 0n ? Math.round((Number(proposal.forVotes) / Number(totalVotes)) * 100) : 0,
      againstPercentage: totalVotes > 0n ? Math.round((Number(proposal.againstVotes) / Number(totalVotes)) * 100) : 0,
      state,
      executed: proposal.executed,
      hasVoted,
      isActive: state === ProposalState.Active,
      isEnded: [ProposalState.Succeeded, ProposalState.Defeated, ProposalState.Executed, ProposalState.Canceled].includes(state),
    };
  }
}

export default DAOService;
