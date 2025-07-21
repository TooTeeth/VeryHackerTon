"use client";

import { FaTimes } from "react-icons/fa";
import { loginWithWepin } from "../lib/wepin";

const wallets: { name: string; src: string; type: "metamask" | "wepin" }[] = [
  { name: "Metamask", src: "/MetamaskLogo.png", type: "metamask" },
  { name: "Wepin", src: "/WepinLogo.png", type: "wepin" },
];

export default function WalletModal({ onClose, onConnect }: { onClose: () => void; onConnect: (walletType: "metamask" | "wepin") => void }) {
  const handleWalletClick = async (type: "metamask" | "wepin") => {
    console.log("onConnect prop:", onConnect);
    if (type === "metamask") {
      console.log("🦊 Metamask 연결 시도 (직접 구현 필요)");
      // TODO: Metamask 연결 로직
    } else if (type === "wepin") {
      await loginWithWepin();
    }

    onConnect(type);
    console.log("모달 닫기 호출 전");
    onClose();
    console.log("모달 닫기 호출 후");
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose}>
          <FaTimes />
        </button>
        <div className="text-lg mb-5">Connect Wallet</div>
        <div className="text-sm text-gray-400">Recommend</div>
        <div className="flex flex-wrap justify-center gap-4">
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              className="w-24 h-25 border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center
              cursor-pointer hover:shadow-md transition-shadow"
              type="button"
              onClick={() => handleWalletClick(wallet.type)}
            >
              <img src={wallet.src} alt={wallet.name} className="w-12 h-12 mb-2" />
              <span className="text-sm font-medium truncate">{wallet.name}</span>
            </button>
          ))}
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
  background: "#fff",
  padding: "2rem",
  borderRadius: "12px",
  position: "relative",
  width: "300px",
  textAlign: "center",
};

const closeBtnStyle: React.CSSProperties = {
  position: "absolute",
  top: "10px",
  right: "10px",
  background: "none",
  border: "none",
  cursor: "pointer",
};

const iconContainerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-around",
  marginTop: "1rem",
};
