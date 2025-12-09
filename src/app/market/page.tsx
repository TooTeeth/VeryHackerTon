"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useWallet } from "../context/WalletContext";
import { createListing, createTransaction, getListingByNFT, Listing } from "../../lib/supabaseMarketplace";
import { fetchUserNFTs, NFT, NFTContract } from "../../lib/nftService";
import { ethers } from "ethers";

const NFT_CONTRACT_LIST: NFTContract[] = [
  { address: "0x3111565FCf79fD5b47AD5fe176AaB69C86Cc73FA", type: "ERC721" },
  { address: "0x1c1852FF164e169fFE759075384060BD26183724", type: "ERC1155" },
  { address: "0x40E3b5A7d76B1b447A98a5287a153BBc36C1615E", type: "ERC1155" },
];

// 마켓플레이스 컨트랙트 주소
const MARKETPLACE_ADDRESS = "0x7A89d1bCDA563e821be1EAb2C14F835eEeBb0536";

// 마켓플레이스 ABI
const MARKETPLACE_ABI = ["function list(address nft, uint256 tokenId, uint256 price) external", "function buy(address nft, uint256 tokenId) external payable", "function cancel(address nft, uint256 tokenId) external", "function getInfo(address nft, uint256 tokenId) external view returns (address seller, uint256 price)", "function price(address nft, uint256 tokenId) external view returns (uint256)", "function seller(address nft, uint256 tokenId) external view returns (address)", "function marketplaceBalance(address nft, uint256 tokenId) external view returns (uint256)"];

// ERC1155 ABI
const ERC1155_ABI = ["function isApprovedForAll(address owner, address operator) external view returns (bool)", "function setApprovalForAll(address operator, bool approved) external", "function balanceOf(address account, uint256 id) external view returns (uint256)"];

export default function NFTMarketplace() {
  const { wallet } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "price">("recent");

  useEffect(() => {
    if (wallet?.address) {
      loadNFTs();
    }
  }, [wallet]);

  const loadNFTs = async () => {
    if (!wallet?.address) return;

    setLoading(true);
    try {
      const userNFTs = await fetchUserNFTs(wallet.address, NFT_CONTRACT_LIST);
      console.log("User NFTs:", userNFTs);
      setNfts(userNFTs);

      const listingsMap: Record<string, Listing> = {};
      for (const nft of userNFTs) {
        try {
          const listing = await getListingByNFT(nft.contractAddress, nft.tokenId);
          if (listing) {
            listingsMap[`${nft.contractAddress}-${nft.tokenId}`] = listing;
          }
        } catch (err) {
          console.warn("Listing 조회 실패:", nft.contractAddress, nft.tokenId, err);
        }
      }

      setListings(listingsMap);
    } catch (error: any) {
      console.error("NFT 로드 실패:", error);
      toast.error(error?.message || "NFT를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleListNFT = async (listingData: { price: string }) => {
    if (!selectedNFT || !wallet?.address || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const nftAddress = selectedNFT.contractAddress;
      const tokenId = selectedNFT.tokenId;
      const priceInWei = ethers.parseEther(listingData.price);

      console.log("등록 요청:", { nftAddress, tokenId, priceInWei: priceInWei.toString() });

      // ERC1155 컨트랙트
      const nft1155 = new ethers.Contract(nftAddress, ERC1155_ABI, signer);

      // 1️⃣ Approval 체크 및 설정
      toast.info("NFT 권한 확인 중...");
      const isApproved = await nft1155.isApprovedForAll(wallet.address, MARKETPLACE_ADDRESS);

      if (!isApproved) {
        toast.info("마켓플레이스 승인 필요 - MetaMask 확인하세요");
        const approveTx = await nft1155.setApprovalForAll(MARKETPLACE_ADDRESS, true);
        toast.info("승인 트랜잭션 대기 중...");
        await approveTx.wait();
        toast.success("✅ 마켓플레이스 승인 완료!");
      } else {
        toast.info("✅ 이미 승인되어 있습니다");
      }

      // 2️⃣ 마켓플레이스에 NFT 등록
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      toast.info("NFT 등록 중... (MetaMask 확인)");
      const listTx = await marketplace.list(nftAddress, tokenId, priceInWei);
      toast.info("등록 트랜잭션 대기 중...");
      const receipt = await listTx.wait();

      toast.success("🎉 블록체인 등록 완료!");

      // 3️⃣ Supabase에 기록
      toast.info("데이터베이스 저장 중...");

      const newListing = await createListing({
        contract_address: nftAddress,
        token_id: tokenId,
        seller_address: wallet.address,
        sale_type: "fixed",
        price: priceInWei.toString(),
        status: "active",
      });

      await createTransaction({
        contract_address: nftAddress,
        token_id: tokenId,
        from_address: wallet.address,
        to_address: MARKETPLACE_ADDRESS,
        price: priceInWei.toString(),
        transaction_hash: receipt.hash,
        transaction_type: "sale",
      });

      setListings((prev) => ({
        ...prev,
        [`${nftAddress}-${tokenId}`]: newListing,
      }));

      toast.success("✅ NFT 등록 완료!");
      setSelectedNFT(null);

      // NFT 목록 새로고침
      await loadNFTs();
    } catch (error: any) {
      console.error("등록 실패:", error);

      let errorMsg = "등록에 실패했습니다";

      if (error.code === "ACTION_REJECTED") {
        errorMsg = "사용자가 트랜잭션을 거부했습니다";
      } else if (error.message?.includes("Already listed")) {
        errorMsg = "이미 등록된 NFT입니다";
      } else if (error.message?.includes("Insufficient balance")) {
        errorMsg = "NFT 잔액이 부족합니다";
      } else if (error.message?.includes("Marketplace not approved")) {
        errorMsg = "마켓플레이스 승인이 필요합니다";
      } else if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast.error(errorMsg);
    }
  };

  const sortedNFTs = [...nfts].sort((a, b) => {
    if (sortBy === "price") {
      const aPrice = listings[`${a.contractAddress}-${a.tokenId}`]?.price || "0";
      const bPrice = listings[`${b.contractAddress}-${b.tokenId}`]?.price || "0";
      return parseInt(bPrice) - parseInt(aPrice);
    }
    return 0;
  });

  if (!wallet) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-4">NFT Marketplace</h1>
          <p className="text-zinc-400 mb-6">NFT를 보려면 먼저 지갑을 연결해주세요</p>
          <p className="text-sm text-zinc-500">Swap 페이지에서 지갑을 연결할 수 있습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white min-h-screen p-6 bg-zinc-900">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" toastStyle={{ marginTop: "80px" }} />

      <div className="max-w-7xl mx-auto">
        <p className="text-3xl font-bold mb-6 mt-20 text-center">🎨 NFT Marketplace</p>

        <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-400">연결된 지갑</p>
          <p className="font-mono text-blue-400">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">지갑 타입: {wallet.type === "metamask" ? "MetaMask" : "Wepin"}</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-yellow-400">🔥 보유 중인 NFT ({nfts.length})</h2>
          <div className="flex gap-3">
            <button onClick={() => setSortBy("recent")} className={`px-4 py-2 rounded text-sm transition ${sortBy === "recent" ? "bg-blue-600" : "bg-zinc-700 hover:bg-zinc-600"}`}>
              최근순
            </button>
            <button onClick={() => setSortBy("price")} className={`px-4 py-2 rounded text-sm transition ${sortBy === "price" ? "bg-blue-600" : "bg-zinc-700 hover:bg-zinc-600"}`}>
              가격순
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-zinc-400">NFT 불러오는 중...</p>
          </div>
        ) : nfts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-zinc-400">보유한 NFT가 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {sortedNFTs.map((nft) => (
              <NFTCard key={`${nft.contractAddress}-${nft.tokenId}`} nft={nft} listing={listings[`${nft.contractAddress}-${nft.tokenId}`]} onList={() => setSelectedNFT(nft)} />
            ))}
          </div>
        )}
      </div>

      {selectedNFT && <ListModal nft={selectedNFT} onClose={() => setSelectedNFT(null)} onSubmit={handleListNFT} />}
    </div>
  );
}

