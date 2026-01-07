"use client";

import { useLanguage } from "../../context/LanguageContext";

export default function EmptyWalletState() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center p-6">
      <div className="text-center max-w-lg">
        <div className="mb-10 relative inline-block">
          <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] blur-3xl opacity-30 animate-pulse"></div>
          <div className="relative text-9xl filter drop-shadow-2xl">🔐</div>
        </div>
        <h1 className="text-5xl font-black mb-4">
          <span className="bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] bg-clip-text text-transparent">{t("market.title")}</span>
        </h1>
        <p className="text-gray-400 text-xl mb-10">{t("market.connectWallet")}</p>
        <div className="h-1 w-full bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] rounded-full"></div>
      </div>
    </div>
  );
}
