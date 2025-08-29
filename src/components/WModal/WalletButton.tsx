"use client";

import { useEffect, useState } from "react";
import { FaWallet } from "react-icons/fa";
import Image from "next/image";

import ConnectedWalletModal from "./ConnectedWalletModal";
import WalletModal from "./WalletModal";
import { ethers } from "ethers";

export default function WalletButton() {
  // type과 address 같이 저장
  const [connectedWallet, setConnectedWallet] = useState<{ type: "metamask" | "wepin"; address: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("connectedWallet");
      if (stored) {
        setConnectedWallet(JSON.parse(stored));
      }
    } catch (error) {
      console.error("지갑 정보 불러오기 실패:", error);
    }
  }, []);

  // 연결 상태가 바뀔 때 localStorage 반영
  useEffect(() => {
    if (connectedWallet) {
      localStorage.setItem("connectedWallet", JSON.stringify(connectedWallet));
    } else {
      localStorage.removeItem("connectedWallet");
    }
  }, [connectedWallet]);

  // 지갑 연결 여부 확인
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      // 사용자가 수동으로 연결 해제한 경우 → 자동 연결 안 함
      const disconnectedManually = localStorage.getItem("disconnectedManually");
      if (disconnectedManually === "true") return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          setConnectedWallet({ type: "metamask", address: accounts[0] });
        }
      } catch (error) {
        console.error("메타마스크 연결 확인 실패:", error);
      }
    };

    checkConnection();
  }, []);

  // Wepin 로그인 시 walletId 받아서 상태 업데이트
  const handleWalletConnect = (walletType: "metamask" | "wepin", address?: string) => {
    if (!address) {
      setConnectedWallet(null);
      return;
    }
    localStorage.removeItem("disconnectedManually");
    setConnectedWallet({ type: walletType, address });
    setIsModalOpen(false);
  };
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          setConnectedWallet({ type: "metamask", address: accounts[0] });
        } else {
          setConnectedWallet(null);
        }
      } catch {
        setConnectedWallet(null);
      }
    };
    checkConnection();
  }, []);

  const getWalletIcon = () => {
    if (!connectedWallet) return <FaWallet className="text-gray-400 hover:text-gray-600" size={28} />;

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
      <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2  px-3 py-1 rounded-full cursor-pointer  ">
        {getWalletIcon()}
        {connectedWallet && <span className=" font-semibold text-gray-100 dark:text-white">{getConnectedText()}</span>}
      </button>

      {isModalOpen && (connectedWallet ? <ConnectedWalletModal onClose={() => setIsModalOpen(false)} wallet={connectedWallet} onDisconnect={() => setConnectedWallet(null)} /> : <WalletModal onClose={() => setIsModalOpen(false)} onConnect={handleWalletConnect} />)}
    </>
  );
}
