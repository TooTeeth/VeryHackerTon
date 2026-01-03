// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VeryDAOIntegrated
 * @notice 통합 DAO + Treasury 컨트랙트 (네이티브 VERY 기준)
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract VeryDAOIntegrated {
    // ================== STATE ==================
    address public owner;
    address public dao;

    enum ProposalState { Pending, Active, Succeeded, Defeated, Executed, Canceled }

    struct Proposal {
        address proposer;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        uint256 forVotes;
        uint256 againstVotes;
        string description;
    }

    uint256 public proposalCount;
    uint256 public votingPeriod = 3 days;
    uint256 public proposalThreshold = 1 ether; // 최소 1 VERY 필요

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Treasury ERC-20 토큰 지원 (선택적)
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;

    // ================== EVENTS ==================
    event ProposalCreated(uint256 indexed id, address indexed proposer, string description);
    event Voted(uint256 indexed id, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id);
    event ETHDeposited(address indexed from, uint256 amount);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event DAOUpdated(address indexed oldDAO, address indexed newDAO);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ================== MODIFIERS ==================
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyDAO() {
        require(msg.sender == dao, "Not DAO");
        _;
    }

    modifier onlyTokenHolder() {
        require(msg.sender.balance >= proposalThreshold, "Insufficient VERY");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || msg.sender == dao, "Not authorized");
        _;
    }

    // ================== CONSTRUCTOR ==================
    constructor(address _dao) {
        owner = msg.sender;
        dao = _dao;
    }

    // ================== DAO FUNCTIONS ==================

    // 기본 투표 기간으로 프로포절 생성
    function createProposal(string calldata description) external onlyTokenHolder returns (uint256) {
        return _createProposal(description, votingPeriod);
    }

    // 커스텀 투표 기간으로 프로포절 생성 (프론트에서 duration 지정)
    function createProposalWithDuration(string calldata description, uint256 duration) external onlyTokenHolder returns (uint256) {
        require(duration >= 20 seconds, "Min 20 seconds");
        require(duration <= 30 days, "Max 30 days");
        return _createProposal(description, duration);
    }

    function _createProposal(string calldata description, uint256 duration) internal returns (uint256) {
        proposalCount++;
        proposals[proposalCount] = Proposal({
            proposer: msg.sender,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            executed: false,
            forVotes: 0,
            againstVotes: 0,
            description: description
        });
        emit ProposalCreated(proposalCount, msg.sender, description);
        return proposalCount;
    }

    function vote(uint256 id, bool support) external {
        Proposal storage p = proposals[id];
        require(block.timestamp >= p.startTime && block.timestamp <= p.endTime, "Voting inactive");
        require(!hasVoted[id][msg.sender], "Already voted");

        uint256 weight = msg.sender.balance; // VERY 잔액 기준
        require(weight > 0, "No voting power");

        hasVoted[id][msg.sender] = true;

        if (support) p.forVotes += weight;
        else p.againstVotes += weight;

        emit Voted(id, msg.sender, support, weight);
    }

    function executeProposal(uint256 id) external {
        Proposal storage p = proposals[id];
        require(block.timestamp > p.endTime, "Voting not ended");
        require(!p.executed, "Already executed");
        require(p.forVotes > p.againstVotes, "Proposal not passed");

        p.executed = true;

        emit ProposalExecuted(id);
        // 외부 호출 로직 등 필요시 여기 추가 가능
    }

    function getProposalState(uint256 id) external view returns (ProposalState) {
        Proposal storage p = proposals[id];
        if (p.executed) return ProposalState.Executed;
        if (block.timestamp < p.startTime) return ProposalState.Pending;
        if (block.timestamp <= p.endTime) return ProposalState.Active;
        if (p.forVotes > p.againstVotes) return ProposalState.Succeeded;
        return ProposalState.Defeated;
    }

    // ================== TREASURY FUNCTIONS ==================
    receive() external payable {
        emit ETHDeposited(msg.sender, msg.value);
    }

    function depositETH() external payable {
        require(msg.value > 0, "Zero amount");
        emit ETHDeposited(msg.sender, msg.value);
    }

    function withdrawETH(address payable to, uint256 amount) external onlyAuthorized {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        emit ETHWithdrawn(to, amount);
    }

    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!supportedTokens[token], "Already supported");

        supportedTokens[token] = true;
        tokenList.push(token);

        emit TokenAdded(token);
    }

    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Not supported");
        supportedTokens[token] = false;

        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }

        emit TokenRemoved(token);
    }

    function withdrawToken(address token, address to, uint256 amount) external onlyAuthorized {
        require(supportedTokens[token], "Token not supported");
        IERC20(token).transfer(to, amount);
    }

    // ================== ADMIN FUNCTIONS ==================
    function setDAO(address _dao) external onlyOwner {
        require(_dao != address(0), "Invalid DAO address");
        emit DAOUpdated(dao, _dao);
        dao = _dao;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ================== VIEW FUNCTIONS ==================
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }
}


//CA: 0xD378dcaAe1344d7DA51a23fd65715583f13be19b