// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*0x1c1852FF164e169fFE759075384060BD26183724 */

contract MySimpleERC1155 {
    // Operator approvals: owner => operator => approved
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    // tokenId => account => balance
    mapping(uint256 => mapping(address => uint256)) private _balances;

    // tokenId => URI
    mapping(uint256 => string) private _tokenURIs;

    // 이벤트
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 amount);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // NFT 잔액 조회
    function balanceOf(address account, uint256 id) public view returns (uint256) {
        require(account != address(0), "Address zero is invalid");
        return _balances[id][account];
    }

    // URI 조회
    function uri(uint256 id) public view returns (string memory) {
        return _tokenURIs[id];
    }

    // URI 설정 (관리자 권한 체크 생략)
    function setTokenURI(uint256 id, string memory newURI) public {
        _tokenURIs[id] = newURI;
    }

    // NFT 발행
    function mint(address to, uint256 id, uint256 amount) public {
        require(to != address(0), "Mint to zero address");
        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }

    // 승인 설정
    function setApprovalForAll(address operator, bool approved) public {
        require(msg.sender != operator, "Cannot approve self");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // 승인 확인
    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    // 안전 전송
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount) public {
        require(to != address(0), "Transfer to zero address");
        require(_balances[id][from] >= amount, "Insufficient balance");
        require(
            msg.sender == from || isApprovedForAll(from, msg.sender),
            "Not approved"
        );

        _balances[id][from] -= amount;
        _balances[id][to] += amount;

        emit TransferSingle(msg.sender, from, to, id, amount);
    }
}
