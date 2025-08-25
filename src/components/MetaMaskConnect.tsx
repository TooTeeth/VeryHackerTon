"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export default function MetaMaskConnect() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);

      // Listen for account changes
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || null);
      });

      // Listen for chain changes
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    } else {
      setError("MetaMask를 설치해주세요!");
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) return;

    try {
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      setError(null);
    } catch (err) {
      setError("지갑 연결에 실패했습니다.");
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {account ? (
        <div>연결된 계정: {account}</div>
      ) : (
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={connectWallet}>
          지갑 연결하기
        </button>
      )}
    </div>
  );
}
