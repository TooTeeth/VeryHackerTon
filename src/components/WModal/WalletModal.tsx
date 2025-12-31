"use client";

import { FaTimes } from "react-icons/fa";

import Image from "next/image";
import { loginWithWepin } from "../../lib/wepin";
import { ethers } from "ethers";
import { useState } from "react";
import { toast } from "react-toastify";

const wallets: { name: string; src: string; type: "metamask" | "wepin" }[] = [
  { name: "Metamask", src: "/MetamaskLogo.png", type: "metamask" },
  { name: "Wepin", src: "/WepinLogo.png", type: "wepin" },
];

export default function WalletModal({ onClose, onConnect }: { onClose: () => void; onConnect: (walletType: "metamask" | "wepin", address?: string) => void }) {
  const [loading, setLoading] = useState(false);

  const handleWalletClick = async (type: "metamask" | "wepin") => {
    if (type === "metamask") {
      if (!window.ethereum) {
        toast.info("MetaMask 설치 페이지로 이동합니다.");
        window.location.href = "https://link.metamask.io/rewards?referral=09RAGH";
        return;
      }
      setLoading(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length > 0) {
          onConnect("metamask", accounts[0]);
          onClose();
        } else {
          toast.error("지갑을 찾을 수 없습니다.");
        }
      } catch {
        toast.error("메타마스크 연결 실패");
      } finally {
        setLoading(false);
      }
    } else if (type === "wepin") {
      try {
        const result = await loginWithWepin();
        if (result?.walletId) {
          onConnect(type, result.walletId); // walletId 넘겨줌
        } else {
          console.error("Wepin 로그인 실패 또는 walletId 없음");
          onConnect(type); // 실패 시 주소 없이 호출
        }
      } catch (err) {
        console.error("Wepin 로그인 에러", err);
        onConnect(type);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-gray-900 rounded-xl p-6 w-[320px] shadow-xl text-center">
        <button onClick={onClose} className="absolute top-2 right-2 text-black dark:text-white">
          <FaTimes />
        </button>
        <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">Connect Wallet</h2>
        <p className="text-sm text-gray-500 mb-4">Recommend</p>
        <div className="flex justify-center gap-4 text-black dark:text-white">
          {wallets.map((wallet) => (
            <button key={wallet.name} className={`w-24 h-24 border rounded-lg p-3 flex flex-col items-center justify-center hover:shadow-md ${loading ? "opacity-50 cursor-not-allowed" : ""}`} onClick={() => handleWalletClick(wallet.type)} disabled={loading}>
              <Image src={wallet.src} alt={wallet.name} width={40} height={40} />
              <span className="text-sm font-medium">{wallet.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
