// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MySimpleERC1155 {
    // tokenId => account => balance
    mapping(uint256 => mapping(address => uint256)) private _balances;
    // tokenId => uri
    mapping(uint256 => string) private _tokenURIs;

    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 amount);
    //특정 주소(account)가 가지고 있는 토큰 ID(id)의 잔액 조회
    function balanceOf(address account, uint256 id) public view returns (uint256) {
        require(account != address(0), "Address zero is invalid");
        return _balances[id][account];
    }
    //특정 토큰 ID(id)의 메타데이터 URI 조회
    function uri(uint256 id) public view returns (string memory) {
        return _tokenURIs[id];
    }
    //특정 토큰 ID(id)에 대한 메타데이터 URI를 설정
    function setTokenURI(uint256 id, string memory newURI) public {
        // 보통 관리자 권한 체크 필요
        _tokenURIs[id] = newURI;
    }

    function mint(address to, uint256 id, uint256 amount) public {
        require(to != address(0), "Mint to zero address");

        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }


    //특정 주소(from)에서 다른 주소(to)로 토큰 ID(id)를 amount 만큼 안전하게 전송
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount) public {
        require(to != address(0), "Transfer to zero address");
        require(_balances[id][from] >= amount, "Insufficient balance");

        // 권한 체크 생략 (owner or approved)
        _balances[id][from] -= amount;
        _balances[id][to] += amount;

        emit TransferSingle(msg.sender, from, to, id, amount);
    }
}
