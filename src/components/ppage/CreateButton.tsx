"use client";

import { useState } from "react";
import { ethers } from "ethers";
import NewStoryCreateAbi from "../../contracts/abi/NewStoryCreate.json";
import { toast } from "react-toastify";

const CONTRACT_ADDRESS = "0x54507082a8BD3f4aef9a69Ae58DeAD63cAB97244";

type Props = {
  data: {
    Title: string;
    Players: number;
    Era: string;
    Genre: string;
    Plan: number;
  };
  onCreate: (data: { Title: string; Players: number; Era: string; Genre: string; Plan: number }) => void;
};

export default function CreateButton({ data, onCreate }: Props) {
  const [loading, setLoading] = useState(false);
  const VERY_CHAIN_ID = "0x1205";

  const switchToVeryChain = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask was not detected.");
      return false;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: VERY_CHAIN_ID }],
      });
      return true;
    } catch {
      toast.error("Please switch to the VERY mainnet.");
      return false;
    }
  };

  const sendVery = async () => {
    if (loading) return;

    if (!window.ethereum) {
      toast.error("Wallet is not connected.");
      return;
    }

    const switched = await switchToVeryChain();
    if (!switched) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, NewStoryCreateAbi, signer);

    setLoading(true);
    try {
      const tx = await contract.StoryCreate({ value: ethers.parseEther("1") });
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        toast.success("Transaction confirmation!");

        const response = await fetch("/api/stream/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            Title: data.Title,
            Players: data.Players,
            Era: data.Era,
            Genre: data.Genre,
            Plan: data.Plan,
            Creator: await signer.getAddress(),
            createdAt: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create.");
        }

        toast.success("Create complete.");
        onCreate(data);
      } else {
        toast.error("Transaction failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send or create game");
    } finally {
      setLoading(false);
    }
  };

  return <span onClick={sendVery}>{loading ? "Pending..." : "Create "}</span>;
}
