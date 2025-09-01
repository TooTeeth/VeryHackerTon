// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;


//Deployed Contracts:0x8A0136c306f8Ec15A9011E40bF98f25bca106988

contract AuthorizedWithdrawals {
   

 

    event AuthorizationSet(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Received(address indexed sender, uint amount);


    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    function receiveVery() external payable {
        require(msg.value > 0, "Send some VERY coins");
        emit Received(msg.sender, msg.value);
    }

    address public owner;
    mapping(address => uint256) public authorizedAmounts;

    
    function authorizeWithdrawal(address user, uint256 amount) external  {
        authorizedAmounts[user] = amount;
        emit AuthorizationSet(user, amount);
    }

    
    function withdraw(uint256 amount) external {
        require(authorizedAmounts[msg.sender] >= amount, "Not authorized or amount too high");
        authorizedAmounts[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit Withdraw(msg.sender, amount);
    }

   
     function getBalance() external view returns (uint) {
        return address(this).balance;
    }

    receive() external payable {}
    fallback() external payable {}
}
