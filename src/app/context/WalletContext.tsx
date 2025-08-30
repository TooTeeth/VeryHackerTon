"use client";

import { createContext, useContext, useState, useEffect } from "react";

type WalletType = "metamask" | "wepin";
type WalletInfo = { type: WalletType; address: string } | null;

interface WalletContextType {
  wallet: WalletInfo;

  setWallet: (wallet: WalletInfo) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

//state share
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<WalletInfo>(null);

  // Load wallet from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("connectedWallet");
    if (stored) {
      setWallet(JSON.parse(stored));
    }
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (wallet) {
      localStorage.setItem("connectedWallet", JSON.stringify(wallet));
    } else {
      localStorage.removeItem("connectedWallet");
    }
  }, [wallet]);

  return <WalletContext.Provider value={{ wallet, setWallet }}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
