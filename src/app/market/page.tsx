"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useWallet } from "../context/WalletContext";
import { createListing, createTransaction, getActiveListings, Listing, updateListingStatus } from "../../lib/supabaseMarketplace";
import { fetchUserNFTs, NFT, NFTContract } from "../../lib/nftService";
import { ethers } from "ethers";
import { logoutFromWepin } from "../../lib/wepin";
import HistorySection from "../../components/Market/HistorySection";

const NFT_CONTRACT_LIST: NFTContract[] = [
  { address: "0x3111565FCf79fD5b47AD5fe176AaB69C86Cc73FA", type: "ERC721" },
  { address: "0x1c1852FF164e169fFE759075384060BD26183724", type: "ERC1155" },
  { address: "0x40E3b5A7d76B1b447A98a5287a153BBc36C1615E", type: "ERC1155" },
];

const MARKETPLACE_ADDRESS = "0x62CcC999E33B698E4EDb89A415C9FDa4f1203BDA";
const MARKETPLACE_ABI = ["function list(address nft, uint256 tokenId, uint256 salePrice, uint256 amount) external", "function buy(address nft, uint256 tokenId, address seller, uint256 amount) external payable", "function cancel(address nft, uint256 tokenId, uint256 amount) external", "function getListedAmount(address nft, uint256 tokenId, address seller) external view returns (uint256)", "function listedAmount(address, uint256) external view returns (uint256)", "function isActive(address, uint256) external view returns (bool)"];
const ERC1155_ABI = ["function isApprovedForAll(address owner, address operator) external view returns (bool)", "function setApprovalForAll(address operator, bool approved) external", "function balanceOf(address account, uint256 id) external view returns (uint256)", "function uri(uint256 id) external view returns (string)"];

type Category = "전체" | "무기" | "신발" | "장갑" | "바지" | "상의" | "망토" | "투구" | "장식구" | "칭호" | "스킬";
const CATEGORIES: Category[] = ["전체", "무기", "신발", "장갑", "바지", "상의", "망토", "투구", "장식구", "칭호", "스킬"];

// ✅ 판매자별 리스팅 정보
interface SellerListing {
  seller_address: string;
  listing_id?: string;
  price: string;
  amount: number;
  created_at?: string;
}

// ✅ 그룹화된 마켓 NFT (같은 NFT의 여러 판매자 통합)
interface GroupedMarketNFT {
  contract_address: string;
  token_id: string;
  metadata?: {
    name: string;
    description: string;
    image: string;
    category?: string;
  };
  sellers: SellerListing[]; // 모든 개별 리스팅 (모달에서 사용)
  uniqueSellerCount: number; // ✅ 고유 판매자 수 (카드 표시용)
  totalAmount: number;
  lowestPrice: string;
  highestPrice: string;
}

interface MarketNFT extends Listing {
  metadata?: {
    name: string;
    description: string;
    image: string;
    category?: string;
  };
  listedAmount?: number;
}

type ViewMode = "myNFTs" | "marketplace";
type SortOption = "recent" | "low" | "high";

// Wallet type
interface WalletType {
  address: string;
  type: string;
}

