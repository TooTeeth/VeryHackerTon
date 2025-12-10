"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useWallet } from "../../context/WalletContext";
import { getActiveListings, Listing } from "../../../lib/supabaseMarketplace";
import { ethers } from "ethers";
import { MARKETPLACE_ADDRESS, MARKETPLACE_ABI } from "../../../lib/marketplaceConfig";

interface MarketNFT extends Listing {
  metadata?: {
    name: string;
    description: string;
    image: string;
    category?: string;
  };
  listedAmount?: number;
}

type Category = "전체" | "무기" | "신발" | "장갑" | "바지" | "상의" | "망토" | "투구" | "장신구" | "칭호" | "스킬";

const CATEGORIES: Category[] = ["전체", "무기", "신발", "장갑", "바지", "상의", "망토", "투구", "장신구", "칭호", "스킬"];

// Mock function to get category from tokenId or metadata
const getCategoryFromNFT = (tokenId: string, metadata?: any): Category => {
  const id = parseInt(tokenId);
  if (id >= 100 && id < 110) return "무기";
  if (id >= 110 && id < 120) return "신발";
  if (id >= 120 && id < 130) return "장갑";
  if (id >= 130 && id < 140) return "바지";
  if (id >= 140 && id < 150) return "상의";
  if (id >= 150 && id < 160) return "망토";
  if (id >= 160 && id < 170) return "투구";
  if (id >= 170 && id < 180) return "장신구";
  if (id >= 180 && id < 190) return "칭호";
  if (id >= 190 && id < 200) return "스킬";
  return "전체";
};

