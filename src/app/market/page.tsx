"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
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

const MARKETPLACE_ADDRESS = "0xe7ab0d36191aF4f5d9ACD98210544fAC48A09eC1";

const MARKETPLACE_ABI = ["function list(address nft, uint256 tokenId, uint256 price, uint256 amount) external", "function buy(address nft, uint256 tokenId, uint256 amount) external payable", "function cancel(address nft, uint256 tokenId, uint256 amount) external", "function cancelAll(address nft, uint256 tokenId) external", "function getInfo(address nft, uint256 tokenId) external view returns (address seller, uint256 price, uint256 amount, bool isActive)", "function listedAmount(address nft, uint256 tokenId) external view returns (uint256)"];

const ERC1155_ABI = ["function isApprovedForAll(address owner, address operator) external view returns (bool)", "function setApprovalForAll(address operator, bool approved) external", "function balanceOf(address account, uint256 id) external view returns (uint256)"];

export default function NFTMarketplace() {
  const { wallet } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [listings, setListings] = useState<Record<string, Listing>>({});
  const [listedAmounts, setListedAmounts] = useState<Record<string, number>>({});
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
      const listedAmountsMap: Record<string, number> = {};

      for (const nft of userNFTs) {
        try {
          const listing = await getListingByNFT(nft.contractAddress, nft.tokenId);
          if (listing) {
            const key = `${nft.contractAddress}-${nft.tokenId}`;
            listingsMap[key] = listing;

            // Get listed amount from blockchain
            if (window.ethereum) {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
              const amount = await marketplace.listedAmount(nft.contractAddress, nft.tokenId);
              listedAmountsMap[key] = Number(amount);
            }
          }
        } catch (err) {
          console.warn("Listing 조회 실패:", nft.contractAddress, nft.tokenId, err);
        }
      }

      setListings(listingsMap);
      setListedAmounts(listedAmountsMap);
    } catch (error: any) {
      console.error("NFT 로드 실패:", error);
      toast.error(error?.message || "NFT를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleListNFT = async (listingData: { price: string; amount: number }) => {
    if (!selectedNFT || !wallet?.address || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const nftAddress = selectedNFT.contractAddress;
      const tokenId = selectedNFT.tokenId;
      const priceInWei = ethers.parseEther(listingData.price);
      const amount = listingData.amount;

      console.log("등록 요청:", { nftAddress, tokenId, priceInWei: priceInWei.toString(), amount });

      const nft1155 = new ethers.Contract(nftAddress, ERC1155_ABI, signer);

      // 1️⃣ Approval
      toast.info("NFT 권한 확인 중...");
      const isApproved = await nft1155.isApprovedForAll(wallet.address, MARKETPLACE_ADDRESS);

      if (!isApproved) {
        toast.info("마켓플레이스 승인 필요 - MetaMask 확인하세요");
        const approveTx = await nft1155.setApprovalForAll(MARKETPLACE_ADDRESS, true);
        toast.info("승인 트랜잭션 대기 중...");
        await approveTx.wait();
        toast.success("✅ 마켓플레이스 승인 완료!");
      }

      // 2️⃣ List with amount
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      toast.info(`NFT ${amount}개 등록 중...`);
      const listTx = await marketplace.list(nftAddress, tokenId, priceInWei, amount);
      toast.info("등록 트랜잭션 대기 중...");
      const receipt = await listTx.wait();

      toast.success("🎉 블록체인 등록 완료!");

      // 3️⃣ Supabase
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
      await loadNFTs();
    } catch (error: any) {
      console.error("등록 실패:", error);
      let errorMsg = "등록에 실패했습니다";
      if (error.code === "ACTION_REJECTED") {
        errorMsg = "사용자가 트랜잭션을 거부했습니다";
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast.error(errorMsg);
    }
  };

  const handleCancelListing = async (nft: NFT, amount: number) => {
    if (!wallet?.address || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      toast.info(`${amount}개 취소 중...`);
      const tx = await marketplace.cancel(nft.contractAddress, nft.tokenId, amount);
      await tx.wait();

      toast.success("✅ 취소 완료!");
      await loadNFTs();
    } catch (error: any) {
      console.error("취소 실패:", error);
      toast.error(error.message || "취소에 실패했습니다");
    }
  };

  const handleCancelAll = async (nft: NFT) => {
    if (!wallet?.address || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      toast.info("전체 취소 중...");
      const tx = await marketplace.cancelAll(nft.contractAddress, nft.tokenId);
      await tx.wait();

      toast.success("✅ 전체 취소 완료!");
      await loadNFTs();
    } catch (error: any) {
      console.error("취소 실패:", error);
      toast.error(error.message || "취소에 실패했습니다");
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
        </div>
      </div>
    );
  }

  return (
    <div className="text-white min-h-screen p-6 bg-zinc-900">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" toastStyle={{ marginTop: "80px" }} />

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 mt-20">
          <p className="text-3xl font-bold">🎨 My NFTs</p>
          <Link href="/market/buy">
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold transition transform hover:scale-105 shadow-lg">🛒 마켓플레이스 보러가기</button>
          </Link>
        </div>

        <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-400">연결된 지갑</p>
          <p className="font-mono text-blue-400">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
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
            {sortedNFTs.map((nft) => {
              const key = `${nft.contractAddress}-${nft.tokenId}`;
              return <NFTCard key={key} nft={nft} listing={listings[key]} listedAmount={listedAmounts[key] || 0} onList={() => setSelectedNFT(nft)} onCancel={(amount) => handleCancelListing(nft, amount)} onCancelAll={() => handleCancelAll(nft)} />;
            })}
          </div>
        )}
      </div>

      {selectedNFT && <ListModal nft={selectedNFT} onClose={() => setSelectedNFT(null)} onSubmit={handleListNFT} />}
    </div>
  );
}

