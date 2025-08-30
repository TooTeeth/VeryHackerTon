"use client";
import Image from "next/image";
import { FaTimes } from "react-icons/fa";
import { logoutFromWepin, openWepinWidget } from "../../lib/wepin";

import { IoWallet } from "react-icons/io5";
import { FcCancel } from "react-icons/fc";

const walletInfo: Record<"metamask" | "wepin", { name: string; logo: string }> = {
  metamask: { name: "Metamask", logo: "/MetamaskLogo.png" },
  wepin: { name: "Wepin", logo: "/WepinLogo.png" },
};

export default function ConnectedWalletModal({ onClose, wallet, onDisconnect, position = "dropdown" }: { onClose: () => void; onDisconnect: () => void; wallet: { type: "metamask" | "wepin"; address: string }; position?: "center" | "dropdown" }) {
  const { type, address } = wallet;
  const { name, logo } = walletInfo[type];

  const handleDisconnect = async () => {
    if (wallet.type === "wepin") {
      await logoutFromWepin(); // Wepin 로그아웃
    }

    // 🔽 MetaMask 권한 제거 시도
    if (wallet.type === "metamask" && typeof window !== "undefined" && window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
        console.log("MetaMask 권한 제거 성공");
      } catch (err) {
        console.error("MetaMask 권한 제거 실패", err);
      }
    }

    localStorage.setItem("disconnectedManually", "true"); // 수동 연결 해제 플래그
    localStorage.removeItem("connectedWallet");

    onDisconnect(); // 상태 초기화
    onClose(); // 모달 닫기
  };

  const handlewindow = async () => {
    if (wallet.type === "wepin") {
      await openWepinWidget();
    }
  };

  return (
    <>
      {position === "center" && <div className="fixed inset-0 bg-black/50 z-[999]" onClick={onClose} />}

      <div className={`z-[1000] ${position === "center" ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : "absolute mt-60 right-30"} bg-white p-6 rounded-xl w-[320px] shadow-xl`}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-600 hover:text-black">
          <FaTimes />
        </button>

        <div className="flex flex-col items-center gap-4 text-black">
          <div className="flex items-center gap-2">
            <Image src={logo} alt={name} width={40} height={40} />
            <span className="text-sm font-medium">{name}</span>
          </div>

          <div onClick={handlewindow} className="w-60 h-10 border border-gray-200 rounded-lg px-3 flex items-center justify-center cursor-pointer hover:bg-gray-100 gap-2 text-sm font-semibold">
            <IoWallet size={20} />
            <span>
              {address.slice(0, 4)}...{address.slice(-4)}
            </span>
          </div>

          <button onClick={handleDisconnect} className="w-60 h-10 border border-gray-200 rounded-lg px-3 flex items-center justify-center cursor-pointer hover:bg-gray-100 gap-2 text-sm font-semibold">
            <FcCancel size={25} /> Disconnect
          </button>
        </div>
      </div>
    </>
  );
}
