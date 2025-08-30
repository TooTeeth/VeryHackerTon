"use client";

import { useState, useEffect } from "react";
import { FaWallet } from "react-icons/fa";
import Image from "next/image";
import { ethers } from "ethers";

import ConnectedWalletModal from "./ConnectedWalletModal";
import WalletModal from "./WalletModal";
import { useWallet } from "../../app/context/WalletContext";

export default function WalletButton({ modalPosition = "dropdown" }: { modalPosition?: "center" | "dropdown" }) {
  const { wallet, setWallet } = useWallet();

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      const disconnectedManually = localStorage.getItem("disconnectedManually");
      if (disconnectedManually === "true") return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_accounts", []);
        if (accounts.length > 0) {
          setWallet({ type: "metamask", address: accounts[0] });
        } else {
          setWallet(null);
        }
      } catch (error) {
        console.error("메타마스크 연결 확인 실패:", error);
        setWallet(null);
      }
    };

    checkConnection();

    if (window.ethereum?.on) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWallet({ type: "metamask", address: accounts[0] });
        } else {
          setWallet(null);
        }
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        }
      };
    }
  }, [setWallet]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "connectedWallet") {
        setWallet(event.newValue ? JSON.parse(event.newValue) : null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [setWallet]);

  // 지갑 연결/해제 콜백
  const handleWalletConnect = async (walletType: "metamask" | "wepin", address?: string) => {
    if (!address) {
      setWallet(null);
      return;
    }
    localStorage.removeItem("disconnectedManually");
    setWallet({ type: walletType, address });

    // 서버에 지갑 주소 보내기
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("서버 등록 실패:", data.error);
      } else {
        console.log("서버 등록 성공:", data);
      }
    } catch (error) {
      console.error("서버 호출 에러:", error);
    }

    setIsModalOpen(false);
  };

  // 지갑 아이콘 표시
  const getWalletIcon = () => {
    if (!wallet) return <FaWallet className="text-gray-400 hover:text-gray-600" size={28} />;

    if (wallet.type === "metamask") {
      return <Image src="/MetamaskLogo.png" alt="Metamask" width={28} height={28} />;
    }
    if (wallet.type === "wepin") {
      return <Image src="/WepinLogo.png" alt="Wepin" width={28} height={28} />;
    }
  };

  const truncateAddress = (address: string) => {
    return address.slice(0, 4) + "..." + address.slice(-4);
  };

  const getConnectedText = () => {
    if (!wallet) return "";
    const walletName = wallet.type === "metamask" ? "Metamask" : "Wepin";
    return `${walletName} • ${truncateAddress(wallet.address)}`;
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer">
        {getWalletIcon()}
        {wallet && <span className="font-semibold text-gray-100 dark:text-white">{getConnectedText()}</span>}
      </button>

      {isModalOpen && (wallet ? <ConnectedWalletModal onClose={() => setIsModalOpen(false)} onDisconnect={() => setWallet(null)} wallet={wallet} position={modalPosition} /> : <WalletModal onClose={() => setIsModalOpen(false)} onConnect={handleWalletConnect} />)}
    </>
  );
}
