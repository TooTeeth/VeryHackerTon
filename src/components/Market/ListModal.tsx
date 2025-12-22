"use client";

import { useState } from "react";
import Image from "next/image";
import { NFT } from "../../services/nftService";

interface ListModalProps {
  nft: NFT;
  onClose: () => void;
  onSubmit: (data: { price: string; amount: number }) => void;
  isLoading: boolean;
}

// List Modal
export default function ListModal({ nft, onClose, onSubmit, isLoading }: ListModalProps) {
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
