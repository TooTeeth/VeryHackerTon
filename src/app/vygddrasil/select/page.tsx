"use client";

import CharacterSelect from "../../../components/Vygdrasil/CharacterSelect";
import { useWallet } from "../../../app/context/WalletContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CharacterSelectPage() {
  const { wallet } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!wallet?.address) {
      router.push("/vygddrasil");
    }
  }, [wallet, router]);

  if (!wallet?.address) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">지갑을 연결해주세요...</div>
      </div>
    );
  }

  return <CharacterSelect walletAddress={wallet.address} />;
}
