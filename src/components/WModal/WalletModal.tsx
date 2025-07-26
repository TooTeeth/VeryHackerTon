"use client";

import { FaTimes } from "react-icons/fa";

import Image from "next/image";
import { loginWithWepin } from "../../lib/wepin";

const wallets: { name: string; src: string; type: "metamask" | "wepin" }[] = [
  { name: "Metamask", src: "/MetamaskLogo.png", type: "metamask" },
  { name: "Wepin", src: "/WepinLogo.png", type: "wepin" },
];

export default function WalletModal({ onClose, onConnect }: { onClose: () => void; onConnect: (walletType: "metamask" | "wepin", address?: string) => void }) {
  const handleWalletClick = async (type: "metamask" | "wepin") => {
    if (type === "metamask") {
      // 메타마스크 로그인은 추후 구현
    } else if (type === "wepin") {
      try {
        const result = await loginWithWepin();
        if (result?.walletId) {
          onConnect(type, result.walletId); // walletId 넘겨줌
        } else {
          console.error("Wepin 로그인 실패 또는 walletId 없음");
          onConnect(type); // 실패 시 주소 없이 호출
        }
      } catch (error) {
        console.error("Wepin 로그인 에러", error);
        onConnect(type);
      }
    }
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose} className="dark:text-black">
          <FaTimes />
        </button>
        <div className="text-lg mb-5 dark:text-black">Connect Wallet</div>
        <div className="text-sm mb-3 text-gray-400">Recommend</div>
        <div className="flex flex-wrap justify-center gap-4">
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              className="w-24 h-25 border border-gray-200 rounded-lg p-3 flex flex-col items-center justify-center
              cursor-pointer hover:shadow-md transition-shadow"
              type="button"
              onClick={() => handleWalletClick(wallet.type)}
            >
              <Image src={wallet.src} alt={wallet.name} width={200} height={50} />
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
