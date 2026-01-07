"use client";
import { useState, useEffect } from "react";
import { useWallet } from "../../app/context/WalletContext";
import { supabase } from "../../lib/supabaseClient";
import Image from "next/image";
import { FcApproval } from "react-icons/fc";
import { toast } from "react-toastify";
import { useLanguage } from "../../context/LanguageContext";

type CardType = {
  id: number;
  name: string;
  image: string;
  image_claimed?: string;
  url?: string;
  Adsvalue: number;
  claimed_by?: string[];
};

type ClaimRecord = {
  [cardId: number]: string; // cardId: lastClaimDate (YYYY-MM-DD)
};

export default function AdsVeryCard() {
  const { wallet } = useWallet();
  const { t } = useLanguage();

  const [totalClaimed, setTotalClaimed] = useState(0);
  const [cards, setCards] = useState<CardType[]>([]);
  const [claimRecords, setClaimRecords] = useState<ClaimRecord>({});

  // 오늘 날짜를 YYYY-MM-DD 형식으로 반환
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // 카드 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from("redirects").select("*");
      if (!error && data) setCards(data);
    };
    fetchData();
  }, []);

  // localStorage에서 클릭 기록 불러오기
  useEffect(() => {
    if (typeof window !== "undefined" && wallet?.address) {
      const stored = localStorage.getItem(`claimRecords_${wallet.address}`);
      if (stored) {
        setClaimRecords(JSON.parse(stored));
      }
    }
  }, [wallet?.address]);

  // totalClaimed 불러오기
  useEffect(() => {
    if (typeof window !== "undefined" && wallet?.address) {
      const stored = localStorage.getItem(`totalClaimed_${wallet.address}`);
      if (stored) setTotalClaimed(parseInt(stored, 10));
    }
  }, [wallet?.address]);

  // totalClaimed 저장하기
  useEffect(() => {
    if (typeof window !== "undefined" && wallet?.address) {
      localStorage.setItem(`totalClaimed_${wallet.address}`, totalClaimed.toString());
    }
  }, [totalClaimed, wallet?.address]);

  // claimRecords 저장하기
  useEffect(() => {
    if (typeof window !== "undefined" && wallet?.address) {
      localStorage.setItem(`claimRecords_${wallet.address}`, JSON.stringify(claimRecords));
    }
  }, [claimRecords, wallet?.address]);

  // 카드가 오늘 이미 클릭되었는지 확인
  const isClaimedToday = (cardId: number) => {
    const today = getTodayDate();
    return claimRecords[cardId] === today;
  };

  // 어뷰징 방지: 클릭 간격 추적
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const CLICK_COOLDOWN = 1000; // 3초 쿨다운

  // 클릭 핸들러 - 이미지 클릭 시
  const handleCardClick = async (card: CardType) => {
    if (!wallet?.address) {
      toast.error(t("earn.walletNotConnected"));
      return;
    }

    // 이미 오늘 클릭했는지 확인
    if (isClaimedToday(card.id)) {
      // 이미 클레임한 경우 페이지만 열기
      if (card.url) {
        window.open(card.url, "_blank");
      }
      toast.info(t("earn.alreadyClaimed"));
      return;
    }

    // 쿨다운 확인 (연속 클릭 방지)
    const now = Date.now();
    if (now - lastClickTime < CLICK_COOLDOWN) {
      toast.warning(t("earn.pleaseWait"));
      return;
    }
    setLastClickTime(now);

    // 페이지 열기
    if (card.url) {
      window.open(card.url, "_blank");
    }

    // 클레임 처리
    await handleClaim(card.id);
  };

  // 클레임 처리
  const handleClaim = async (cardId: number) => {
    if (!wallet?.address) return;

    // 이미 오늘 클릭했는지 재확인
    if (isClaimedToday(cardId)) {
      return;
    }

    const { data, error } = await supabase.from("redirects").select("*").eq("id", cardId).single();

    if (error || !data) return;

    const today = getTodayDate();

    // 클릭 기록 업데이트
    setClaimRecords((prev) => ({
      ...prev,
      [cardId]: today,
    }));

    // totalClaimed 업데이트
    setTotalClaimed((prev) => prev + data.Adsvalue);

    toast.success(`+${data.Adsvalue} ${t("earn.claimed")}`);
  };

  // 전체 클레임
  const handleTotalClaim = async () => {
    if (!wallet?.address) return toast.error(t("earn.metamaskNotInstalled"));

    if (totalClaimed === 0) {
      toast.info(t("earn.noRewards"));
      return;
    }

    const { data: user } = await supabase.from("vtdn").select("*").eq("wallet", wallet.address).single();

    const newBalance = (user?.vtdn_balance || 0) + totalClaimed * 100;

    await supabase.from("vtdn").upsert({ wallet: wallet.address, vtdn_balance: newBalance });

    toast.success(`${totalClaimed * 100} ${t("earn.claimDone")}`);
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
          {t("earn.adsVery")}
        </h2>
        <button onClick={handleTotalClaim} className="px-4 py-2 text-black rounded flex items-center space-x-2">
          <Image src="/Earnpage/AdsAmount.png" alt="AdsVery" width={32} height={32} />
          <span>{totalClaimed}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
        {cards.map((card) => {
          const isValueClaimed = isClaimedToday(card.id);

          return (
            <div key={card.id} className="cursor-pointer font-bold ring-2 ring-gray-100" onClick={() => handleCardClick(card)}>
              <Image src={card.image || "/Mainpage/Very.png"} alt={card.name} width={214} height={241} className="w-full object-cover" />

              <div className="flex justify-between px-2 py-1">
                <span>{card.name}</span>

                {!isValueClaimed ? (
                  <span className="flex items-center">
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
