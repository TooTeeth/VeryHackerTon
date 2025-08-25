"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";

interface User {
  id: string;
  wallet_address: string;
  created_at: string;
}

export default function MetaMaskConnect() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);

      window.ethereum.on("accountsChanged", (accounts) => {
        setAccount(accounts[0] || null);
        if (accounts[0]) {
          registerUser(accounts[0]);
        } else {
          setUser(null);
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    } else {
      setError("MetaMask를 설치해주세요!");
    }
  }, []);

  const registerUser = async (walletAddress: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setUser(null);
      } else {
        setUser(data.user);
        setError(null);
      }
    } catch (err) {
      setError("사용자 등록 중 오류가 발생했습니다.");
      setUser(null);
    }
  };

  const connectWallet = async () => {
    if (!provider) return;

    try {
      const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
      setAccount(accounts[0]);
      if (accounts[0]) {
        await registerUser(accounts[0]);
      }
      setError(null);
    } catch (err) {
      setError("지갑 연결에 실패했습니다.");
      console.error(err);
    }
  };

  return (
    <div className="p-4">
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {user ? (
        <div>
          <div>연결된 계정: {account}</div>
          <div>사용자 ID: {user.id}</div>
        </div>
      ) : (
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={connectWallet}>
          지갑 연결하기
        </button>
      )}
    </div>
  );
}
