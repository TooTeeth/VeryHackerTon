"use client";

import Image from "next/image";

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

interface GroupedMarketNFTCardProps {
  nft: GroupedMarketNFT;
  wallet: WalletType;
  onBuy: () => void;
}

// ✅ 그룹화된 마켓 NFT 카드 (최고가만 표시)
export default function GroupedMarketNFTCard({ nft, wallet, onBuy }: GroupedMarketNFTCardProps) {
  const isOwner = nft.sellers.every((s) => s.seller_address.toLowerCase() === wallet?.address?.toLowerCase());
  // ✅ ETH 단위로 표시 (원본과 동일)
  const displayPrice = Number(nft.highestPrice || "0").toFixed(2);

  return (
    <div className="group relative m-4" onClick={() => onBuy()}>
      <div className="absolute -inset-3 bg-white/15 backdrop-blur-md shadow-lg" />
      <div className="relative overflow-hidden transition-all duration-500 cursor-pointer" style={{ background: "linear-gradient(180deg, #2a2a3e 0%, #1a1a2e 100%)", border: "none" }}>
        <div className="relative h-56 overflow-hidden">
          <Image src={nft.metadata?.image || "/VeryLogo.png"} alt={nft.metadata?.name || "NFT"} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />

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
