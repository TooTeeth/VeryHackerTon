// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;


//0x62CcC999E33B698E4EDb89A415C9FDa4f1203BDA

interface IERC1155 {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

interface IERC1155Receiver {
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}



contract SimpleNFTMarketplace is IERC1155Receiver {

    // ✅ 변경: 각 판매자별로 리스팅 정보 저장
    // mapping: nft주소 => tokenId => 판매자주소 => 리스팅정보
    mapping(address => mapping(uint256 => mapping(address => uint256))) public listedAmount;
    mapping(address => mapping(uint256 => mapping(address => uint256))) public price;
    mapping(address => mapping(uint256 => mapping(address => bool))) public isActive;

    event Listed(address indexed nft, uint256 indexed tokenId, address seller, uint256 price, uint256 amount);
    event Sold(address indexed nft, uint256 indexed tokenId, address buyer, address seller, uint256 price, uint256 amount);
    event Cancelled(address indexed nft, uint256 indexed tokenId, address seller, uint256 amount);

    // ✅ 수정된 list 함수 - 누구나 등록 가능
    function list(address nft, uint256 tokenId, uint256 salePrice, uint256 amount) external {
        require(salePrice != 0 && amount != 0, "Invalid input");

        IERC1155 nftContract = IERC1155(nft);
        require(nftContract.isApprovedForAll(msg.sender, address(this)), "Not approved");

        // NFT를 마켓플레이스로 전송
        nftContract.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");

        // 판매자별로 리스팅 정보 저장
        listedAmount[nft][tokenId][msg.sender] += amount;
        price[nft][tokenId][msg.sender] = salePrice;
        isActive[nft][tokenId][msg.sender] = true;

        emit Listed(nft, tokenId, msg.sender, salePrice, amount);
    }

    // ✅ 수정된 buy 함수 - 특정 판매자로부터 구매
    function buy(address nft, uint256 tokenId, address seller, uint256 amount) external payable {
        require(isActive[nft][tokenId][seller], "Not listed by this seller");
        
        uint256 listed = listedAmount[nft][tokenId][seller];
        uint256 unitPrice = price[nft][tokenId][seller];
        
        require(amount != 0 && amount <= listed, "Invalid amount");

        uint256 total = unitPrice * amount;
        require(msg.value >= total, "Insufficient ETH");

        // 상태 업데이트
        uint256 remaining = listed - amount;
        listedAmount[nft][tokenId][seller] = remaining;
        
        if (remaining == 0) {
            isActive[nft][tokenId][seller] = false;
        }

        // NFT 전송
        IERC1155(nft).safeTransferFrom(address(this), msg.sender, tokenId, amount, "");

        // 판매자에게 대금 지불
        (bool success, ) = seller.call{value: total}("");
        require(success, "Transfer failed");

        // 잔돈 환불
        if (msg.value > total) {
            (success, ) = msg.sender.call{value: msg.value - total}("");
            require(success, "Refund failed");
        }

        emit Sold(nft, tokenId, msg.sender, seller, unitPrice, amount);
    }

    // ✅ 수정된 cancel 함수
    function cancel(address nft, uint256 tokenId, uint256 amount) external {
        uint256 listed = listedAmount[nft][tokenId][msg.sender];
        require(amount != 0 && amount <= listed, "Invalid amount");

        uint256 remaining = listed - amount;
        listedAmount[nft][tokenId][msg.sender] = remaining;
        
        if (remaining == 0) {
            isActive[nft][tokenId][msg.sender] = false;
        }

        // NFT 반환
        IERC1155(nft).safeTransferFrom(address(this), msg.sender, tokenId, amount, "");

        emit Cancelled(nft, tokenId, msg.sender, amount);
    }

    // ✅ View 함수들 - 특정 판매자의 정보 조회
    function getListingInfo(address nft, uint256 tokenId, address seller) external view returns (
        uint256 pricePerUnit,
        uint256 amount,
        bool active
    ) {
        return (
            price[nft][tokenId][seller],
            listedAmount[nft][tokenId][seller],
            isActive[nft][tokenId][seller]
        );
    }

    function getListedAmount(address nft, uint256 tokenId, address seller) external view returns (uint256) {
        return listedAmount[nft][tokenId][seller];
    }

    function getPrice(address nft, uint256 tokenId, address seller) external view returns (uint256) {
        return price[nft][tokenId][seller];
    }

    function isListed(address nft, uint256 tokenId, address seller) external view returns (bool) {
        return isActive[nft][tokenId][seller];
    }

    function getMarketplaceBalance(address nft, uint256 tokenId) external view returns (uint256) {
        return IERC1155(nft).balanceOf(address(this), tokenId);
    }

    function onERC1155Received(address, address, uint256, uint256, bytes calldata) 
        external 
        pure 
        override 
        returns (bytes4) 
    {
        return this.onERC1155Received.selector;
    }
    function onERC1155BatchReceived(
    address,
    address,
    uint256[] calldata,
    uint256[] calldata,
    bytes calldata
)
    external
    pure
    override
    returns (bytes4)
{
    return this.onERC1155BatchReceived.selector;
}

}