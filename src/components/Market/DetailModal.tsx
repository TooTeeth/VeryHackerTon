"use client";

import Image from "next/image";
import { NFT } from "../../services/nftService";
import { Listing } from "../../lib/supabaseMarketplace";

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

interface DetailModalProps {
  nft: NFT | MarketNFT;
  onClose: () => void;
  wallet: WalletType;
}

// Detail Modal
export default function DetailModal({ nft, onClose }: DetailModalProps) {
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
