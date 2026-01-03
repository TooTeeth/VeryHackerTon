// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VeryTreasury
 * @notice DAO Treasury contract for managing funds
 * @dev Only DAO contract or owner can withdraw funds
 */

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract VeryTreasury {
    // ========== STATE VARIABLES ==========

    address public owner;
    address public dao;
    address public pendingOwner;

    // Supported tokens
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;

    // ========== EVENTS ==========

    event Deposit(address indexed token, address indexed from, uint256 amount);
    event Withdraw(address indexed token, address indexed to, uint256 amount);
    event ETHDeposit(address indexed from, uint256 amount);
    event ETHWithdraw(address indexed to, uint256 amount);
    event DAOUpdated(address indexed oldDAO, address indexed newDAO);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ========== MODIFIERS ==========

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyDAO() {
        require(msg.sender == dao, "Not DAO");
        _;
    }

    modifier onlyAuthorized() {
        require(msg.sender == owner || msg.sender == dao, "Not authorized");
        _;
    }

    // ========== CONSTRUCTOR ==========

    constructor(address _dao) {
        owner = msg.sender;
        dao = _dao;
    }

    // ========== DEPOSIT FUNCTIONS ==========

    /**
     * @notice Deposit ETH to treasury
     */
    function depositETH() external payable {
        require(msg.value > 0, "Zero amount");
        emit ETHDeposit(msg.sender, msg.value);
    }

    /**
     * @notice Deposit ERC20 tokens to treasury
     */
    function depositToken(address token, uint256 amount) external {
        require(amount > 0, "Zero amount");
        require(supportedTokens[token], "Token not supported");

        IERC20(token).transferFrom(msg.sender, address(this), amount);
        emit Deposit(token, msg.sender, amount);
    }

    // ========== WITHDRAW FUNCTIONS ==========

    /**
     * @notice Withdraw ETH (only owner or DAO)
     */
    function withdrawETH(address payable to, uint256 amount) external onlyAuthorized {
        require(amount <= address(this).balance, "Insufficient balance");

        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");

        emit ETHWithdraw(to, amount);
    }

    /**
     * @notice Withdraw ERC20 tokens (only owner or DAO)
     */
    function withdrawToken(address token, address to, uint256 amount) external onlyAuthorized {
        require(amount <= IERC20(token).balanceOf(address(this)), "Insufficient balance");

        IERC20(token).transfer(to, amount);
        emit Withdraw(token, to, amount);
    }

    /**
     * @notice Execute arbitrary call (only DAO - for proposal execution)
     */
    function execute(address target, bytes calldata data, uint256 value)
        external
        onlyDAO
        returns (bytes memory)
    {
        require(target != address(0), "Invalid target");

        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Execution failed");

        return result;
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Get ETH balance
     */
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get token balance
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Get all supported tokens
     */
    function getSupportedTokens() external view returns (address[] memory) {
        return tokenList;
    }

    /**
     * @notice Get all balances (ETH + all tokens)
     */
    function getAllBalances() external view returns (
        uint256 ethBalance,
        address[] memory tokens,
        uint256[] memory balances
    ) {
        ethBalance = address(this).balance;
        tokens = tokenList;
        balances = new uint256[](tokenList.length);

        for (uint256 i = 0; i < tokenList.length; i++) {
            balances[i] = IERC20(tokenList[i]).balanceOf(address(this));
        }
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Add supported token
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!supportedTokens[token], "Already supported");

        supportedTokens[token] = true;
        tokenList.push(token);

        emit TokenAdded(token);
    }

    /**
     * @notice Remove supported token
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Not supported");

        supportedTokens[token] = false;

        // Remove from list
        for (uint256 i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == token) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }

        emit TokenRemoved(token);
    }

    /**
     * @notice Update DAO address
     */
    function setDAO(address _dao) external onlyOwner {
        require(_dao != address(0), "Invalid address");
        emit DAOUpdated(dao, _dao);
        dao = _dao;
    }

    /**
     * @notice Transfer ownership (2-step)
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    /**
     * @notice Accept ownership
     */
    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    // ========== RECEIVE ==========

    receive() external payable {
        emit ETHDeposit(msg.sender, msg.value);
    }

    fallback() external payable {
        emit ETHDeposit(msg.sender, msg.value);
    }
}


//CA: 0x3B5f6E44eCB27d53d4519E3581f88bFE1C818f39