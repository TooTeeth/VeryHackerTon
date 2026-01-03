// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

contract VeryDAOVoting {
    IERC20 public token;

    struct VoteCount {
        uint128 forVotes;
        uint128 againstVotes;
    }

    mapping(uint256 => VoteCount) public votes;
    mapping(uint256 => mapping(address => bool)) public voted;
    mapping(uint256 => mapping(address => uint256)) public snapshot;

    uint256 public quorumPercent = 4;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function startSnapshot(uint256 id) external {
        // marker only
    }

    function vote(uint256 id, bool support) external {
        require(!voted[id][msg.sender]);
        voted[id][msg.sender] = true;

        uint256 weight = snapshot[id][msg.sender];
        if (weight == 0) {
            weight = token.balanceOf(msg.sender);
            snapshot[id][msg.sender] = weight;
        }

        if (support) votes[id].forVotes += uint128(weight);
        else votes[id].againstVotes += uint128(weight);
    }

    function finalize(uint256 id) external view returns (bool) {
        VoteCount memory v = votes[id];
        uint256 total = v.forVotes + v.againstVotes;

        uint256 quorum = (token.totalSupply() * quorumPercent) / 100;
        if (total < quorum) return false;

        return v.forVotes > v.againstVotes;
    }
}
