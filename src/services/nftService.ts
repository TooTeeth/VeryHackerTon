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
  category?: string;
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
  category?: string; // ✅ 추가
}

// NFT 컨트랙트 배열 타입
export interface NFTContract {
  address: string;
  type: "ERC721" | "ERC1155";
}

// IPFS 주소 변환
function resolveIPFS(url: string): string {
  console.log("🔗 [IPFS] 원본 URL:", url);
  if (!url) {
    console.warn("⚠️ [IPFS] URL이 비어있음 → placeholder 사용");
    return "/nft-placeholder.png";
  }
  if (url.startsWith("ipfs://")) {
    const resolved = url.replace("ipfs://", "https://ipfs.io/ipfs/");
    console.log("✅ [IPFS] 변환됨:", resolved);
    return resolved;
  }
  console.log("ℹ️ [IPFS] 변환 불필요:", url);
  return url;
}

// ERC721 NFT 조회
export async function fetchERC721NFT(contractAddress: string, tokenId: string) {
  console.log(`📦 [ERC721] 조회 시작: ${contractAddress} #${tokenId}`);
  const nft = new ethers.Contract(contractAddress, ERC721_ABI, provider);
  const rawUri = await nft.tokenURI(tokenId);
  console.log(`📄 [ERC721] tokenURI 원본:`, rawUri);
  const tokenUri = resolveIPFS(rawUri);

  console.log(`🌐 [ERC721] 메타데이터 fetch 시작:`, tokenUri);
  try {
    const response = await fetch(tokenUri);
    console.log(`📡 [ERC721] fetch 응답 상태:`, response.status, response.statusText);
    if (!response.ok) {
      console.error(`❌ [ERC721] fetch 실패:`, response.status, response.statusText);
      throw new Error(`HTTP ${response.status}`);
    }
    const metadata = await response.json();
    console.log(`✅ [ERC721] 메타데이터:`, metadata);
    console.log(`🖼️ [ERC721] 이미지 URL:`, metadata.image);

    return {
      tokenId,
      contractAddress,
      tokenType: "ERC721" as const,
      name: metadata.name ?? metadata.title ?? `#${tokenId}`,
      description: metadata.description ?? "",
      image: resolveIPFS(metadata.image),
      metadata,
      category: metadata.category ?? "전체",
    };
  } catch (error) {
    console.error(`❌ [ERC721] 메타데이터 로드 실패:`, error);
    throw error;
  }
}

// ERC1155 NFT 조회
export async function fetchERC1155NFT(contractAddress: string, tokenId: string, wallet: string) {
  console.log(`📦 [ERC1155] 조회 시작: ${contractAddress} #${tokenId} (지갑: ${wallet})`);
  const nft = new ethers.Contract(contractAddress, ERC1155_ABI, provider);
  const balance = await nft.balanceOf(wallet, tokenId);
  console.log(`💰 [ERC1155] 잔액:`, balance.toString());
  if (balance.toString() === "0") return null;

  let rawUri = await nft.uri(tokenId);
  console.log(`📄 [ERC1155] URI 원본:`, rawUri);
  rawUri = rawUri.replace("{id}", tokenId);
  console.log(`📄 [ERC1155] URI (id 치환):`, rawUri);
  const tokenUri = resolveIPFS(rawUri);

  console.log(`🌐 [ERC1155] 메타데이터 fetch 시작:`, tokenUri);
  try {
    const response = await fetch(tokenUri);
    console.log(`📡 [ERC1155] fetch 응답 상태:`, response.status, response.statusText);
    if (!response.ok) {
      console.error(`❌ [ERC1155] fetch 실패:`, response.status, response.statusText);
      throw new Error(`HTTP ${response.status}`);
    }
    const metadata = await response.json();
    console.log(`✅ [ERC1155] 메타데이터:`, metadata);
    console.log(`🖼️ [ERC1155] 이미지 URL:`, metadata.image);

    return {
      tokenId,
      contractAddress,
      tokenType: "ERC1155" as const,
      name: metadata.name ?? `#${tokenId}`,
      description: metadata.description ?? "",
      image: resolveIPFS(metadata.image),
      metadata,
      balance: balance.toString(),
      category: metadata.category ?? "전체",
    };
  } catch (error) {
    console.error(`❌ [ERC1155] 메타데이터 로드 실패:`, error);
    throw error;
  }
}

// 지갑 NFT 조회
export async function fetchUserNFTs(walletAddress: string, nftContracts: NFTContract[]) {
  const results: NFT[] = [];

  for (const { address, type } of nftContracts) {
    try {
      if (type === "ERC721") {
        const nft721 = new ethers.Contract(address, ERC721_ABI, provider);

        // 안전하게 tokenId 범위를 제한
        for (let tokenId = 50; tokenId <= 65; tokenId++) {
          try {
            const owner = await nft721.ownerOf(tokenId);
            if (owner.toLowerCase() !== walletAddress.toLowerCase()) continue;

            const nft = await fetchERC721NFT(address, tokenId.toString());
            results.push(nft);
          } catch {
            // 존재하지 않는 tokenId면 다음으로
            continue;
          }
        }
      } else if (type === "ERC1155") {
        for (let tokenId = 50; tokenId <= 65; tokenId++) {
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
