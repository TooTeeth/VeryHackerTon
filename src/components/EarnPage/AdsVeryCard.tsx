"use client";
import { useState, useEffect } from "react";
import { useWallet } from "../../app/context/WalletContext";
import { supabase } from "../../lib/supabaseClient";
import Image from "next/image";
import { FcApproval } from "react-icons/fc";
import { toast } from "react-toastify";

type CardType = {
  id: number;
  name: string;
  image: string;
  image_claimed?: string;
  url?: string;
  Adsvalue: number;
  claimed_by?: string[];
};

export default function AdsVeryCard() {
  const { wallet } = useWallet();

  const [totalClaimed, setTotalClaimed] = useState(0);

  const [cards, setCards] = useState<CardType[]>([]);

  //Local state
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from("redirects").select("*");
      if (!error && data) setCards(data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("totalClaimed");
      if (stored) setTotalClaimed(parseInt(stored, 10));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("totalClaimed", totalClaimed.toString());
    }
  }, [totalClaimed]);

  //Click Ads
  const handleClaim = async (cardId: number) => {
    if (!wallet?.address) return toast.error("Your wallet is not connected.");

    const { data, error } = await supabase.from("redirects").select("*").eq("id", cardId).single();

    if (error || !data) return;

    const alreadyClaimed = data.claimed_by?.includes(wallet.address);
    if (alreadyClaimed) return;

    const updatedClaims = [...(data.claimed_by || []), wallet.address];

    await supabase.from("redirects").update({ claimed_by: updatedClaims }).eq("id", cardId);

    setTotalClaimed((prev) => prev + data.Adsvalue);

    setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, claimed_by: updatedClaims } : card)));
  };

  //Claim total AdsVery
  const handleTotalClaim = async () => {
    if (!wallet?.address) return toast.error("Metamask is not installed.");

    const { data: user } = await supabase.from("vtdn").select("*").eq("wallet", wallet.address).single();

    const newBalance = (user?.vtdn_balance || 0) + totalClaimed * 100;

    await supabase.from("vtdn").upsert({ wallet: wallet.address, vtdn_balance: newBalance });

    toast.success(`${totalClaimed * 100} VTDN Claim Done`);
    setTotalClaimed(0);
  };

  return (
    <section className="max-w-screen-lg mx-auto px-6 min-h-screen pt-20 ">
      <div className="mb-8 font-bold flex justify-between">
        <h2
          className="text-4xl relative inline-block
          after:block after:h-0.5 after:mt-1
          after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:w-full"
        >
          AdsVery
        </h2>
        <button onClick={handleTotalClaim} className="px-4 py-2 text-black rounded flex items-center space-x-2">
          <Image src="/Earnpage/AdsAmount.png" alt="AdsVery" width={32} height={32} />
          <span>{totalClaimed}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
        {cards.map((card) => {
          const isValueClaimed = wallet?.address ? card.claimed_by?.includes(wallet.address) : false;
          const handleCardClick = () => {
            if (card.url) {
              window.open(card.url, "_blank");
            }
          };

          return (
            <div key={card.id} className="cursor-pointer font-bold ring-2 ring-gray-100" onClick={handleCardClick}>
              <Image src={card.image || "/Mainpage/Very.png"} alt={card.name} width={214} height={241} className="w-full object-cover" />

              <div className="flex justify-between px-2 py-1">
                <span>{card.name}</span>

                {!isValueClaimed ? (
                  <span
                    className="flex items-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClaim(card.id);
                      if (card.url) window.open(card.url, "_blank");
                    }}
                  >
                    <Image src="/Earnpage/AdsAmount.png" alt="Ads Amount" width={16} height={16} className="mr-1" />
                    {card.Adsvalue}
                  </span>
                ) : (
                  <span className="flex items-center text-gray-300">
                    <FcApproval />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
