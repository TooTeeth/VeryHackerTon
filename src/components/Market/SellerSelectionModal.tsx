"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import NFTPriceChart from "./NFTPriceChart";

interface SellerListing {
  seller_address: string;
  listing_id?: string;
  price: string;
  amount: number;
  created_at?: string;
}

interface GroupedMarketNFT {
  contract_address: string;
  token_id: string;
  metadata?: {
    name: string;
    description: string;
    image: string;
    category?: string;
  };
  sellers: SellerListing[];
  uniqueSellerCount: number;
  totalAmount: number;
  lowestPrice: string;
  highestPrice: string;
}

interface WalletType {
  address: string;
  type: string;
}

type SortOption = "recent" | "low" | "high";

interface SellerSelectionModalProps {
  nft: GroupedMarketNFT;
  wallet: WalletType;
  sortBy: SortOption;
  onClose: () => void;
  onBuy: (seller: SellerListing, amount: number) => void;
  isLoading: boolean;
}

// ✅ 판매자 선택 모달 - 왼쪽 NFT 카드, 오른쪽 판매자 목록
export default function SellerSelectionModal({ nft, wallet, sortBy: initialSortBy, onClose, onBuy, isLoading }: SellerSelectionModalProps) {
  const [selectedSeller, setSelectedSeller] = useState<SellerListing | null>(null);
  const [buyAmount, setBuyAmount] = useState(1);
  const [modalSortBy, setModalSortBy] = useState<SortOption>(initialSortBy);
  const [isChartOpen, setIsChartOpen] = useState(false);

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
                <Image src={nft.metadata?.image || "/VeryLogo.png"} alt={nft.metadata?.name || "NFT"} fill className="object-cover" unoptimized />
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

              {/* Chart Section - Collapsible */}
              <div className="border-t border-white/10">
                <button
                  onClick={() => setIsChartOpen(!isChartOpen)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <span className="text-white font-semibold flex items-center gap-2">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    Price History & Volume
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isChartOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isChartOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-4 pb-4">
                    <NFTPriceChart
                      contractAddress={nft.contract_address}
                      tokenId={nft.token_id}
                      isVisible={isChartOpen}
                    />
                  </div>
                </div>
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
                        <>Buy for {(Number(selectedSeller.price) * buyAmount).toFixed(4)} Very</>
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
