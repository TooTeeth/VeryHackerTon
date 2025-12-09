import { ethers } from "ethers";

// Very Network RPC
const VERY_RPC = "https://rpc.verylabs.io";
const provider = new ethers.JsonRpcProvider(VERY_RPC);

// ERC721 ABI
const ERC721_ABI = ["function ownerOf(uint256 tokenId) view returns (address)", "function tokenURI(uint256 tokenId) view returns (string)", "function name() view returns (string)"];

// ERC1155 ABI
const ERC1155_ABI = ["function balanceOf(address account, uint256 id) view returns (uint256)", "function uri(uint256 id) view returns (string)"];

// NFT 타입
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export interface NFT {
  tokenId: string;
  contractAddress: string;
  tokenType: "ERC721" | "ERC1155";
  name: string;
  description: string;
  image: string;
  metadata: NFTMetadata;
  balance?: string;
}

// NFT 컨트랙트 배열 타입
export interface NFTContract {
  address: string;
  type: "ERC721" | "ERC1155";
}

// IPFS 주소 변환
function resolveIPFS(url: string): string {
  if (!url) return "/nft-placeholder.png";
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return url;
}

// ERC721 NFT 조회
export async function fetchERC721NFT(contractAddress: string, tokenId: string) {
  const nft = new ethers.Contract(contractAddress, ERC721_ABI, provider);
  const rawUri = await nft.tokenURI(tokenId);
  const tokenUri = resolveIPFS(rawUri);
  const metadata = await fetch(tokenUri).then((r) => r.json());

  return {
    tokenId,
    contractAddress,
    tokenType: "ERC721" as const,
    name: metadata.name ?? metadata.title ?? `#${tokenId}`,
    description: metadata.description ?? "",
    image: resolveIPFS(metadata.image),
    metadata,
  };
}

// ERC1155 NFT 조회
export async function fetchERC1155NFT(contractAddress: string, tokenId: string, wallet: string) {
  const nft = new ethers.Contract(contractAddress, ERC1155_ABI, provider);
  const balance = await nft.balanceOf(wallet, tokenId);
  if (balance.toString() === "0") return null;

  let rawUri = await nft.uri(tokenId);
  rawUri = rawUri.replace("{id}", tokenId);
  const tokenUri = resolveIPFS(rawUri);

  const metadata = await fetch(tokenUri).then((r) => r.json());

  return {
    tokenId,
    contractAddress,
    tokenType: "ERC1155" as const,
    name: metadata.name ?? `#${tokenId}`,
    description: metadata.description ?? "",
    image: resolveIPFS(metadata.image),
    metadata,
    balance: balance.toString(),
  };
}

// 지갑 NFT 조회
export async function fetchUserNFTs(walletAddress: string, nftContracts: NFTContract[]) {
  const results: NFT[] = [];

  for (const { address, type } of nftContracts) {
    try {
      if (type === "ERC721") {
        const nft721 = new ethers.Contract(address, ERC721_ABI, provider);

        // 안전하게 tokenId 범위를 제한
        for (let tokenId = 50; tokenId <= 52; tokenId++) {
          try {
            const owner = await nft721.ownerOf(tokenId);
            if (owner.toLowerCase() !== walletAddress.toLowerCase()) continue;

            const nft = await fetchERC721NFT(address, tokenId.toString());
            results.push(nft);
          } catch (err) {
            // 존재하지 않는 tokenId면 다음으로
            continue;
          }
        }
      } else if (type === "ERC1155") {
        for (let tokenId = 50; tokenId <= 52; tokenId++) {
          try {
            const nft = await fetchERC1155NFT(address, tokenId.toString(), walletAddress);
            if (nft) results.push(nft);
          } catch (err) {
            console.error(`ERC1155 조회 실패: ${address} tokenId: ${tokenId}`, err);
          }
        }
      }
    } catch (err) {
      console.error(`NFT 조회 실패: ${address}`, err);
    }
  }

  return results;
}
