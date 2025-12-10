// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC1155 {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IERC1155Receiver {
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data) external returns (bytes4);
}

contract SimpleNFTMarketplace is IERC1155Receiver {

    // nft => tokenId => seller
    mapping(address => mapping(uint256 => address)) public seller;

    // nft => tokenId => price
    mapping(address => mapping(uint256 => uint256)) public price;

    // nft => tokenId => amount listed
    mapping(address => mapping(uint256 => uint256)) public listedAmount;

    // Active flag
    mapping(address => mapping(uint256 => bool)) public isActive;

    event Listed(address indexed nft, uint256 indexed tokenId, address seller, uint256 price, uint256 amount);
    event Sold(address indexed nft, uint256 indexed tokenId, address buyer, address seller, uint256 price, uint256 amount);
    event Cancelled(address indexed nft, uint256 indexed tokenId, address seller, uint256 amount);

    // List NFTs
    function list(address nft, uint256 tokenId, uint256 salePrice, uint256 amount) external {
        require(salePrice > 0, "Price > 0");
        require(amount > 0, "Amount > 0");

        IERC1155 contract1155 = IERC1155(nft);

        require(contract1155.isApprovedForAll(msg.sender, address(this)), "Not approved");
        require(contract1155.balanceOf(msg.sender, tokenId) >= amount, "Not enough balance");

        // Transfer to marketplace
        contract1155.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        // Listing logic (no arrays → lightweight)
        if (!isActive[nft][tokenId]) {
            seller[nft][tokenId] = msg.sender;
            price[nft][tokenId] = salePrice;
            listedAmount[nft][tokenId] = amount;
            isActive[nft][tokenId] = true;
        } else {
            require(seller[nft][tokenId] == msg.sender, "Different seller");
            listedAmount[nft][tokenId] += amount;

            if (price[nft][tokenId] != salePrice) {
                price[nft][tokenId] = salePrice; // allow price updates
            }
        }

        emit Listed(nft, tokenId, msg.sender, salePrice, amount);
    }

    // Buy
    function buy(address nft, uint256 tokenId, uint256 amount) external payable {
        require(isActive[nft][tokenId], "Inactive");
        require(amount > 0 && amount <= listedAmount[nft][tokenId], "Invalid amount");

        uint256 unitPrice = price[nft][tokenId];
        uint256 total = unitPrice * amount;
        require(msg.value >= total, "Insufficient ETH");

        address sellerAddr = seller[nft][tokenId];

        // Update listing
        listedAmount[nft][tokenId] -= amount;
        if (listedAmount[nft][tokenId] == 0) {
            isActive[nft][tokenId] = false;
        }

        // Transfer NFT
        IERC1155(nft).safeTransferFrom(address(this), msg.sender, tokenId, amount, "");

        // Pay seller
        payable(sellerAddr).transfer(total);

        // Refund excess
        if (msg.value > total) {
            payable(msg.sender).transfer(msg.value - total);
        }

        emit Sold(nft, tokenId, msg.sender, sellerAddr, unitPrice, amount);
    }

    // Cancel listing (partial or full)
    function cancel(address nft, uint256 tokenId, uint256 amount) external {
        require(isActive[nft][tokenId], "Inactive");
        require(seller[nft][tokenId] == msg.sender, "Not seller");
        require(amount > 0 && amount <= listedAmount[nft][tokenId], "Invalid amount");

        listedAmount[nft][tokenId] -= amount;

        if (listedAmount[nft][tokenId] == 0) {
            isActive[nft][tokenId] = false;
        }

        // Return NFT
        IERC1155(nft).safeTransferFrom(address(this), msg.sender, tokenId, amount, "");

        emit Cancelled(nft, tokenId, msg.sender, amount);
    }

    // ERC1155 Receiver
    function onERC1155Received(
        address, 
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4)
    {
        return this.onERC1155Received.selector;
    }
}
