"use client";

// app/vygddrasil/page.tsx
import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useWallet } from "../../app/context/WalletContext";
import { useSavedProgress } from "../../hooks/useSavedProgress";

import { ROUTES, MESSAGES } from "../../constants/vygddrasil.constants";
import { MenuButton } from "../../components/Vygdrasil/MenuButton";

export default function VygddrasilPage() {
  const router = useRouter();
  const { wallet } = useWallet();
  const { hasSavedProgress, isLoading } = useSavedProgress(wallet?.address);

  const handleContinue = () => {
    if (!wallet?.address) {
      toast.error(MESSAGES.WALLET_NOT_CONNECTED);
      return;
    }

    if (!hasSavedProgress) {
      toast.info(MESSAGES.NO_SAVED_GAME);
      return;
    }

    // Go to character select page
    router.push("/vygddrasil/select");
  };

  const handleNew = () => {
    if (!wallet?.address) {
      toast.error(MESSAGES.WALLET_NOT_CONNECTED);
      return;
    }

    router.push(ROUTES.VYGDDRASIL_NEW);
  };

  return (
    <section className="relative h-screen bg-cover bg-center z-0" style={{ backgroundImage: "url('/Vygddrasilpage/VygddrasilBackground.png')" }}>
      <div className="flex flex-col h-full justify-center items-center text-white z-10 space-y-10">
        {/* New Button */}
        <MenuButton onClick={handleNew} disabled={!wallet?.address}>
          New
        </MenuButton>

        {/* Continue Button */}
        <MenuButton onClick={handleContinue} disabled={!wallet?.address || isLoading || !hasSavedProgress} showCheckmark={!isLoading && hasSavedProgress}>
          Continue
        </MenuButton>

        {/* Status Messages */}
        {!wallet?.address && <p className="text-sm text-gray-400 mt-8">{MESSAGES.CONNECT_WALLET_PROMPT}</p>}

        {wallet?.address && !isLoading && !hasSavedProgress && <p className="text-sm text-gray-400 mt-8">{MESSAGES.NO_SAVED_PROGRESS}</p>}
      </div>
    </section>
  );
}
