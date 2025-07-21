"use client";

import { useState } from "react";
import { FaWallet } from "react-icons/fa";
import Image from "next/image";
import WalletModal from "./WalletModal";

export default function WalletButton() {
  const [connectedWallet, setConnectedWallet] = useState<"metamask" | "wepin" | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleWalletConnect = (walletType: "metamask" | "wepin") => {
    setConnectedWallet(walletType);
    setIsModalOpen(false);
  };

  const getWalletIcon = () => {
    if (connectedWallet === "metamask") {
      return <Image src="/MetamaskLogo.png" alt="Metamask" width={28} height={28} />;
    } else if (connectedWallet === "wepin") {
      return <Image src="/WepinLogo.png" alt="Wepin" width={50} height={28} />;
    } else {
      return <FaWallet size={28} />;
    }
  };

  const getConnectedText = () => {
    if (connectedWallet === "metamask") return "Connected Metamask";
    if (connectedWallet === "wepin") return "Connected Wepin";
    return "";
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)} className="flex items-center  text-sm cursor-pointer">
        {getWalletIcon()}
        {connectedWallet && <span>{getConnectedText()}</span>}
      </button>

      {isModalOpen && <WalletModal onClose={() => setIsModalOpen(false)} onConnect={handleWalletConnect} />}
    </>
  );
}
