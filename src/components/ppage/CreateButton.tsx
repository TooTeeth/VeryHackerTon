"use client";

import { useState } from "react";
import { ethers } from "ethers";
import NewStoryCreateAbi from "../../contracts/abi/NewStoryCreate.json";

const CONTRACT_ADDRESS = "0x54507082a8BD3f4aef9a69Ae58DeAD63cAB97244";
export default function CreateButton() {
  const [loading, setLoading] = useState(false);

  /*Transfer VeryMainnet */
  const VERY_CHAIN_ID = "0x1205";

  const switchToVeryChain = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask가 감지되지 않았습니다.");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: VERY_CHAIN_ID }],
      });
    } catch (err) {
      alert("VERY 메인넷으로 전환해 주세요.");
      throw err;
    }
  };

  /*StoryCreate Transaction */
  const sendVery = async () => {
    if (!window.ethereum) {
      alert("지갑이 연결되어 있지 않습니다.");
      return;
    }
    await switchToVeryChain();

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, NewStoryCreateAbi, signer);

    setLoading(true);
    try {
      const tx = await contract.StoryCreate({ value: ethers.parseEther("1") });
      await tx.wait();
      alert("1 VERY 전송 완료!");
    } catch (err) {
      console.error(err);
      alert("전송 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={sendVery} disabled={loading}>
      {loading ? "전송 중..." : "Create (1 VERY 전송)"}
    </button>
  );
}
