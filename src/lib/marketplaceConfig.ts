// lib/marketplaceConfig.ts

export const MARKETPLACE_ADDRESS = "0xe7ab0d36191aF4f5d9ACD98210544fAC48A09eC1";

export const MARKETPLACE_ABI = ["function list(address nft, uint256 tokenId, uint256 price, uint256 amount) external", "function buy(address nft, uint256 tokenId, uint256 amount) external payable", "function cancel(address nft, uint256 tokenId, uint256 amount) external", "function cancelAll(address nft, uint256 tokenId) external", "function getInfo(address nft, uint256 tokenId) external view returns (address seller, uint256 price, uint256 amount, bool isActive)", "function listedAmount(address nft, uint256 tokenId) external view returns (uint256)"];

export const ERC1155_ABI = ["function isApprovedForAll(address owner, address operator) external view returns (bool)", "function setApprovalForAll(address operator, bool approved) external", "function balanceOf(address account, uint256 id) external view returns (uint256)"];

export interface NFTContract {
  address: string;
  type: "ERC721" | "ERC1155";
}

export const NFT_CONTRACT_LIST: NFTContract[] = [
  { address: "0x3111565FCf79fD5b47AD5fe176AaB69C86Cc73FA", type: "ERC721" },
  { address: "0x1c1852FF164e169fFE759075384060BD26183724", type: "ERC1155" },
  { address: "0x40E3b5A7d76B1b447A98a5287a153BBc36C1615E", type: "ERC1155" },
];
