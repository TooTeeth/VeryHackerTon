// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC1155 {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount
    ) external;
}

contract TestMarketplace {
    // 마켓이 보유한 NFT 기록: nftContract => tokenId => amount
    mapping(address => mapping(uint256 => uint256)) public marketplaceBalances;

    // 1️⃣ 유저가 NFT를 마켓에 보내는 함수
    function depositNFT(address nftContract, uint256 tokenId, uint256 amount) external {
        IERC1155 nft = IERC1155(nftContract);

        // 마켓 승인이 되어 있는지 확인
        require(nft.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        // 잔액 확인
        require(nft.balanceOf(msg.sender, tokenId) >= amount, "Insufficient balance");

        // NFT를 마켓으로 전송
        nft.safeTransferFrom(msg.sender, address(this), tokenId, amount);

        // 마켓 기록 업데이트
        marketplaceBalances[nftContract][tokenId] += amount;
    }

    // 2️⃣ 구매자가 구매하면 마켓에서 구매자에게 NFT 전송
    function sendToBuyer(address nftContract, uint256 tokenId, uint256 amount, address buyer) external {
        require(marketplaceBalances[nftContract][tokenId] >= amount, "Not enough in marketplace");

        // NFT 전송
        IERC1155(nftContract).safeTransferFrom(address(this), buyer, tokenId, amount);

        // 마켓 기록 업데이트
        marketplaceBalances[nftContract][tokenId] -= amount;
    }

    // 3️⃣ 마켓이 가진 NFT 조회
    function marketplaceBalance(address nftContract, uint256 tokenId) external view returns (uint256) {
        return marketplaceBalances[nftContract][tokenId];
    }
}
