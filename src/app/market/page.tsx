"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useWallet } from "../context/WalletContext";
import { createListing, createTransaction, getActiveListings, Listing } from "../../lib/supabaseMarketplace";
import { fetchUserNFTs, NFT, NFTContract } from "../../lib/nftService";
import { ethers } from "ethers";

const NFT_CONTRACT_LIST: NFTContract[] = [
  { address: "0x3111565FCf79fD5b47AD5fe176AaB69C86Cc73FA", type: "ERC721" },
  { address: "0x1c1852FF164e169fFE759075384060BD26183724", type: "ERC1155" },
  { address: "0x40E3b5A7d76B1b447A98a5287a153BBc36C1615E", type: "ERC1155" },
];

const MARKETPLACE_ADDRESS = "0xe7ab0d36191aF4f5d9ACD98210544fAC48A09eC1";

const MARKETPLACE_ABI = ["function list(address nft, uint256 tokenId, uint256 price, uint256 amount) external", "function buy(address nft, uint256 tokenId, uint256 amount) external payable", "function cancel(address nft, uint256 tokenId, uint256 amount) external", "function listedAmount(address nft, uint256 tokenId) external view returns (uint256)"];

const ERC1155_ABI = ["function isApprovedForAll(address owner, address operator) external view returns (bool)", "function setApprovalForAll(address operator, bool approved) external", "function balanceOf(address account, uint256 id) external view returns (uint256)"];

type Category = "전체" | "무기" | "신발" | "장갑" | "바지" | "상의" | "망토" | "투구" | "장식구" | "칭호" | "스킬";
const CATEGORIES: Category[] = ["전체", "무기", "신발", "장갑", "바지", "상의", "망토", "투구", "장식구", "칭호", "스킬"];

interface MarketNFT extends Listing {
  metadata?: {
    name: string;
    description: string;
    image: string;
    category?: string;
  };
  listedAmount?: number;
}

const getCategoryFromNFT = (tokenId: string): Category => {
  const id = parseInt(tokenId);
  if (id >= 100 && id < 110) return "무기";
  if (id >= 110 && id < 120) return "신발";
  if (id >= 120 && id < 130) return "장갑";
  if (id >= 130 && id < 140) return "바지";
  if (id >= 140 && id < 150) return "상의";
  if (id >= 150 && id < 160) return "망토";
  if (id >= 160 && id < 170) return "투구";
  if (id >= 170 && id < 180) return "장식구";
  if (id >= 180 && id < 190) return "칭호";
  if (id >= 190 && id < 200) return "스킬";
  return "전체";
};

type ViewMode = "myNFTs" | "marketplace";

