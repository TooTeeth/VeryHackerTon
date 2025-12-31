"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import MintContractAbi from "../../contracts/abi/1155mint.json";
import { toast } from "react-toastify";

const CONTRACT_ADDRESS = "0x40E3b5A7d76B1b447A98a5287a153BBc36C1615E";
const VERY_CHAIN_ID = "0x1205";

type Props = {
  tokenId: number;
  amount: number;
};

export default function MintButton({ tokenId, amount }: Props) {
  const [loading, setLoading] = useState(false);

  const [isMinted, setIsMinted] = useState(false);

  const switchToVeryChain = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask가 감지되지 않았습니다.");
      return false;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: VERY_CHAIN_ID }],
      });
      return true;
    } catch {
      toast.error("VERY 메인넷으로 전환해주세요.");
      return false;
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = () => {
      window.location.reload();
    };

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        console.log("메타마스크 연결이 끊겼습니다.");
      } else {
        console.log("연결된 계정 변경:", accounts[0]);
      }
    };

    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      if (!window.ethereum?.removeListener) return;
      window.ethereum.removeListener("chainChanged", handleChainChanged);
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const mintNFT = async () => {
    if (loading || isMinted) return;

    if (tokenId < 0 || amount < 1) {
      toast.error("유효한 tokenId와 amount를 입력하세요.");
      return;
    }

    const ethereum = window.ethereum;
    if (!ethereum) {
      toast.error("MetaMask가 감지되지 않았습니다.");
      return;
    }

    let accounts = await ethereum.request({ method: "eth_accounts" });

    if (!Array.isArray(accounts) || accounts.length === 0) {
      toast.info("지갑 연결을 해주세요.");
      try {
        accounts = await ethereum.request({ method: "eth_requestAccounts" });
      } catch {
        toast.error("지갑 연결을 거부했습니다.");
        return;
      }
    }

    const switched = await switchToVeryChain();
    if (!switched) return;

    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MintContractAbi, signer);

    setLoading(true);
    try {
      const tx = await contract.mint(await signer.getAddress(), tokenId, amount);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        toast.success("민팅 성공!");
        setIsMinted(true);
      } else {
        toast.error("트랜잭션 실패");
      }
    } catch (err) {
      console.error(err);
      toast.error("민팅 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={mintNFT} disabled={loading || isMinted} className="text-2xl">
      {loading ? "민팅 중..." : "민팅하기"}
    </button>
  );
}