export default function MarketplaceBuy() {
  const { wallet } = useWallet();
  const [listings, setListings] = useState<MarketNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "low" | "high">("recent");
  const [selectedNFT, setSelectedNFT] = useState<MarketNFT | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");

  useEffect(() => {
    loadMarketplace();
  }, []);

  const loadMarketplace = async () => {
    setLoading(true);
    try {
      const activeListings = await getActiveListings();

      // 같은 NFT(contract_address + token_id)는 하나만 표시하도록 중복 제거
      const uniqueListingsMap = new Map<string, Listing>();
      activeListings.forEach((listing) => {
        const key = `${listing.contract_address}-${listing.token_id}`;
        // 같은 NFT가 여러 개 있으면 최신 것만 유지
        if (!uniqueListingsMap.has(key)) {
          uniqueListingsMap.set(key, listing);
        } else {
          const existing = uniqueListingsMap.get(key)!;
          if (new Date(listing.created_at || 0) > new Date(existing.created_at || 0)) {
            uniqueListingsMap.set(key, listing);
          }
        }
      });

      const uniqueListings = Array.from(uniqueListingsMap.values());

      // Fetch metadata and listed amounts
      const listingsWithData = await Promise.all(
        uniqueListings.map(async (listing) => {
          try {
            let listedAmount = 0;

            // Get listed amount from blockchain
            if (window.ethereum) {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
              const amount = await marketplace.listedAmount(listing.contract_address, listing.token_id);
              listedAmount = Number(amount);
            }

            // Mock metadata - 실제로는 IPFS나 API에서 가져옵니다
            const metadata = {
              name: `NFT #${listing.token_id}`,
              description: "Epic item for your adventure",
              image: "/nft-placeholder.png",
              category: getCategoryFromNFT(listing.token_id),
            };

            return {
              ...listing,
              metadata,
              listedAmount,
            };
          } catch (err) {
            console.error("메타데이터 로드 실패:", err);
            return {
              ...listing,
              metadata: {
                name: `NFT #${listing.token_id}`,
                description: "No description available",
                image: "/nft-placeholder.png",
                category: "전체" as Category,
              },
              listedAmount: 0,
            };
          }
        })
      );

      setListings(listingsWithData.filter((l) => l.listedAmount && l.listedAmount > 0));
    } catch (error: any) {
      console.error("마켓플레이스 로드 실패:", error);
      toast.error("마켓플레이스를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNFT = async (listing: MarketNFT, amount: number) => {
    if (!wallet?.address || !window.ethereum) {
      toast.error("지갑을 먼저 연결해주세요");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const pricePerUnit = BigInt(listing.price || "0");
      const totalPrice = pricePerUnit * BigInt(amount);

      toast.info(`${amount}개 구매 중...`);

      const tx = await marketplace.buy(listing.contract_address, listing.token_id, amount, { value: totalPrice });

      toast.info("트랜잭션 대기 중...");
      await tx.wait();

      toast.success("🎉 구매 완료!");
      setSelectedNFT(null);
      await loadMarketplace();
    } catch (error: any) {
      console.error("구매 실패:", error);
      let errorMsg = "구매에 실패했습니다";

      if (error.code === "ACTION_REJECTED") {
        errorMsg = "사용자가 트랜잭션을 거부했습니다";
      } else if (error.message?.includes("Insufficient payment")) {
        errorMsg = "지불 금액이 부족합니다";
      } else if (error.message?.includes("Invalid amount")) {
        errorMsg = "잘못된 수량입니다";
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast.error(errorMsg);
    }
  };

  const handleCancelListing = async (listing: MarketNFT, amount: number) => {
    if (!wallet?.address || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      toast.info(`${amount}개 취소 중...`);
      const tx = await marketplace.cancel(listing.contract_address, listing.token_id, amount);
      await tx.wait();

      toast.success("✅ 취소 완료!");
      await loadMarketplace();
    } catch (error: any) {
      console.error("취소 실패:", error);
      toast.error(error.message || "취소에 실패했습니다");
    }
  };

  // Filter and sort listings
  const filteredAndSortedListings = listings
    .filter((listing) => {
      // Category filter
      if (selectedCategory !== "전체" && listing.metadata?.category !== selectedCategory) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = listing.metadata?.name?.toLowerCase() || "";
        const tokenId = listing.token_id.toLowerCase();
        const description = listing.metadata?.description?.toLowerCase() || "";

        return name.includes(query) || tokenId.includes(query) || description.includes(query);
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "low") {
        return parseInt(a.price || "0") - parseInt(b.price || "0");
      } else if (sortBy === "high") {
        return parseInt(b.price || "0") - parseInt(a.price || "0");
      }
      // recent
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  return (
    <div className="text-white min-h-screen p-6 bg-zinc-900">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" toastStyle={{ marginTop: "80px" }} />

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 mt-20">
          <p className="text-3xl font-bold">🛒 NFT Marketplace</p>
          <Link href="/marketplace">
            <button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-6 py-3 rounded-lg font-semibold transition transform hover:scale-105 shadow-lg">📦 내 NFT 보러가기</button>
          </Link>
        </div>

        {wallet && (
          <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
            <p className="text-sm text-zinc-400">연결된 지갑</p>
            <p className="font-mono text-blue-400">
              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
            </p>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input type="text" placeholder="🔍 NFT 이름이나 토큰 ID로 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 pl-12 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xl">🔍</div>
          </div>

          {/* Category Filter */}
          <div className="bg-zinc-800 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-3">카테고리</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button key={category} onClick={() => setSelectedCategory(category)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedCategory === category ? "bg-purple-600 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}`}>
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-yellow-400">🔥 판매 중인 NFT ({filteredAndSortedListings.length})</h2>
          <div className="flex gap-3">
            <button onClick={() => setSortBy("recent")} className={`px-4 py-2 rounded text-sm transition ${sortBy === "recent" ? "bg-blue-600" : "bg-zinc-700 hover:bg-zinc-600"}`}>
              최근순
            </button>
            <button onClick={() => setSortBy("low")} className={`px-4 py-2 rounded text-sm transition ${sortBy === "low" ? "bg-blue-600" : "bg-zinc-700 hover:bg-zinc-600"}`}>
              최저가
            </button>
            <button onClick={() => setSortBy("high")} className={`px-4 py-2 rounded text-sm transition ${sortBy === "high" ? "bg-blue-600" : "bg-zinc-700 hover:bg-zinc-600"}`}>
              최고가
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-zinc-400">마켓플레이스 불러오는 중...</p>
          </div>
        ) : filteredAndSortedListings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🪐</div>
            <p className="text-zinc-400">{searchQuery || selectedCategory !== "전체" ? "검색 결과가 없습니다" : "현재 판매 중인 NFT가 없습니다"}</p>
            {(searchQuery || selectedCategory !== "전체") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("전체");
                }}
                className="mt-4 text-blue-400 hover:text-blue-300 underline"
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {filteredAndSortedListings.map((listing, index) => (
              <MarketNFTCard key={`${listing.contract_address}-${listing.token_id}-${index}`} listing={listing} onBuy={() => setSelectedNFT(listing)} onCancel={(amount) => handleCancelListing(listing, amount)} isOwner={wallet?.address?.toLowerCase() === listing.seller_address.toLowerCase()} />
            ))}
          </div>
        )}
      </div>

      {selectedNFT && <BuyModal listing={selectedNFT} onClose={() => setSelectedNFT(null)} onBuy={handleBuyNFT} />}
    </div>
  );
}

function MarketNFTCard({ listing, onBuy, onCancel, isOwner }: { listing: MarketNFT; onBuy: () => void; onCancel: (amount: number) => void; isOwner: boolean }) {
  const [cancelAmount, setCancelAmount] = useState(1);
  const priceInEth = (parseInt(listing.price || "0") / 1e18).toFixed(4);
  const maxAmount = listing.listedAmount || 1;

  return (
    <div className="bg-zinc-800 rounded-lg overflow-hidden hover:shadow-xl hover:scale-105 transition duration-200">
      <div className="relative aspect-square bg-zinc-700">
        <Image src={listing.metadata?.image || "/nft-placeholder.png"} alt={listing.metadata?.name || "NFT"} fill className="object-cover" unoptimized />
        {isOwner && <div className="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold">내 NFT</div>}
        {listing.listedAmount && listing.listedAmount > 1 && <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">{listing.listedAmount}개 판매중</div>}
        {listing.metadata?.category && listing.metadata.category !== "전체" && <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">{listing.metadata.category}</div>}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 truncate">{listing.metadata?.name || `NFT #${listing.token_id}`}</h3>
        <p className="text-zinc-400 text-xs mb-3 truncate">{listing.metadata?.description || "No description"}</p>

        <div className="bg-green-600/20 border border-green-600 rounded px-3 py-2 mb-3">
          <p className="text-green-400 text-xs">가격</p>
          <p className="text-white font-bold">{priceInEth} ETH</p>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
          <span>판매자</span>
          <span className="font-mono">
            {listing.seller_address.slice(0, 6)}...{listing.seller_address.slice(-4)}
          </span>
        </div>

        {isOwner ? (
          <div className="space-y-2">
            <div className="flex gap-2 items-center">
              <input type="number" min="1" max={maxAmount} value={cancelAmount} onChange={(e) => setCancelAmount(Math.min(parseInt(e.target.value) || 1, maxAmount))} className="w-16 bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-sm" />
              <button onClick={() => onCancel(cancelAmount)} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 rounded text-sm font-medium">
                취소
              </button>
            </div>
          </div>
        ) : (
          <button onClick={onBuy} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition">
            구매하기
          </button>
        )}
      </div>
    </div>
  );
}

function BuyModal({ listing, onClose, onBuy }: { listing: MarketNFT; onClose: () => void; onBuy: (listing: MarketNFT, amount: number) => void }) {
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);

  const pricePerUnit = parseInt(listing.price || "0") / 1e18;
  const totalPrice = pricePerUnit * amount;
  const maxAmount = listing.listedAmount || 1;

  const handleSubmit = async () => {
    if (amount <= 0 || amount > maxAmount) {
      toast.error(`수량은 1~${maxAmount} 사이여야 합니다`);
      return;
    }

    setLoading(true);
    try {
      await onBuy(listing, amount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">NFT 구매</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="mb-4 relative h-48">
          <Image src={listing.metadata?.image || "/nft-placeholder.png"} alt={listing.metadata?.name || "NFT"} fill className="object-cover rounded-lg" unoptimized />
        </div>
        <h3 className="font-semibold mb-2">{listing.metadata?.name || `NFT #${listing.token_id}`}</h3>
        {listing.metadata?.category && <p className="text-sm text-purple-400 mb-4">카테고리: {listing.metadata.category}</p>}

        <div className="space-y-4">
          <div className="bg-zinc-700 rounded p-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">개당 가격</span>
              <span className="text-white font-bold">{pricePerUnit.toFixed(4)} ETH</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">판매 수량</span>
              <span className="text-white">{maxAmount}개</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">판매자</span>
              <span className="font-mono text-xs">
                {listing.seller_address.slice(0, 6)}...{listing.seller_address.slice(-4)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">구매 수량 (최대: {maxAmount})</label>
            <input type="number" min="1" max={maxAmount} value={amount} onChange={(e) => setAmount(Math.min(parseInt(e.target.value) || 1, maxAmount))} className="w-full bg-zinc-700 border border-zinc-600 rounded px-3 py-2 text-white" />
          </div>

          <div className="bg-blue-600/20 border border-blue-600 rounded p-3">
            <p className="text-blue-400 text-sm font-medium">총 결제 금액</p>
            <p className="text-white text-2xl font-bold">{totalPrice.toFixed(4)} ETH</p>
          </div>

          <button onClick={handleSubmit} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white py-3 rounded font-medium transition">
            {loading ? "처리 중..." : `${amount}개 구매하기`}
          </button>
        </div>
      </div>
    </div>
  );
}