export default function IntegratedMarketplace() {
  const { wallet } = useWallet();
  const [viewMode, setViewMode] = useState<ViewMode>("marketplace");
  const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
  const [marketListings, setMarketListings] = useState<MarketNFT[]>([]);
  const [myListings, setMyListings] = useState<Record<string, Listing>>({});
  const [listedAmounts, setListedAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | MarketNFT | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "low" | "high">("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [modalMode, setModalMode] = useState<"list" | "buy">("list");

  useEffect(() => {
    if (viewMode === "myNFTs" && wallet?.address) {
      loadMyNFTs();
    } else if (viewMode === "marketplace") {
      loadMarketplace();
    }
  }, [viewMode, wallet]);

  const loadMyNFTs = async () => {
    if (!wallet?.address) return;

    setLoading(true);
    try {
      const userNFTs = await fetchUserNFTs(wallet.address, NFT_CONTRACT_LIST);
      setMyNFTs(userNFTs);

      const listingsMap: Record<string, Listing> = {};
      const listedAmountsMap: Record<string, number> = {};

      for (const nft of userNFTs) {
        try {
          const allListings = await getActiveListings();
          const listing = allListings.find((l) => l.contract_address === nft.contractAddress && l.token_id === nft.tokenId && l.seller_address.toLowerCase() === wallet.address.toLowerCase());

          if (listing) {
            const key = `${nft.contractAddress}-${nft.tokenId}`;
            listingsMap[key] = listing;

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

      setMyListings(listingsMap);
      setListedAmounts(listedAmountsMap);
    } catch (error: any) {
      console.error("NFT 로드 실패:", error);
      toast.error(error?.message || "NFT를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const loadMarketplace = async () => {
    setLoading(true);
    try {
      const activeListings = await getActiveListings();

      const uniqueListingsMap = new Map<string, Listing>();
      activeListings.forEach((listing) => {
        const key = `${listing.contract_address}-${listing.token_id}`;
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

      const listingsWithData = await Promise.all(
        uniqueListings.map(async (listing) => {
          try {
            let listedAmount = 0;

            if (window.ethereum) {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
              const amount = await marketplace.listedAmount(listing.contract_address, listing.token_id);
              listedAmount = Number(amount);
            }

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

      setMarketListings(listingsWithData.filter((l) => l.listedAmount && l.listedAmount > 0));
    } catch (error: any) {
      console.error("마켓플레이스 로드 실패:", error);
      toast.error("마켓플레이스를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleListNFT = async (listingData: { price: string; amount: number }) => {
    if (!selectedNFT || !wallet?.address || !window.ethereum) return;

    const nft = selectedNFT as NFT;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const nftAddress = nft.contractAddress;
      const tokenId = nft.tokenId;
      const priceInWei = ethers.parseEther(listingData.price);
      const amount = listingData.amount;

      const nft1155 = new ethers.Contract(nftAddress, ERC1155_ABI, signer);

      toast.info("NFT 권한 확인 중...");
      const isApproved = await nft1155.isApprovedForAll(wallet.address, MARKETPLACE_ADDRESS);

      if (!isApproved) {
        toast.info("마켓플레이스 승인 필요 - MetaMask 확인하세요");
        const approveTx = await nft1155.setApprovalForAll(MARKETPLACE_ADDRESS, true);
        toast.info("승인 트랜잭션 대기 중...");
        await approveTx.wait();
        toast.success("✅ 마켓플레이스 승인 완료!");
      }

      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      toast.info(`NFT ${amount}개 등록 중...`);
      const listTx = await marketplace.list(nftAddress, tokenId, priceInWei, amount);
      toast.info("등록 트랜잭션 대기 중...");
      const receipt = await listTx.wait();

      toast.success("🎉 블록체인 등록 완료!");

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

      toast.success("✅ NFT 등록 완료!");
      setSelectedNFT(null);
      await loadMyNFTs();
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

  const handleBuyNFT = async (amount: number) => {
    if (!selectedNFT || !wallet?.address || !window.ethereum) {
      toast.error("지갑을 먼저 연결해주세요");
      return;
    }

    const listing = selectedNFT as MarketNFT;

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

  const handleCancelListing = async (nft: NFT | MarketNFT, amount: number) => {
    if (!wallet?.address || !window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const contractAddress = "contractAddress" in nft ? nft.contractAddress : nft.contract_address;
      const tokenId = "tokenId" in nft ? nft.tokenId : nft.token_id;

      toast.info(`${amount}개 취소 중...`);
      const tx = await marketplace.cancel(contractAddress, tokenId, amount);
      await tx.wait();

      toast.success("✅ 취소 완료!");
      if (viewMode === "myNFTs") {
        await loadMyNFTs();
      } else {
        await loadMarketplace();
      }
    } catch (error: any) {
      console.error("취소 실패:", error);
      toast.error(error.message || "취소에 실패했습니다");
    }
  };

  const filteredAndSortedItems =
    viewMode === "marketplace"
      ? marketListings
          .filter((listing) => {
            if (selectedCategory !== "전체" && listing.metadata?.category !== selectedCategory) {
              return false;
            }

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
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
          })
      : myNFTs
          .filter((nft) => {
            const category = getCategoryFromNFT(nft.tokenId);
            if (selectedCategory !== "전체" && category !== selectedCategory) {
              return false;
            }

            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return nft.name.toLowerCase().includes(query) || nft.tokenId.toLowerCase().includes(query) || nft.description.toLowerCase().includes(query);
            }

            return true;
          })
          .sort((a, b) => {
            if (sortBy === "low" || sortBy === "high") {
              const aPrice = myListings[`${a.contractAddress}-${a.tokenId}`]?.price || "0";
              const bPrice = myListings[`${b.contractAddress}-${b.tokenId}`]?.price || "0";
              return sortBy === "low" ? parseInt(aPrice) - parseInt(bPrice) : parseInt(bPrice) - parseInt(aPrice);
            }
            return 0;
          });

  if (!wallet) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-4">NFT Marketplace</h1>
          <p className="text-zinc-400 mb-6">마켓플레이스를 이용하려면 먼저 지갑을 연결해주세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white min-h-screen p-6 bg-zinc-900">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" toastStyle={{ marginTop: "80px" }} />

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 mt-20">
          <p className="text-3xl font-bold">{viewMode === "myNFTs" ? "🎨 My NFTs" : "🛒 NFT Marketplace"}</p>
          <Link href="/market/register">
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold transition transform hover:scale-105 shadow-lg">➕ NFT 등록하기</button>
          </Link>
        </div>

        <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-400">연결된 지갑</p>
          <p className="font-mono text-blue-400">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="mb-6 flex gap-4">
          <button onClick={() => setViewMode("marketplace")} className={`flex-1 py-3 rounded-lg font-semibold transition ${viewMode === "marketplace" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
            🛒 마켓플레이스
          </button>
          <button onClick={() => setViewMode("myNFTs")} className={`flex-1 py-3 rounded-lg font-semibold transition ${viewMode === "myNFTs" ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}>
            🎨 내 NFT
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <input type="text" placeholder="🔍 NFT 이름이나 토큰 ID로 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 pl-12 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500" />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 text-xl">🔍</div>
          </div>

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
          <h2 className="text-xl font-semibold text-yellow-400">🔥 {viewMode === "myNFTs" ? `보유 중인 NFT (${filteredAndSortedItems.length})` : `판매 중인 NFT (${filteredAndSortedItems.length})`}</h2>
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
            <p className="mt-4 text-zinc-400">불러오는 중...</p>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-zinc-400">{searchQuery || selectedCategory !== "전체" ? "검색 결과가 없습니다" : viewMode === "myNFTs" ? "보유한 NFT가 없습니다" : "현재 판매 중인 NFT가 없습니다"}</p>
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
            {viewMode === "myNFTs"
              ? (filteredAndSortedItems as NFT[]).map((nft) => {
                  const key = `${nft.contractAddress}-${nft.tokenId}`;
                  return (
                    <MyNFTCard
                      key={key}
                      nft={nft}
                      listing={myListings[key]}
                      listedAmount={listedAmounts[key] || 0}
                      onList={() => {
                        setSelectedNFT(nft);
                        setModalMode("list");
                      }}
                      onCancel={(amount) => handleCancelListing(nft, amount)}
                    />
                  );
                })
              : (filteredAndSortedItems as MarketNFT[]).map((listing, index) => (
                  <MarketNFTCard
                    key={`${listing.contract_address}-${listing.token_id}-${index}`}
                    listing={listing}
                    onBuy={() => {
                      setSelectedNFT(listing);
                      setModalMode("buy");
                    }}
                    onCancel={(amount) => handleCancelListing(listing, amount)}
                    isOwner={wallet?.address?.toLowerCase() === listing.seller_address.toLowerCase()}
                  />
                ))}
          </div>
        )}
      </div>

      {selectedNFT && modalMode === "list" && <ListModal nft={selectedNFT as NFT} onClose={() => setSelectedNFT(null)} onSubmit={handleListNFT} />}

      {selectedNFT && modalMode === "buy" && <BuyModal listing={selectedNFT as MarketNFT} onClose={() => setSelectedNFT(null)} onBuy={handleBuyNFT} />}
    </div>
  );
}

function MyNFTCard({ nft, listing, listedAmount, onList, onCancel }: { nft: NFT; listing?: Listing; listedAmount: number; onList: () => void; onCancel: (amount: number) => void }) {
  const [cancelAmount, setCancelAmount] = useState(1);
  const totalBalance = parseInt(nft.balance || "1");

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

function BuyModal({ listing, onClose, onBuy }: { listing: MarketNFT; onClose: () => void; onBuy: (amount: number) => void }) {
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
      await onBuy(amount);
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
