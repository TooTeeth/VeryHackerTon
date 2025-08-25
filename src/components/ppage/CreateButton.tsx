"use client";

import { useState } from "react";
import { ethers } from "ethers";
import NewStoryCreateAbi from "../../contracts/abi/NewStoryCreate.json";

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
      alert("MetaMask가 감지되지 않았습니다.");
      return false;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: VERY_CHAIN_ID }],
      });
      return true;
    } catch {
      alert("VERY 메인넷으로 전환해 주세요.");
      return false;
    }
  };

  const sendVery = async () => {
    if (loading) return; // 중복 클릭 방지

    if (!window.ethereum) {
      alert("지갑이 연결되어 있지 않습니다.");
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
        alert("1 VERY 전송 완료!");

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
          throw new Error("게임 생성 실패");
        }

        alert("게임 생성 완료!");
        onCreate(data);
      } else {
        alert("트랜잭션 실패");
      }
    } catch (err) {
      console.error(err);
      alert("전송 실패 또는 게임 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  return <span onClick={sendVery}>{loading ? "Pending..." : "Create "}</span>;
}
