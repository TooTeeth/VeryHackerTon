"use client";

import { useState, useEffect, useMemo } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { NFT } from "../../services/nftService";
import { Listing } from "../../lib/supabaseMarketplace";
import HistorySection from "./HistorySection";
import { useMarketplace, type GroupedMarketNFT } from "../../hooks/useMarketplace";

// UI Components
import MarketplaceHeader from "./MarketplaceHeader";
import HeroSection from "./HeroSection";
import FilterSection from "./FilterSection";
import NFTGrid from "./NFTGrid";
import ListModal from "./ListModal";
import SellerSelectionModal from "./SellerSelectionModal";
import DetailModal from "./DetailModal";

type Category = "전체" | "무기" | "신발" | "장갑" | "바지" | "상의" | "망토" | "투구" | "장신구" | "칭호" | "스킬";
type ViewMode = "myNFTs" | "marketplace";
type SortOption = "recent" | "low" | "high";

interface MarketNFT extends Listing {
  metadata?: {
    name: string;
    description: string;
    image: string;
    category?: string;
  };
  listedAmount?: number;
}

interface WalletType {
  address: string;
  type: string;
}

interface MarketplaceContainerProps {
  wallet: WalletType;
  onDisconnect: () => void;
}

export default function MarketplaceContainer({ wallet, onDisconnect }: MarketplaceContainerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("marketplace");

  // 커스텀 훅 사용
  const { myNFTs, groupedMarketNFTs, myListings, listedAmounts, loading, loadMyNFTs, loadMarketplace, handleListNFT, handleBuyFromSeller, handleCancelListing } = useMarketplace(wallet?.address);

  const [selectedNFT, setSelectedNFT] = useState<NFT | MarketNFT | null>(null);
  const [selectedGroupedNFT, setSelectedGroupedNFT] = useState<GroupedMarketNFT | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [modalMode, setModalMode] = useState<"list" | "buy" | "detail" | "selectSeller">("list");
  const [isListingPending, setIsListingPending] = useState(false);
  const [isBuyingPending, setIsBuyingPending] = useState(false);

  useEffect(() => {
    if (viewMode === "myNFTs" && wallet?.address) {
      loadMyNFTs();
    } else if (viewMode === "marketplace") {
      loadMarketplace();
    }
  }, [viewMode, wallet?.address, loadMyNFTs, loadMarketplace]);

  const filteredGroupedNFTs = useMemo(() => {
    return groupedMarketNFTs
      .filter((nft) => {
        const category = nft.metadata?.category;
        if (selectedCategory !== "전체" && category !== selectedCategory) return false;
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

  const topNFTs = useMemo(() => {
    return [...groupedMarketNFTs].sort((a, b) => parseFloat(b.highestPrice) - parseFloat(a.highestPrice)).slice(0, 5);
  }, [groupedMarketNFTs]);

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" toastStyle={{ marginTop: "80px" }} />

      <MarketplaceHeader wallet={wallet} viewMode={viewMode} onViewModeChange={setViewMode} onDisconnect={onDisconnect} />

      <div>
        <div>
          {viewMode === "marketplace" && (
            <HeroSection
              topNFTs={topNFTs}
              onNFTClick={(nft) => {
                setSelectedGroupedNFT(nft);
                setModalMode("selectSeller");
              }}
            />
          )}

          <FilterSection viewMode={viewMode} searchQuery={searchQuery} onSearchChange={setSearchQuery} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} sortBy={sortBy} onSortChange={setSortBy} itemCount={viewMode === "marketplace" ? filteredGroupedNFTs.length : filteredMyNFTs.length} />

          <NFTGrid
            viewMode={viewMode}
            loading={loading}
            wallet={wallet}
            filteredGroupedNFTs={filteredGroupedNFTs}
            onMarketNFTBuy={(nft) => {
              setSelectedGroupedNFT(nft);
              setModalMode("selectSeller");
            }}
            filteredMyNFTs={filteredMyNFTs}
            myListings={myListings}
            listedAmounts={listedAmounts}
            onMyNFTList={(nft) => {
              setSelectedNFT(nft);
              setModalMode("list");
            }}
            onMyNFTCancel={handleCancelListing}
            onMyNFTDetail={(nft) => {
              setSelectedNFT(nft);
              setModalMode("detail");
            }}
          />
        </div>
      </div>

      {viewMode === "myNFTs" && wallet?.address && (
        <div className="max-w-[1400px] mx-auto px-8 mt-8">
          <HistorySection wallet={wallet} />
        </div>
      )}

      {/* Modals */}
      {selectedNFT && modalMode === "list" && (
        <ListModal
          nft={selectedNFT as NFT}
          onClose={() => setSelectedNFT(null)}
          onSubmit={async (data) => {
            setIsListingPending(true);
            try {
              await handleListNFT(selectedNFT as NFT, data);
              setSelectedNFT(null);
            } finally {
              setIsListingPending(false);
            }
          }}
          isLoading={isListingPending}
        />
      )}

      {selectedGroupedNFT && modalMode === "selectSeller" && (
        <SellerSelectionModal
          nft={selectedGroupedNFT}
          wallet={wallet}
          sortBy={sortBy}
          onClose={() => setSelectedGroupedNFT(null)}
          onBuy={async (seller, amount) => {
            setIsBuyingPending(true);
            try {
              await handleBuyFromSeller(selectedGroupedNFT, seller, amount);
              setSelectedGroupedNFT(null);
            } finally {
              setIsBuyingPending(false);
            }
          }}
          isLoading={isBuyingPending}
        />
      )}

      {selectedNFT && modalMode === "detail" && <DetailModal nft={selectedNFT} onClose={() => setSelectedNFT(null)} wallet={wallet} />}

      <style jsx global>{`
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
