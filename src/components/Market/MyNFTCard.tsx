"use client";

import { useState } from "react";
import Image from "next/image";
import { NFT } from "../../services/nftService";
import { Listing } from "../../lib/supabaseMarketplace";

interface WalletType {
  address: string;
  type: string;
}

interface MyNFTCardProps {
  nft: NFT;
  wallet: WalletType;
  listing?: Listing;
  listedAmount: number;
  onList: () => void;
  onCancel: (amount: number) => void;
  onDetail: () => void;
}

// My Collection NFT Card
export default function MyNFTCard({ nft, wallet, listing, listedAmount, onList, onCancel, onDetail }: MyNFTCardProps) {
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
