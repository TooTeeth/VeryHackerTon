"use client";

import Image from "next/image";
import { FaTimes } from "react-icons/fa";
import { logoutFromWepin, openWepinWidget } from "../lib/wepin";

import { IoWallet } from "react-icons/io5";
import { FcCancel } from "react-icons/fc";

const walletInfo: Record<"metamask" | "wepin", { name: string; logo: string }> = {
  metamask: { name: "Metamask", logo: "/MetamaskLogo.png" },
  wepin: { name: "Wepin", logo: "/WepinLogo.png" },
};

export default function ConnectedWalletModal({ onClose, wallet, onDisconnect }: { onClose: () => void; onDisconnect: () => void; wallet: { type: "metamask" | "wepin"; address: string } }) {
  const { type, address } = wallet;
  const { name, logo } = walletInfo[type];

  const handleDisconnect = async () => {
    if (wallet.type === "wepin") {
      await logoutFromWepin(); // Wepin 로그아웃
    }
    onDisconnect(); // 상태 초기화 (WalletButton 등에서 처리)
    onClose(); // 모달 닫기
  };

  const handlewindow = async () => {
    if (wallet.type === "wepin") {
      await openWepinWidget(); // Wepin 로그아웃
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose}>
          <FaTimes />
        </button>

        <div className="flex flex-col items-center gap-4">
          {/* 상단: 로고 + 이름 */}
          <div className="flex  items-center">
            <Image src={logo} alt={name} width={40} height={40} />
            <span className="text-sm font-medium text-gray-800 mt-1">{name}</span>
          </div>

          {/* 주소 부분 */}
          <div
            className="w-60 h-10 border border-gray-200 rounded-lg p-3 flex items-center justify-center
              cursor-pointer hover:bg-gray-200 hover:shadow-lg transition-shadow gap-2 text-sm font-semibold"
            onClick={handlewindow}
          >
            <IoWallet size={20} />
            <span className="">
              {address.slice(0, 4)}...{address.slice(-4)}
            </span>
          </div>

          <button
            className="w-60 h-10 border border-gray-200 rounded-lg p-3 flex items-center justify-center
              cursor-pointer hover:bg-gray-200 hover:shadow-lg transition-shadow gap-2 text-sm font-semibold"
            onClick={handleDisconnect}
          >
            <FcCancel size={25} /> Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(5% + 10px)",
  right: 30,
  background: "#fff",
  padding: "1.5rem",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  width: "320px",
  textAlign: "center",
  zIndex: 1000,
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: "10px",
  right: "10px",
  background: "none",
  border: "none",
  fontSize: "1.2rem",
  cursor: "pointer",
};