function NFTCard({ nft, listing, onList }: { nft: NFT; listing?: Listing; onList: () => void }) {
  return (
    <div className="bg-zinc-800 rounded-lg overflow-hidden hover:shadow-xl transition duration-200">
      <div className="relative aspect-square bg-zinc-700">
        <Image src={nft.image} alt={nft.name} fill className="object-cover" unoptimized />
        {nft.tokenType === "ERC1155" && nft.balance && <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs">x{nft.balance}</div>}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 truncate">{nft.name}</h3>
        <p className="text-zinc-400 text-xs mb-3 truncate">{nft.description || "No description"}</p>

        {listing ? (
          <div className="bg-green-600/20 border border-green-600 rounded px-3 py-2">
            <p className="text-green-400 text-sm">판매 중</p>
            <p className="text-white font-bold">{(parseInt(listing.price || "0") / 1e18).toFixed(4)} ETH</p>
          </div>
        ) : (
          <button onClick={onList} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition">
            마켓에 등록
          </button>
        )}
      </div>
    </div>
  );
}

function ListModal({ nft, onClose, onSubmit }: { nft: NFT; onClose: () => void; onSubmit: (data: { price: string }) => void }) {
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error("올바른 가격을 입력하세요");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ price });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">NFT 판매 등록</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mb-4 relative h-48">
          <Image src={nft.image} alt={nft.name} fill className="object-cover rounded-lg" unoptimized />
        </div>
        <h3 className="font-semibold mb-4">{nft.name}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">판매 가격 (ETH)</label>
            <input type="number" step="0.001" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white" />
          </div>

          <div className="bg-blue-600/20 border border-blue-600 rounded p-3">
            <p className="text-blue-400 text-sm">ℹ️ NFT가 마켓플레이스로 전송됩니다</p>
            <p className="text-zinc-400 text-xs mt-1">구매자가 구매하면 자동으로 전송됩니다</p>
          </div>

          <button onClick={handleSubmit} disabled={!price || loading} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white py-3 rounded font-medium transition">
            {loading ? "처리 중..." : "등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
