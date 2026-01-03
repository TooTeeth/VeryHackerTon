// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IVeryDAOVoting {
    function startSnapshot(uint256 proposalId) external;
    function finalize(uint256 proposalId) external returns (bool);
}

interface IVeryDAOOptions {
    function isMultiOption(uint256 proposalId) external view returns (bool);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}



contract VeryDAOCore {
    enum ProposalState { Pending, Active, Succeeded, Defeated, Executed, Canceled }

    struct Proposal {
        address proposer;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        uint256 forVotes;
        uint256 againstVotes;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    uint256 public votingPeriod = 3 days;
    uint256 public proposalThreshold = 1 ether; // 최소 1 VERY 필요

    modifier onlyTokenHolder() {
        require(msg.sender.balance >= proposalThreshold, "Insufficient VERY");
        _;
    }

    function createProposal() external onlyTokenHolder returns (uint256) {
        proposalCount++;
        proposals[proposalCount] = Proposal({
            proposer: msg.sender,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            executed: false,
            forVotes: 0,
            againstVotes: 0
        });
        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.startTime && block.timestamp <= proposal.endTime, "Voting inactive");

        uint256 weight = msg.sender.balance; // VERY 잔액 기준
        require(weight > 0, "No voting power");

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "Voting not ended");
        require(!proposal.executed, "Already executed");
        require(proposal.forVotes > proposal.againstVotes, "Proposal not passed");

        proposal.executed = true;
        // 실제 실행 로직 추가 가능 (예: DAO Treasury 호출)
    }

    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.executed) return ProposalState.Executed;
        if (block.timestamp < proposal.startTime) return ProposalState.Pending;
        if (block.timestamp <= proposal.endTime) return ProposalState.Active;
        if (proposal.forVotes > proposal.againstVotes) return ProposalState.Succeeded;
        return ProposalState.Defeated;
    }
}


//CA: 0x7C5a6ed6484CcB23D87904011bc62B6c610247b2