export default function IntegratedMarketplace() {
  const { wallet, setWallet } = useWallet();
  const pathname = usePathname();
  const [viewMode, setViewMode] = useState<ViewMode>("marketplace");
  const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
  // const [marketListings, setMarketListings] = useState<MarketNFT[]>([]); // unused
  const [groupedMarketNFTs, setGroupedMarketNFTs] = useState<GroupedMarketNFT[]>([]);
  const [myListings, setMyListings] = useState<Record<string, Listing>>({});
  const [listedAmounts, setListedAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFT | MarketNFT | null>(null);
  const [selectedGroupedNFT, setSelectedGroupedNFT] = useState<GroupedMarketNFT | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [modalMode, setModalMode] = useState<"list" | "buy" | "detail" | "selectSeller">("list");
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isListingPending, setIsListingPending] = useState(false);
  const [isBuyingPending, setIsBuyingPending] = useState(false);

  const handleDisconnect = async () => {
    if (wallet?.type === "wepin") {
      await logoutFromWepin();
    }
    if (wallet?.type === "metamask" && typeof window !== "undefined" && window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (err) {
        console.error("MetaMask 권한 제거 실패", err);
      }
    }
    localStorage.setItem("disconnectedManually", "true");
    localStorage.removeItem("connectedWallet");
    setWallet(null);
    setIsWalletDropdownOpen(false);
    toast.success("Wallet disconnected successfully");
  };

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    if (viewMode === "myNFTs" && wallet?.address) {
      loadMyNFTs();
    } else if (viewMode === "marketplace") {
      loadMarketplace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, wallet]);

  const loadMyNFTs = async () => {
    if (!wallet?.address) return;
    setLoading(true);
    console.log("🔄 내 NFT 로딩 시작...");

    try {
      const userNFTs = await fetchUserNFTs(wallet.address, NFT_CONTRACT_LIST);
      console.log("📦 지갑의 NFT:", userNFTs.length, "개");

      const allListings = await getActiveListings();
      const myMarketListings = allListings.filter((l) => l.seller_address.toLowerCase() === wallet.address.toLowerCase());
      console.log("📝 내 마켓 리스팅:", myMarketListings.length, "개");

      const nftMap = new Map<string, NFT>();
      userNFTs.forEach((nft) => {
        const key = `${nft.contractAddress}-${nft.tokenId}`;
        const balance = nft.balance ? parseInt(nft.balance) : 0;
        if (balance > 0) {
          nftMap.set(key, nft);
        }
      });

      // ✅ 1. 리스팅된 NFT는 My Collection에 추가하지 않음
      // 지갑에 실제로 있는 NFT만 표시 (balance > 0인 것만)

      setMyNFTs(Array.from(nftMap.values()));

      const listingsMap: Record<string, Listing> = {};
      const listedAmountsMap: Record<string, number> = {};

      for (const listing of myMarketListings) {
        const key = `${listing.contract_address}-${listing.token_id}`;

        try {
          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
            const amount = await marketplace.getListedAmount(listing.contract_address, listing.token_id, wallet.address);
            const onChainAmount = Number(amount);

            if (onChainAmount > 0) {
              listingsMap[key] = listing;
              listedAmountsMap[key] = onChainAmount;
              console.log(`NFT #${listing.token_id}: ${onChainAmount}개 리스팅됨`);
            } else if (listing.id && listing.status === "active") {
              await updateListingStatus(listing.id, "cancelled");
            }
          }
        } catch (err) {
          console.warn("Listing 조회 실패:", listing.contract_address, listing.token_id, err);
        }
      }

      setMyListings(listingsMap);
      setListedAmounts(listedAmountsMap);
    } catch (error: unknown) {
      console.error("❌ NFT 로드 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "NFT를 불러오는데 실패했습니다";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadMarketplace = async () => {
    setLoading(true);
    console.log("🔄 마켓플레이스 로딩 시작...");

    try {
      const activeListings = await getActiveListings();
      console.log("📊 Supabase active 리스팅:", activeListings.length, "개");

      const listingsWithData: MarketNFT[] = [];

      for (const listing of activeListings) {
        try {
          let listedAmount = 0;

          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
            const amount = await marketplace.getListedAmount(listing.contract_address, listing.token_id, listing.seller_address);
            listedAmount = Number(amount);
          }

          if (listedAmount === 0) {
            if (listing.id && listing.status === "active") {
              await updateListingStatus(listing.id, "cancelled");
            }
            continue;
          }

          let metadata = {
            name: `NFT #${listing.token_id}`,
            description: "Epic item for your adventure",
            image: "/nft-placeholder.png",
            category: "전체" as Category, // ✅ 기본값만 둠
          };

          try {
            if (window.ethereum) {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const nftContract = new ethers.Contract(listing.contract_address, ["function uri(uint256 tokenId) external view returns (string memory)"], provider);
              let tokenURI = await nftContract.uri(listing.token_id);
              if (tokenURI.startsWith("ipfs://")) {
                tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
              }
              const response = await fetch(tokenURI);
              const json = await response.json();

              metadata = {
                name: json.name || metadata.name,
                description: json.description || metadata.description,
                image: (json.image || "").replace("ipfs://", "https://ipfs.io/ipfs/") || metadata.image,
                category: (json.category as Category) || metadata.category, // 🔥 핵심
              };
            }
          } catch {
            // metadata fetch failed, use defaults
          }

          listingsWithData.push({ ...listing, metadata, listedAmount });
        } catch (err) {
          console.error("리스팅 처리 실패:", err);
        }
      }

      // setMarketListings(listingsWithData);

      // ✅ 같은 NFT를 그룹화 (seller별 온체인 수량은 한 번만 조회)
      const grouped = new Map<string, GroupedMarketNFT>();

      // ✅ seller별 온체인 수량 캐시 (같은 seller+NFT 조합은 한 번만 조회)
      const sellerAmountCache = new Map<string, number>();

      for (const listing of listingsWithData) {
        const nftKey = `${listing.contract_address}-${listing.token_id}`;
        const sellerKey = `${listing.contract_address}-${listing.token_id}-${listing.seller_address.toLowerCase()}`;
        const priceNum = parseFloat(listing.price || "0");

        // ✅ 같은 seller+NFT 조합의 온체인 수량은 캐시에서 가져오거나 한 번만 조회
        let sellerOnChainAmount = sellerAmountCache.get(sellerKey);
        if (sellerOnChainAmount === undefined) {
          sellerOnChainAmount = listing.listedAmount || 0;
          sellerAmountCache.set(sellerKey, sellerOnChainAmount);
        }

        if (!grouped.has(nftKey)) {
          grouped.set(nftKey, {
            contract_address: listing.contract_address,
            token_id: listing.token_id,
            metadata: listing.metadata,
            sellers: [],
            uniqueSellerCount: 0,
            totalAmount: 0,
            lowestPrice: listing.price || "0",
            highestPrice: listing.price || "0",
          });
        }

        const group = grouped.get(nftKey)!;

        // ✅ 각 가격별 리스팅 추가 (모달에서 선택용)
        // 단, amount는 DB의 amount 값 사용 (각 가격별 등록 수량)
        group.sellers.push({
          seller_address: listing.seller_address,
          listing_id: listing.id,
          price: listing.price || "0",
          amount: listing.amount || 0, // ✅ DB의 원래 등록 수량 사용
          created_at: listing.created_at,
        });

        // 최저가/최고가
        if (priceNum < parseFloat(group.lowestPrice)) group.lowestPrice = listing.price || "0";
        if (priceNum > parseFloat(group.highestPrice)) group.highestPrice = listing.price || "0";
      }

      // ✅ 고유 판매자 수 및 총 수량 계산
      grouped.forEach((group) => {
        const uniqueSellers = new Set(group.sellers.map((s) => s.seller_address.toLowerCase()));
        group.uniqueSellerCount = uniqueSellers.size;

        // ✅ totalAmount는 seller별로 온체인 수량 한 번씩만 합산
        let totalAmount = 0;
        const countedSellers = new Set<string>();

        for (const seller of group.sellers) {
          const sellerKey = `${group.contract_address}-${group.token_id}-${seller.seller_address.toLowerCase()}`;
          if (!countedSellers.has(sellerKey)) {
            countedSellers.add(sellerKey);
            totalAmount += sellerAmountCache.get(sellerKey) || 0;
          }
        }
        group.totalAmount = totalAmount;
      });

      setGroupedMarketNFTs(Array.from(grouped.values()));
      console.log(`✅ 그룹화된 NFT: ${grouped.size}개`);
    } catch (error: unknown) {
      console.error("❌ 마켓플레이스 로드 실패:", error);
      toast.error("마켓플레이스를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleListNFT = async (listingData: { price: string; amount: number }) => {
    if (!selectedNFT || !wallet?.address || !window.ethereum) return;

    const nft = selectedNFT as NFT;

    setIsListingPending(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const nftAddress = nft.contractAddress;
      const tokenId = nft.tokenId;
      const amount = listingData.amount;
      const priceEth = listingData.price;
      const priceWei = ethers.parseEther(priceEth);

      const nft1155 = new ethers.Contract(nftAddress, ERC1155_ABI, signer);

      toast.info("NFT 권한 확인 중...");
      const isApproved = await nft1155.isApprovedForAll(wallet.address, MARKETPLACE_ADDRESS);

      if (!isApproved) {
        toast.info("마켓플레이스 승인 필요 - MetaMask 확인하세요");
        const approveTx = await nft1155.setApprovalForAll(MARKETPLACE_ADDRESS, true);
        await approveTx.wait();
        toast.success("✅ 마켓플레이스 승인 완료!");
      }

      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      toast.info(`NFT ${amount}개 등록 중...`);
      const listTx = await marketplace.list(nftAddress, tokenId, priceWei, amount);
      const receipt = await listTx.wait();

      toast.success("🎉 블록체인 등록 완료!");

      // ✅ Supabase에는 ETH 단위로 저장
      const createdListing = await createListing({
        contract_address: nftAddress,
        token_id: tokenId.toString(),
        seller_address: wallet.address,
        sale_type: "fixed",
        price: priceEth, // ETH 단위
        amount,
        status: "active",
      });

      await createTransaction({
        listing_id: createdListing.id,
        contract_address: nftAddress,
        token_id: tokenId.toString(),
        from_address: wallet.address,
        to_address: MARKETPLACE_ADDRESS,
        price: priceEth, // ETH 단위
        transaction_hash: receipt.hash,
        transaction_type: "listing",
      });

      toast.success("✅ NFT 등록 완료!");
      setSelectedNFT(null);
      await loadMyNFTs();
      await loadMarketplace();
    } catch (error: unknown) {
      console.error("❌ 등록 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "등록에 실패했습니다";
      toast.error(errorMessage);
    } finally {
      setIsListingPending(false);
    }
  };

  // ✅ 특정 판매자로부터 구매 (가격은 ETH 단위)
  const handleBuyFromSeller = async (seller: SellerListing, amount: number) => {
    if (!wallet?.address || !window.ethereum || !selectedGroupedNFT) {
      toast.error("지갑을 먼저 연결해주세요");
      return;
    }

    setIsBuyingPending(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const priceEth = seller.price; // ETH 단위
      const pricePerUnitWei = ethers.parseEther(priceEth); // Wei로 변환
      const totalPriceWei = pricePerUnitWei * BigInt(amount);

      const contractAddress = selectedGroupedNFT.contract_address;
      const tokenId = selectedGroupedNFT.token_id;

      toast.info(`${amount}개 구매 중...`);

      const tx = await marketplace.buy(contractAddress, tokenId, seller.seller_address, amount, {
        value: totalPriceWei,
      });

      const receipt = await tx.wait();

      // SELL 기록
      await createTransaction({
        listing_id: seller.listing_id,
        contract_address: contractAddress,
        token_id: tokenId,
        from_address: seller.seller_address,
        to_address: wallet.address,
        price: priceEth,
        transaction_hash: receipt.hash + "_sell",
        transaction_type: "sell",
      });

      // BUY 기록
      await createTransaction({
        listing_id: seller.listing_id,
        contract_address: contractAddress,
        token_id: tokenId,
        from_address: MARKETPLACE_ADDRESS,
        to_address: wallet.address,
        price: priceEth,
        transaction_hash: receipt.hash + "_buy",
        transaction_type: "buy",
      });

      // 남은 수량 확인
      const remainingAmount = await marketplace.getListedAmount(contractAddress, tokenId, seller.seller_address);
      if (Number(remainingAmount) === 0 && seller.listing_id) {
        await updateListingStatus(seller.listing_id, "sold");
      }

      toast.success("🎉 구매 완료!");
      setSelectedGroupedNFT(null);
      await loadMarketplace();
    } catch (error: unknown) {
      console.error("❌ 구매 실패:", error);
      let errorMsg = "구매에 실패했습니다";

      if (error && typeof error === "object") {
        if ("code" in error && error.code === "ACTION_REJECTED") {
          errorMsg = "사용자가 트랜잭션을 거부했습니다";
        } else if ("reason" in error && typeof error.reason === "string") {
          errorMsg = error.reason;
        } else if ("message" in error && typeof error.message === "string") {
          errorMsg = error.message;
        }
      }

      toast.error(errorMsg);
    } finally {
      setIsBuyingPending(false);
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

      const currentAmount = await marketplace.getListedAmount(contractAddress, tokenId, wallet.address);
      const onChainAmount = Number(currentAmount);

      if (onChainAmount === 0) {
        toast.error("이미 취소된 NFT입니다");
        await loadMyNFTs();
        await loadMarketplace();
        return;
      }

      const amountToCancel = Math.min(amount, onChainAmount);

      toast.info(`${amountToCancel}개 취소 중...`);
      const tx = await marketplace.cancel(contractAddress, tokenId, amountToCancel);
      const receipt = await tx.wait();

      const key = `${contractAddress}-${tokenId}`;
      const listing = myListings[key];

      await createTransaction({
        listing_id: listing?.id ?? null,
        contract_address: contractAddress,
        token_id: tokenId,
        from_address: MARKETPLACE_ADDRESS,
        to_address: wallet.address,
        price: "0",
        transaction_hash: receipt.hash,
        transaction_type: "cancel",
      });

      const remainingAmount = await marketplace.getListedAmount(contractAddress, tokenId, wallet.address);
      if (Number(remainingAmount) === 0 && listing?.id) {
        await updateListingStatus(listing.id, "cancelled");
      }

      toast.success("✅ 취소 완료!");
      await loadMyNFTs();
      await loadMarketplace();
    } catch (error: unknown) {
      console.error("취소 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "취소에 실패했습니다";
      toast.error(errorMessage);
    }
  };

  // ✅ 필터링 및 정렬 (그룹화된 NFT)
  const filteredGroupedNFTs = useMemo(() => {
    return groupedMarketNFTs
      .filter((nft) => {
        if (selectedCategory !== "전체" && nft.metadata?.category !== selectedCategory) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const name = nft.metadata?.name?.toLowerCase() || "";
          const tokenId = nft.token_id.toLowerCase();
          return name.includes(query) || tokenId.includes(query);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "low") return parseFloat(a.lowestPrice) - parseFloat(b.lowestPrice);
        if (sortBy === "high") return parseFloat(b.highestPrice) - parseFloat(a.highestPrice);
        const aRecent = Math.max(...a.sellers.map((s) => new Date(s.created_at || 0).getTime()));
        const bRecent = Math.max(...b.sellers.map((s) => new Date(s.created_at || 0).getTime()));
        return bRecent - aRecent;
      });
  }, [groupedMarketNFTs, selectedCategory, searchQuery, sortBy]);

  const filteredMyNFTs = useMemo(() => {
    return myNFTs
      .filter((nft) => {
        const category = nft.metadata?.category || nft.category;
        if (selectedCategory !== "전체" && category !== selectedCategory) return false;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return nft.name.toLowerCase().includes(query) || nft.tokenId.toLowerCase().includes(query);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "low" || sortBy === "high") {
          const aPrice = myListings[`${a.contractAddress}-${a.tokenId}`]?.price || "0";
          const bPrice = myListings[`${b.contractAddress}-${b.tokenId}`]?.price || "0";
          return sortBy === "low" ? parseFloat(aPrice) - parseFloat(bPrice) : parseFloat(bPrice) - parseFloat(aPrice);
        }
        return 0;
      });
  }, [myNFTs, selectedCategory, searchQuery, sortBy, myListings]);

  // ✅ Top 5 - 그룹화된 NFT 기준 최고가 순
  const topNFTs = useMemo(() => {
    return [...groupedMarketNFTs].sort((a, b) => parseFloat(b.highestPrice) - parseFloat(a.highestPrice)).slice(0, 5);
  }, [groupedMarketNFTs]);

  if (!wallet) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center p-6">
        <div className="text-center max-w-lg">
          <div className="mb-10 relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] blur-3xl opacity-30 animate-pulse"></div>
            <div className="relative text-9xl filter drop-shadow-2xl">🔐</div>
          </div>
          <h1 className="text-5xl font-black mb-4">
            <span className="bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] bg-clip-text text-transparent">NFT Marketplace</span>
          </h1>
          <p className="text-gray-400 text-xl mb-10">Connect your wallet to explore amazing NFTs</p>
          <div className="h-1 w-full bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" toastStyle={{ marginTop: "80px" }} />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0b0d]/80 backdrop-blur-2xl">
        <div className="max-w-[1400px] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-12">
              <Link href="/" className="flex items-center gap-2">
                <h1 className="text-2xl font-black">
                  <span className="bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] bg-clip-text text-transparent">NFT</span>
                  <span className="text-white">Market</span>
                </h1>
              </Link>

              <div className="hidden lg:flex items-center gap-6">
                <Link href="/play" className={`text-sm font-semibold transition-colors ${isActive("/play") ? "text-white" : "text-gray-400 hover:text-white"}`}>
                  Play
                </Link>
                <Link href="/market" className={`text-sm font-semibold transition-colors ${isActive("/market") ? "text-white" : "text-gray-400 hover:text-white"}`}>
                  Market
                </Link>
                <Link href="/swap" className={`text-sm font-semibold transition-colors ${isActive("/swap") ? "text-white" : "text-gray-400 hover:text-white"}`}>
                  Swap
                </Link>
                <Link href="/earn" className={`text-sm font-semibold transition-colors ${isActive("/earn") ? "text-white" : "text-gray-400 hover:text-white"}`}>
                  Earn
                </Link>
                <Link href="/voting" className={`text-sm font-semibold transition-colors ${isActive("/voting") ? "text-white" : "text-gray-400 hover:text-white"}`}>
                  Voting
                </Link>
                <Link href="/more" className={`text-sm font-semibold transition-colors ${isActive("/more") ? "text-white" : "text-gray-400 hover:text-white"}`}>
                  More
                </Link>
              </div>

              <div className="flex items-center gap-2 bg-white/5 rounded-full p-1.5">
                <button onClick={() => setViewMode("marketplace")} className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${viewMode === "marketplace" ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow-lg shadow-purple-500/30" : "text-gray-400 hover:text-white"}`}>
                  Marketplace
                </button>
                <button onClick={() => setViewMode("myNFTs")} className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${viewMode === "myNFTs" ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow-lg shadow-purple-500/30" : "text-gray-400 hover:text-white"}`}>
                  My Collection
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)} className="flex items-center gap-3 bg-white/5 rounded-full px-5 py-3 border border-white/10 hover:bg-white/10 transition-all">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-mono text-gray-300">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isWalletDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isWalletDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsWalletDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-[#13141a] border border-white/10 rounded-2xl p-4 shadow-2xl z-50">
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                        <Image src={wallet.type === "metamask" ? "/MetamaskLogo.png" : "/WepinLogo.png"} alt={wallet.type} width={40} height={40} />
                        <div>
                          <p className="text-xs text-gray-400">Connected with</p>
                          <p className="text-sm font-semibold text-white">{wallet.type === "metamask" ? "MetaMask" : "Wepin"}</p>
                        </div>
                      </div>
                      <div className="mb-4 p-3 bg-white/5 rounded-xl">
                        <p className="text-xs text-gray-400 mb-1">Wallet Address</p>
                        <p className="text-sm font-mono text-white break-all">{wallet.address}</p>
                      </div>
                      <button onClick={handleDisconnect} className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Disconnect
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div>
        <div>
          {/* ✅ Hero Section with Top 5 NFTs - Marketplace에서만 표시 */}
          {viewMode === "marketplace" && topNFTs.length > 0 && (
            <div className="relative mb-16" style={{ minHeight: "900px", overflow: "hidden" }}>
              <div className="absolute inset-0 z-0">
                <Image src="/Marketpage/1.jpg" alt="background" fill className="object-cover" priority />
              </div>
              <div className="absolute inset-0 bg-black/20 z-[1]" />

              <div className="relative z-10">
                <div className="text-center mb-12 mt-10 pt-8">
                  <h2 className="text-6xl font-black mb-4">
                    <span className="text-white"> MYTHIC COLLECTION</span>
                    <br />
                    <span className="text-white">OF </span>
                    <span className="bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] bg-clip-text text-transparent">NFT</span>
                    <span className="bg-gradient-to-r from-[#ec4899] to-[#06b6d4] bg-clip-text text-transparent"> ITEMS</span>
                  </h2>
                </div>

                <div className="relative w-full h-[550px] flex items-center justify-center perspective-1000">
                  {topNFTs.map((nft, index) => {
                    const isCenter = index === 2;
                    const baseOffset = 300;
                    let offset = (index - 2) * baseOffset;
                    if (index === 1) offset -= 30;
                    if (index === 3) offset += 30;
                    const rotation = (2 - index) * 25;
                    const scale = isCenter ? 1.05 : 1;
                    const translateY = isCenter ? "-40px" : "0px";
                    const cardWidth = isCenter ? "w-96" : "w-64";
                    const cardHeight = isCenter ? "h-[30rem]" : "h-96";

                    return (
                      <div
                        key={`top-${nft.contract_address}-${nft.token_id}-${index}`}
                        className="absolute transition-all duration-500 cursor-pointer group"
                        style={{
                          transform: `translateX(${offset}px) translateY(${translateY}) rotateY(${rotation}deg) scale(${scale})`,
                          zIndex: isCenter ? 50 : 10,
                        }}
                        onClick={() => {
                          setSelectedGroupedNFT(nft);
                          setModalMode("selectSeller");
                        }}
                      >
                        <div className={`${cardWidth} ${cardHeight} rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/20 shadow-2xl group-hover:shadow-purple-500/50 transition-all duration-300`}>
                          <div className="relative h-full">
                            <Image src={nft.metadata?.image || "/nft-placeholder.png"} alt={nft.metadata?.name || "NFT"} fill className="object-cover" unoptimized />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                              <p className="text-white text-lg font-bold mb-2">{nft.metadata?.name || `NFT #${nft.token_id}`}</p>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs text-gray-400">Highest Price</p>
                                  <p className="font-bold text-xl">
                                    <span className="text-white">{Number(nft.highestPrice || "0").toFixed(2)}</span>
                                    <span className="text-yellow-500 ml-1">Very</span>
                                  </p>
                                </div>
                                {isCenter && <div className="text-green-500 px-3 py-1 rounded-full text-xs font-bold">MORE +</div>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Section */}
          <div className={`mb-10 space-y-6 ${viewMode === "myNFTs" ? "pt-20" : ""}`}></div>
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="mb-10 space-y-6">
              {/* Search */}
              <div className="relative group max-w-2xl mx-auto">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative bg-[#13141a] border border-white/10 rounded-2xl overflow-hidden">
                  <input type="text" placeholder="Search NFTs by name or token ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent px-6 py-4 pl-14 text-white placeholder-gray-500 focus:outline-none" />
                  <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Category Filter */}
              <div className="bg-[#13141a] border border-white/10 rounded-2xl p-6">
                <div className="flex gap-3 flex-wrap">
                  {CATEGORIES.map((category) => (
                    <button key={category} onClick={() => setSelectedCategory(category)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${selectedCategory === category ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}>
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort & Count */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-white">{viewMode === "marketplace" ? filteredGroupedNFTs.length : filteredMyNFTs.length} Items</p>
                  <p className="text-sm text-gray-400">{viewMode === "marketplace" ? "Available for purchase" : "In your wallet"}</p>
                </div>
                <div className="relative">
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="appearance-none bg-white/5 border border-white/10 rounded-xl px-5 py-2.5 pr-8 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:border-purple-100/50 transition-all duration-300 cursor-pointer">
                    <option value="recent" className="bg-[#13141a] text-white">
                      Recent
                    </option>
                    <option value="low" className="bg-[#13141a] text-white">
                      Low
                    </option>
                    <option value="high" className="bg-[#13141a] text-white">
                      High
                    </option>
                  </select>
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Collections Header */}
            <div className="mb-8">
              <h3 className="text-4xl font-black text-white mb-2">{viewMode === "marketplace" ? "COLLECTIONS" : "MY COLLECTION"}</h3>
            </div>

            {/* NFT Grid */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-400 text-lg">Loading NFTs...</p>
              </div>
            ) : viewMode === "marketplace" ? (
              filteredGroupedNFTs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32">
                  <div className="text-7xl mb-6 opacity-50">📦</div>
                  <p className="text-gray-400 text-xl">No NFTs available for sale</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                  {filteredGroupedNFTs.map((nft) => (
                    <GroupedMarketNFTCard
                      key={`${nft.contract_address}-${nft.token_id}`}
                      nft={nft}
                      wallet={wallet}
                      onBuy={() => {
                        setSelectedGroupedNFT(nft);
                        setModalMode("selectSeller");
                      }}
                    />
                  ))}
                </div>
              )
            ) : filteredMyNFTs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32">
                <div className="text-7xl mb-6 opacity-50">📦</div>
                <p className="text-gray-400 text-xl">You don&apos;t own any NFTs yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {filteredMyNFTs.map((nft) => {
                  const key = `${nft.contractAddress}-${nft.tokenId}`;
                  return (
                    <MyNFTCard
                      key={key}
                      nft={nft}
                      wallet={wallet}
                      listing={myListings[key]}
                      listedAmount={listedAmounts[key] || 0}
                      onList={() => {
                        setSelectedNFT(nft);
                        setModalMode("list");
                      }}
                      onCancel={(amount) => handleCancelListing(nft, amount)}
                      onDetail={() => {
                        setSelectedNFT(nft);
                        setModalMode("detail");
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ History Section - My Collection에서만 표시 */}
      {viewMode === "myNFTs" && wallet?.address && (
        <div className="max-w-[1400px] mx-auto px-8 mt-8">
          <HistorySection wallet={wallet} />
        </div>
      )}

      {/* Modals */}
      {selectedNFT && modalMode === "list" && <ListModal nft={selectedNFT as NFT} onClose={() => setSelectedNFT(null)} onSubmit={handleListNFT} isLoading={isListingPending} />}
      {selectedGroupedNFT && modalMode === "selectSeller" && <SellerSelectionModal nft={selectedGroupedNFT} wallet={wallet} sortBy={sortBy} onClose={() => setSelectedGroupedNFT(null)} onBuy={handleBuyFromSeller} isLoading={isBuyingPending} />}
      {selectedNFT && modalMode === "detail" && <DetailModal nft={selectedNFT} onClose={() => setSelectedNFT(null)} wallet={wallet} />}

      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

// ✅ 그룹화된 마켓 NFT 카드 (최고가만 표시)
function GroupedMarketNFTCard({ nft, wallet, onBuy }: { nft: GroupedMarketNFT; wallet: WalletType; onBuy: () => void }) {
  const isOwner = nft.sellers.every((s) => s.seller_address.toLowerCase() === wallet?.address?.toLowerCase());
  // ✅ ETH 단위로 표시 (원본과 동일)
  const displayPrice = Number(nft.highestPrice || "0").toFixed(2);

  return (
    <div className="group relative m-4" onClick={() => onBuy()}>
      <div className="absolute -inset-3 bg-white/15 backdrop-blur-md shadow-lg" />
      <div className="relative overflow-hidden transition-all duration-500 cursor-pointer" style={{ background: "linear-gradient(180deg, #2a2a3e 0%, #1a1a2e 100%)", border: "none" }}>
        <div className="relative h-56 overflow-hidden">
          <Image src={nft.metadata?.image || "/nft-placeholder.png"} alt={nft.metadata?.name || "NFT"} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />

          {/* 등록 수량 - 오른쪽 상단 */}
          <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/20">{nft.totalAmount} listed</div>

          {/* 가격 정보 - 하단 오버레이 */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 pt-8">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-gray-400 text-xs mb-1">Current Bid</div>
                <div className="text-white font-bold text-lg">{displayPrice} Very</div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white/10">
          <h3 className="font-bold text-2xl text-white mb-2 truncate">{nft.metadata?.name}</h3>
          {/* ✅ 고유 판매자가 1명이면 주소 표시 */}
          {nft.uniqueSellerCount === 1 && (
            <p className="text-purple-300 text-sm mb-1">
              @{nft.sellers[0].seller_address.slice(0, 7)}...{nft.sellers[0].seller_address.slice(-5)}
            </p>
          )}
          <p className="text-gray-400 text-xs mb-3 line-clamp-1">{nft.metadata?.description}</p>
          <p className="text-gray-400 text-xs mb-3 line-clamp-1">#{nft.token_id}</p>

          {!isOwner ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBuy();
              }}
              className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white py-3 rounded-lg text-sm font-bold hover:scale-105 transition-all"
            >
              Buy
            </button>
          ) : (
            <div className="w-full bg-white/5 text-gray-400 py-3 rounded-lg text-sm font-bold text-center">Your Listing</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ 판매자 선택 모달 - 왼쪽 NFT 카드, 오른쪽 판매자 목록
function SellerSelectionModal({ nft, wallet, sortBy: initialSortBy, onClose, onBuy, isLoading }: { nft: GroupedMarketNFT; wallet: WalletType; sortBy: SortOption; onClose: () => void; onBuy: (seller: SellerListing, amount: number) => void; isLoading: boolean }) {
  const [selectedSeller, setSelectedSeller] = useState<SellerListing | null>(null);
  const [buyAmount, setBuyAmount] = useState(1);
  const [modalSortBy, setModalSortBy] = useState<SortOption>(initialSortBy);

  const sortedSellers = useMemo(() => {
    return [...nft.sellers].sort((a, b) => {
      if (modalSortBy === "low") return parseFloat(a.price) - parseFloat(b.price);
      if (modalSortBy === "high") return parseFloat(b.price) - parseFloat(a.price);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [nft.sellers, modalSortBy]);

  const category = nft.metadata?.category;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="relative max-w-6xl w-full max-h-[95vh]">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl blur-2xl opacity-30" />
        <div className="relative bg-[#13141a] border border-white/10 rounded-3xl overflow-hidden">
          <button onClick={onClose} disabled={isLoading} className="absolute top-3 right-5  hover:text-gray-500 text-white flex items-center justify-center text-4xl z-10 disabled:opacity-50 disabled:cursor-not-allowed ">
            ×
          </button>

          <div className="flex flex-col lg:flex-row">
            {/* 왼쪽: NFT 카드 정보 */}
            <div className="lg:w-1/2 p-16 border-b lg:border-b-0 lg:border-r border-white/10">
              <h2 className="text-3xl font-black mb-6">
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">Buy NFT</span>
              </h2>

              <div className="mb-10 relative h-96  overflow-hidden">
                <Image src={nft.metadata?.image || "/nft-placeholder.png"} alt={nft.metadata?.name || "NFT"} fill className="object-cover" unoptimized />
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-purple-400 text-sm font-semibold">{category}</span>
                  <h3 className="text-2xl font-bold text-white">{nft.metadata?.name || `NFT #${nft.token_id}`}</h3>
                </div>

                <p className="text-gray-400 text-sm line-clamp-3">{nft.metadata?.description || "Epic item for your adventure"}</p>

                <div className="flex gap-4">
                  <div className="bg-white/5 rounded-xl p-3 flex-1">
                    <p className="text-gray-400 text-xs">Token ID</p>
                    <p className="text-white font-mono font-bold">#{nft.token_id}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 flex-1">
                    <p className="text-gray-400 text-xs">Total Available</p>
                    <p className="text-white font-bold">{nft.totalAmount}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 flex-1">
                    <p className="text-gray-400 text-xs">Sellers</p>
                    <p className="text-white font-bold">{nft.uniqueSellerCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 판매자 목록 */}
            <div className="lg:w-1/2 flex flex-col">
              {/* Sort */}
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between ">
                <span className="text-white font-semibold text-lg">Select Seller</span>

                <select value={modalSortBy} onChange={(e) => setModalSortBy(e.target.value as SortOption)} disabled={isLoading} className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none disabled:opacity-50 text-center mr-10">
                  <option value="recent" className="bg-[#13141a] text-white">
                    Recent
                  </option>
                  <option value="low" className="bg-[#13141a] text-white">
                    Low
                  </option>
                  <option value="high" className="bg-[#13141a] text-white">
                    High
                  </option>
                </select>
              </div>

              {/* Seller List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 max-h-[280px]">
                <span className="text-white">{nft.uniqueSellerCount} sellers</span>
                {sortedSellers.map((seller, idx) => {
                  const isOwnListing = seller.seller_address.toLowerCase() === wallet?.address?.toLowerCase();
                  const isSelected = selectedSeller?.seller_address === seller.seller_address;

                  return (
                    <div key={idx} onClick={() => !isOwnListing && !isLoading && setSelectedSeller(seller)} className={`p-4 rounded-xl border transition-all ${isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${isSelected ? "bg-green-500/20 border-green-500" : isOwnListing ? "bg-white/5 border-white/10 opacity-50 cursor-not-allowed" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">{seller.seller_address.slice(2, 4).toUpperCase()}</div>

                          <div>
                            <p className="text-white font-semibold text-sm">
                              {seller.seller_address.slice(0, 6)}...{seller.seller_address.slice(-4)}
                            </p>
                            <p className="text-gray-400 text-xs">{seller.amount} available</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold">{Number(seller.price).toFixed(4)} Very</p>

                          {isOwnListing && <p className="text-gray-500 text-xs">Your listing</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Buy Section */}
              <div className="p-6 border-t border-white/10 space-y-4">
                {selectedSeller ? (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-300 mb-2">Amount (Max: {selectedSeller.amount})</label>
                      <input type="number" min="1" max={selectedSeller.amount} value={buyAmount} onChange={(e) => setBuyAmount(Math.min(Math.max(1, parseInt(e.target.value) || 1), selectedSeller.amount))} disabled={isLoading} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 disabled:opacity-50" />
                    </div>

                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm">Price per NFT</span>
                        <span className="text-white">{Number(selectedSeller.price).toFixed(4)} Very</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm">Amount</span>
                        <span className="text-white">× {buyAmount}</span>
                      </div>
                      <div className="border-t border-white/10 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-green-400 font-bold">Total Payment</span>
                          <span className="text-white text-2xl font-black">{(Number(selectedSeller.price) * buyAmount).toFixed(4)} Very</span>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => onBuy(selectedSeller, buyAmount)} disabled={isLoading} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          Buy {buyAmount} NFT{buyAmount > 1 ? "s" : ""}
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400">Select a seller to continue</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// My Collection NFT Card
function MyNFTCard({ nft, wallet, listing, listedAmount, onList, onCancel, onDetail }: { nft: NFT; wallet: WalletType; listing?: Listing; listedAmount: number; onList: () => void; onCancel: (amount: number) => void; onDetail: () => void }) {
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [cancelAmount, setCancelAmount] = useState(1);

  const walletBalance = parseInt(nft.balance || "0");
  const isListed = listing && listedAmount > 0;
  const hasPartialListing = isListed && walletBalance > 0;

  return (
    <div className="group relative" onClick={onDetail}>
      <div className="absolute -inset-2 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-lg backdrop-blur-sm"></div>
      <div className="relative overflow-hidden transition-all duration-500 cursor-pointer border" style={{ background: "linear-gradient(180deg, #2a2a3e 0%, #1a1a2e 100%)", borderColor: "rgba(139, 92, 246, 0.4)" }}>
        <div className="relative h-56 overflow-hidden">
          <Image src={nft.image} alt={nft.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
          {listedAmount > 0 && <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/20">{listedAmount} listed</div>}
          {isListed && listing && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 pt-8">
              <div className="text-gray-400 text-xs mb-1">Current Bid</div>
              <div className="text-white font-bold text-lg">{Number(listing.price || "0").toFixed(2)} Very</div>
            </div>
          )}
        </div>
        <div className="p-4" style={{ background: "linear-gradient(180deg, #2a2a3e 0%, #1f1f2f 100%)" }}>
          <h3 className="font-bold text-xl text-white mb-2 truncate">{nft.name}</h3>
          <p className="text-purple-300 text-sm font-semibold mb-1">@{wallet?.address ? `${wallet.address.slice(0, 7)}...${wallet.address.slice(-5)}` : "unknown"}</p>
          <p className="text-gray-500 text-xs mb-1">#{nft.tokenId}</p>
          <p className="text-gray-400 text-xs mb-3 line-clamp-1">{nft.description || "Epic item for your adventure"}</p>

          {showCancelInput ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max={listedAmount} value={cancelAmount} onChange={(e) => setCancelAmount(Math.min(Math.max(1, parseInt(e.target.value) || 1), listedAmount))} className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" placeholder="Amount" />
                <span className="text-gray-400 text-xs">/ {listedAmount}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel(cancelAmount);
                    setShowCancelInput(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                >
                  Confirm
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCancelInput(false);
                  }}
                  className="flex-1 bg-white/10 text-white py-2 rounded-lg text-xs font-bold transition-all hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : hasPartialListing ? (
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onList();
                }}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
              >
                List More
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCancelInput(true);
                  setCancelAmount(Math.min(1, listedAmount));
                }}
                className="flex-1 bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
              >
                Cancel
              </button>
            </div>
          ) : isListed ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCancelInput(true);
                setCancelAmount(Math.min(1, listedAmount));
              }}
              className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onList();
              }}
              className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
            >
              List
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// List Modal
function ListModal({ nft, onClose, onSubmit, isLoading }: { nft: NFT; onClose: () => void; onSubmit: (data: { price: string; amount: number }) => void; isLoading: boolean }) {
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState(1);
  const maxAmount = parseInt(nft.balance || "1");

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="relative max-w-lg w-full">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-30" />
        <div className="relative bg-[#13141a] border border-white/10 rounded-3xl p-8">
          <button onClick={onClose} disabled={isLoading} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white flex items-center justify-center text-2xl disabled:opacity-50 disabled:cursor-not-allowed">
            ×
          </button>
          <h2 className="text-3xl font-black mb-6">
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">List NFT</span>
          </h2>
          <div className="mb-6 relative h-64 rounded-2xl overflow-hidden">
            <Image src={nft.image} alt={nft.name} fill className="object-cover" unoptimized />
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3">Price (Very)</label>
              <input type="number" step="0.001" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" disabled={isLoading} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:border-purple-500/50 disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3">Amount (Max: {maxAmount})</label>
              <input type="number" min="1" max={maxAmount} value={amount} onChange={(e) => setAmount(Math.min(parseInt(e.target.value) || 1, maxAmount))} disabled={isLoading} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:border-purple-500/50 disabled:opacity-50" />
            </div>
            <button onClick={() => price && onSubmit({ price, amount })} disabled={!price || isLoading} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold disabled:opacity-50 hover:scale-105 transition-all disabled:hover:scale-100 flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Listing...
                </>
              ) : (
                <>List for {(parseFloat(price || "0") * amount).toFixed(4)} Very</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Detail Modal
function DetailModal({ nft, onClose }: { nft: NFT | MarketNFT; onClose: () => void; wallet: WalletType }) {
  const isMarketNFT = "seller_address" in nft;
  const metadata = isMarketNFT ? (nft as MarketNFT).metadata : nft;
  const tokenId = isMarketNFT ? (nft as MarketNFT).token_id : (nft as NFT).tokenId;
  const category = metadata?.category || (nft as NFT).metadata?.category;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl w-full">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] rounded-3xl blur-2xl opacity-30" />
        <div className="relative bg-[#13141a] border border-white/10 rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all flex items-center justify-center text-2xl z-10">
            ×
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="relative aspect-square rounded-2xl overflow-hidden">
              <Image src={metadata?.image || "/nft-placeholder.png"} alt={metadata?.name || "NFT"} fill className="object-cover" unoptimized />
            </div>
            <div className="flex flex-col">
              <span className="text-purple-400 text-sm font-semibold mb-2">{category}</span>
              <h2 className="text-4xl font-black text-white mb-4">{metadata?.name || `NFT #${tokenId}`}</h2>
              <p className="text-gray-400 text-sm mb-6">{metadata?.description || "No description"}</p>

              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Token ID</p>
                <p className="text-white font-mono">#{tokenId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
