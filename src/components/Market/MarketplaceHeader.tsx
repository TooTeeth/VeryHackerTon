"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface WalletType {
  address: string;
  type: string;
}

type ViewMode = "myNFTs" | "marketplace";

interface MarketplaceHeaderProps {
  wallet: WalletType;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onDisconnect: () => void;
}

export default function MarketplaceHeader({ wallet, viewMode, onViewModeChange, onDisconnect }: MarketplaceHeaderProps) {
  const pathname = usePathname();
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
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
              <button onClick={() => onViewModeChange("marketplace")} className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${viewMode === "marketplace" ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow-lg shadow-purple-500/30" : "text-gray-400 hover:text-white"}`}>
                Marketplace
              </button>
              <button onClick={() => onViewModeChange("myNFTs")} className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${viewMode === "myNFTs" ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow-lg shadow-purple-500/30" : "text-gray-400 hover:text-white"}`}>
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
                    <button onClick={onDisconnect} className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2">
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
  );
}
