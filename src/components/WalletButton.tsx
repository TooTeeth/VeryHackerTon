"use client";

import { useState } from "react";
import { FaWallet } from "react-icons/fa";
import Image from "next/image";
import WalletModal from "./WalletModal";
import ConnectedWalletModal from "./ConnectedWalletModal";

export default function WalletButton() {
  // type과 address 같이 저장
  const [connectedWallet, setConnectedWallet] = useState<{ type: "metamask" | "wepin"; address: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Wepin 로그인 시 walletId 받아서 상태 업데이트
  const handleWalletConnect = (walletType: "metamask" | "wepin", address?: string) => {
    if (!address) {
      setConnectedWallet(null);
      return;
    }
    setConnectedWallet({ type: walletType, address });
    setIsModalOpen(false);
  };

  const getWalletIcon = () => {
    if (!connectedWallet) return <FaWallet size={28} />;

    if (connectedWallet.type === "metamask") {
      return <Image src="/MetamaskLogo.png" alt="Metamask" width={28} height={28} />;
    }
    if (connectedWallet.type === "wepin") {
      return <Image src="/WepinLogo.png" alt="Wepin" width={28} height={28} />;
    }
  };

  const truncateAddress = (address: string) => {
    return address.slice(0, 4) + "..." + address.slice(-4);
  };

  const getConnectedText = () => {
    if (!connectedWallet) return "";
    const walletName = connectedWallet.type === "metamask" ? "Metamask" : "Wepin";
    return `${walletName} • ${truncateAddress(connectedWallet.address)}`;
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200">
        {getWalletIcon()}
        {connectedWallet && <span className="text-sm font-semibold text-gray-700">{getConnectedText()}</span>}
      </button>

      {isModalOpen && (connectedWallet ? <ConnectedWalletModal onClose={() => setIsModalOpen(false)} wallet={connectedWallet} onDisconnect={() => setConnectedWallet(null)} /> : <WalletModal onClose={() => setIsModalOpen(false)} onConnect={handleWalletConnect} />)}
    </>
  );
}
