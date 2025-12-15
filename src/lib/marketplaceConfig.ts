// lib/marketplaceConfig.ts

export const MARKETPLACE_ADDRESS = "0x62CcC999E33B698E4EDb89A415C9FDa4f1203BDA";

// ✅ seller 파라미터를 포함한 ABI
export const MARKETPLACE_ABI = ["function list(address nft, uint256 tokenId, uint256 salePrice, uint256 amount) external", "function buy(address nft, uint256 tokenId, address seller, uint256 amount) external payable", "function cancel(address nft, uint256 tokenId, uint256 amount) external", "function getListedAmount(address nft, uint256 tokenId, address seller) external view returns (uint256)", "function getListingInfo(address nft, uint256 tokenId, address seller) external view returns (uint256 pricePerUnit, uint256 amount, bool active)", "function isListed(address nft, uint256 tokenId, address seller) external view returns (bool)", "function getPrice(address nft, uint256 tokenId, address seller) external view returns (uint256)", "function getMarketplaceBalance(address nft, uint256 tokenId) external view returns (uint256)", "function listedAmount(address, uint256, address) external view returns (uint256)", "function price(address, uint256, address) external view returns (uint256)", "function isActive(address, uint256, address) external view returns (bool)"];

export const ERC1155_ABI = ["function isApprovedForAll(address owner, address operator) external view returns (bool)", "function setApprovalForAll(address operator, bool approved) external", "function balanceOf(address account, uint256 id) external view returns (uint256)", "function uri(uint256 id) external view returns (string)"];

export interface NFTContract {
  address: string;
  type: "ERC721" | "ERC1155";
}

export const NFT_CONTRACT_LIST: NFTContract[] = [
  { address: "0x3111565FCf79fD5b47AD5fe176AaB69C86Cc73FA", type: "ERC721" },
  { address: "0x1c1852FF164e169fFE759075384060BD26183724", type: "ERC1155" },
  { address: "0x40E3b5A7d76B1b447A98a5287a153BBc36C1615E", type: "ERC1155" },
];
