// lib/daoConfig.ts
import VeryDAOIntegratedABI from "../contracts/abi/VeryDAOIntegrated.json";

// ========== CONTRACT ADDRESSES ==========
// VeryDAOIntegrated 배포 주소
export const DAO_CONTRACT_ADDRESS = "0xD378dcaAe1344d7DA51a23fd65715583f13be19b";

// ========== NETWORK CONFIG ==========
export const VERY_NETWORK = {
  chainId: 7797,
  chainIdHex: "0x1e75",
  chainName: "Very Labs Network",
  rpcUrl: "https://rpc.verylabs.io",
  blockExplorer: "https://explorer.verylabs.io",
  nativeCurrency: {
    name: "VERY",
    symbol: "VERY",
    decimals: 18,
  },
};

// ========== ABI ==========
export const DAO_ABI = VeryDAOIntegratedABI;

// Human-readable ABI for common functions
export const DAO_ABI_SIMPLE = [
  // Read functions
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256) view returns (address proposer, uint256 startTime, uint256 endTime, bool executed, uint256 forVotes, uint256 againstVotes, string description)",
  "function getProposalState(uint256 id) view returns (uint8)",
  "function hasVoted(uint256, address) view returns (bool)",
  "function votingPeriod() view returns (uint256)",
  "function proposalThreshold() view returns (uint256)",
  "function getETHBalance() view returns (uint256)",
  "function getSupportedTokens() view returns (address[])",
  "function owner() view returns (address)",
  "function dao() view returns (address)",

  // Write functions
  "function createProposal(string description) returns (uint256)",
  "function vote(uint256 id, bool support)",
  "function executeProposal(uint256 id)",
  "function depositETH() payable",
  "function withdrawETH(address to, uint256 amount)",
];

// ========== ENUMS ==========
export enum ProposalState {
  Pending = 0,
  Active = 1,
  Succeeded = 2,
  Defeated = 3,
  Executed = 4,
  Canceled = 5,
}

// ========== TYPES ==========
export interface Proposal {
  id: number;
  proposer: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  forVotes: bigint;
  againstVotes: bigint;
  executed: boolean;
}

export interface ProposalWithState {
  proposal: Proposal;
  state: ProposalState;
  hasVoted: boolean;
}

// ========== HELPER FUNCTIONS ==========
export function getProposalStateLabel(state: ProposalState): string {
  const labels: Record<ProposalState, string> = {
    [ProposalState.Pending]: "대기중",
    [ProposalState.Active]: "진행중",
    [ProposalState.Succeeded]: "통과",
    [ProposalState.Defeated]: "부결",
    [ProposalState.Executed]: "실행됨",
    [ProposalState.Canceled]: "취소됨",
  };
  return labels[state] || "알 수 없음";
}

export function getProposalStateColor(state: ProposalState): string {
  const colors: Record<ProposalState, string> = {
    [ProposalState.Pending]: "text-yellow-400",
    [ProposalState.Active]: "text-green-400",
    [ProposalState.Succeeded]: "text-blue-400",
    [ProposalState.Defeated]: "text-red-400",
    [ProposalState.Executed]: "text-purple-400",
    [ProposalState.Canceled]: "text-gray-400",
  };
  return colors[state] || "text-gray-400";
}

export function getProposalStateBg(state: ProposalState): string {
  const colors: Record<ProposalState, string> = {
    [ProposalState.Pending]: "bg-yellow-500/20 border-yellow-500/50",
    [ProposalState.Active]: "bg-green-500/20 border-green-500/50",
    [ProposalState.Succeeded]: "bg-blue-500/20 border-blue-500/50",
    [ProposalState.Defeated]: "bg-red-500/20 border-red-500/50",
    [ProposalState.Executed]: "bg-purple-500/20 border-purple-500/50",
    [ProposalState.Canceled]: "bg-gray-500/20 border-gray-500/50",
  };
  return colors[state] || "bg-gray-500/20 border-gray-500/50";
}

export function formatVotes(votes: bigint): string {
  const ethValue = Number(votes) / 1e18;
  if (ethValue >= 1_000_000) {
    return (ethValue / 1_000_000).toFixed(1) + "M VERY";
  }
  if (ethValue >= 1_000) {
    return (ethValue / 1_000).toFixed(1) + "K VERY";
  }
  return ethValue.toFixed(2) + " VERY";
}

export function formatTimeRemaining(endTime: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const end = Number(endTime);
  const diff = end - now;

  if (diff <= 0) return "종료됨";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const mins = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}일 ${hours}시간 남음`;
  if (hours > 0) return `${hours}시간 ${mins}분 남음`;
  return `${mins}분 남음`;
}

// ========== DEFAULT CONFIG ==========
export const DEFAULT_PROPOSAL_THRESHOLD = "1"; // 1 VERY
export const DEFAULT_VOTING_PERIOD = 3 * 24 * 60 * 60; // 3 days in seconds