function NFTCard({ nft, listing, listedAmount, onList, onCancel, onCancelAll }: { nft: NFT; listing?: Listing; listedAmount: number; onList: () => void; onCancel: (amount: number) => void; onCancelAll: () => void }) {
  const [cancelAmount, setCancelAmount] = useState(1);
  const totalBalance = parseInt(nft.balance || "1");
  const availableToList = totalBalance + listedAmount;

  return (
    <div className="bg-zinc-800 rounded-lg overflow-hidden hover:shadow-xl transition duration-200">
      <div className="relative aspect-square bg-zinc-700">
        <Image src={nft.image} alt={nft.name} fill className="object-cover" unoptimized />
        {nft.tokenType === "ERC1155" && <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs">보유: {totalBalance}개</div>}
        {listing && listedAmount > 0 && <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs">판매: {listedAmount}개</div>}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 truncate">{nft.name}</h3>
        <p className="text-zinc-400 text-xs mb-3 truncate">{nft.description || "No description"}</p>

        {listing && listedAmount > 0 ? (
          <div className="space-y-2">
            <div className="bg-green-600/20 border border-green-600 rounded px-3 py-2">
              <p className="text-green-400 text-sm">판매 중 ({listedAmount}개)</p>
              <p className="text-white font-bold">{(parseInt(listing.price || "0") / 1e18).toFixed(4)} ETH</p>
            </div>
            <div className="flex gap-2 items-center">
              <input type="number" min="1" max={listedAmount} value={cancelAmount} onChange={(e) => setCancelAmount(Math.min(parseInt(e.target.value) || 1, listedAmount))} className="w-16 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm" />
              <button onClick={() => onCancel(cancelAmount)} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-1 rounded text-sm">
                취소
              </button>
            </div>
            <button onClick={onCancelAll} className="w-full bg-red-600 hover:bg-red-700 text-white py-1 rounded text-sm">
              전체 취소
            </button>
            {totalBalance > 0 && (
              <button onClick={onList} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1 rounded text-sm">
                추가 등록 ({totalBalance}개 가능)
              </button>
            )}
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

function ListModal({ nft, onClose, onSubmit }: { nft: NFT; onClose: () => void; onSubmit: (data: { price: string; amount: number }) => void }) {
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);

  const maxAmount = parseInt(nft.balance || "1");

  const handleSubmit = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error("올바른 가격을 입력하세요");
      return;
    }
    if (amount <= 0 || amount > maxAmount) {
      toast.error(`수량은 1~${maxAmount} 사이여야 합니다`);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ price, amount });
    } finally {
      setLoading(false);
    }
  };

  const handleListAll = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast.error("올바른 가격을 입력하세요");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ price, amount: maxAmount });
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
            <label className="block text-sm font-medium mb-2">판매 가격 (ETH/개)</label>
            <input type="number" step="0.001" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">수량 (최대: {maxAmount})</label>
            <input type="number" min="1" max={maxAmount} value={amount} onChange={(e) => setAmount(Math.min(parseInt(e.target.value) || 1, maxAmount))} className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white" />
          </div>

          <div className="bg-blue-600/20 border border-blue-600 rounded p-3">
            <p className="text-blue-400 text-sm">ℹ️ NFT가 마켓플레이스로 전송됩니다</p>
            <p className="text-zinc-400 text-xs mt-1">총 가격: {(parseFloat(price || "0") * amount).toFixed(4)} ETH</p>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={!price || loading} className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white py-3 rounded font-medium transition">
              {loading ? "처리 중..." : `${amount}개 등록`}
            </button>
            <button onClick={handleListAll} disabled={!price || loading} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-zinc-600 text-white py-3 rounded font-medium transition">
              {loading ? "처리 중..." : "전체 등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
