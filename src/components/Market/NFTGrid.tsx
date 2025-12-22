"use client";

import { NFT } from "../../services/nftService";
import { Listing } from "../../lib/supabaseMarketplace";
import type { GroupedMarketNFT } from "../../hooks/useMarketplace";
import MyNFTCard from "./MyNFTCard";
import GroupedMarketNFTCard from "./GroupedMarketNFTCard";

interface WalletType {
  address: string;
  type: string;
}

type ViewMode = "myNFTs" | "marketplace";

interface NFTGridProps {
  viewMode: ViewMode;
  loading: boolean;
  wallet: WalletType;
  // Marketplace
  filteredGroupedNFTs: GroupedMarketNFT[];
  onMarketNFTBuy: (nft: GroupedMarketNFT) => void;
  // My NFTs
  filteredMyNFTs: NFT[];
  myListings: Record<string, Listing>;
  listedAmounts: Record<string, number>;
  onMyNFTList: (nft: NFT) => void;
  onMyNFTCancel: (nft: NFT, amount: number) => void;
  onMyNFTDetail: (nft: NFT) => void;
}

export default function NFTGrid({ viewMode, loading, wallet, filteredGroupedNFTs, onMarketNFTBuy, filteredMyNFTs, myListings, listedAmounts, onMyNFTList, onMyNFTCancel, onMyNFTDetail }: NFTGridProps) {
  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex flex-col items-center justify-center py-32">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-400 text-lg">Loading NFTs...</p>
        </div>
      </div>
    );
  }

  if (viewMode === "marketplace") {
    if (filteredGroupedNFTs.length === 0) {
      return (
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-32">
            <div className="text-7xl mb-6 opacity-50">📦</div>
            <p className="text-gray-400 text-xl">No NFTs available for sale</p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredGroupedNFTs.map((nft) => (
            <GroupedMarketNFTCard key={`${nft.contract_address}-${nft.token_id}`} nft={nft} wallet={wallet} onBuy={() => onMarketNFTBuy(nft)} />
          ))}
        </div>
      </div>
    );
  }

  // My NFTs
  if (filteredMyNFTs.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex flex-col items-center justify-center py-32">
          <div className="text-7xl mb-6 opacity-50">📦</div>
          <p className="text-gray-400 text-xl">You don&apos;t own any NFTs yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {filteredMyNFTs.map((nft) => {
          const key = `${nft.contractAddress}-${nft.tokenId}`;
          return <MyNFTCard key={key} nft={nft} wallet={wallet} listing={myListings[key]} listedAmount={listedAmounts[key] || 0} onList={() => onMyNFTList(nft)} onCancel={(amount) => onMyNFTCancel(nft, amount)} onDetail={() => onMyNFTDetail(nft)} />;
        })}
      </div>
    </div>
  );
}
