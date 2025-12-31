"use client";

import { useState } from "react";
import Image from "next/image";
import { useWallet } from "../../app/context/WalletContext";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const classStats = {
  assassin: { str: 5, agi: 12, int: 3, hp: 90, mp: 60, luck: 10 },
  archer: { str: 7, agi: 10, int: 4, hp: 100, mp: 70, luck: 7 },
  bard: { str: 4, agi: 6, int: 8, hp: 95, mp: 100, luck: 9 },
  magician: { str: 2, agi: 5, int: 14, hp: 80, mp: 150, luck: 6 },
  warrior: { str: 13, agi: 6, int: 2, hp: 160, mp: 40, luck: 4 },
};

const classNames: Record<string, string> = {
  assassin: "Assassin",
  archer: "Archer",
  bard: "Bard",
  magician: "Magician",
  warrior: "Warrior",
};

// 닉네임 유효성 검사: 영문, 숫자, 한글만 허용 (2-12자)
const isValidNickname = (nickname: string): boolean => {
  const regex = /^[a-zA-Z0-9가-힣]{2,12}$/;
  return regex.test(nickname);
};

export default function CharacterCreate() {
  const { wallet } = useWallet();
  const [selectedClass, setSelectedClass] = useState<keyof typeof classStats | null>(null);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [isCheckingNickname, setIsCheckingNickname] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // 닉네임 중복 체크
  const checkNicknameDuplicate = async (name: string): Promise<boolean> => {
    const { data, error } = await supabase.from("vygddrasilclass").select("id").eq("nickname", name).limit(1);

    if (error) {
      console.error("Nickname check error:", error);
      return false;
    }
    return data && data.length > 0;
  };

  // 닉네임 입력 핸들러
  const handleNicknameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNickname(value);
    setNicknameError("");

    if (!value) {
      return;
    }

    if (!isValidNickname(value)) {
      setNicknameError("2-12자의 영문, 숫자, 한글만 사용 가능합니다");
      return;
    }

    setIsCheckingNickname(true);
    const isDuplicate = await checkNicknameDuplicate(value);
    setIsCheckingNickname(false);

    if (isDuplicate) {
      setNicknameError("이미 사용 중인 닉네임입니다");
    }
  };

  const handleCreate = async () => {
    if (!wallet) {
      alert("Wallet is not Connected");
      return;
    }
    if (!selectedClass) {
      alert("Choose One Class");
      return;
    }
    if (!nickname) {
      alert("닉네임을 입력해주세요");
      return;
    }
    if (!isValidNickname(nickname)) {
      alert("올바른 닉네임을 입력해주세요");
      return;
    }

    // 최종 중복 체크
    const isDuplicate = await checkNicknameDuplicate(nickname);
    if (isDuplicate) {
      alert("이미 사용 중인 닉네임입니다");
      return;
    }

    setLoading(true);

    const stats = classStats[selectedClass as keyof typeof classStats];

    const { error } = await supabase.from("vygddrasilclass").insert({
      ...stats,
      class: selectedClass,
      nickname: nickname,
      wallet_address: wallet.address,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Create Failed");
    } else {
      alert(`${classNames[selectedClass]} Create!`);
      router.push("/vygddrasil/select");
    }
  };

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundImage: "url('/Vygddrasilpage/back.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflowY: "auto",
      }}
    >
      <div className="flex flex-col items-center gap-4 py-8">
        <h1 className="text-4xl text-white font-bold mb-2 shadow">New</h1>

        {/* 닉네임 입력 */}
        <div className="flex flex-col items-center gap-2">
          <input
            type="text"
            value={nickname}
            onChange={handleNicknameChange}
            placeholder="닉네임 입력 (2-12자)"
            maxLength={12}
            className="px-4 py-2 rounded bg-gray-700 text-white border border-gray-500 focus:border-purple-500 focus:outline-none w-64 text-center"
          />
          {isCheckingNickname && <span className="text-yellow-400 text-sm">확인 중...</span>}
          {nicknameError && <span className="text-red-400 text-sm">{nicknameError}</span>}
          {nickname && !nicknameError && !isCheckingNickname && isValidNickname(nickname) && <span className="text-green-400 text-sm">사용 가능한 닉네임입니다</span>}
        </div>

        <div className="flex flex-wrap justify-center gap-4 font-bold shadow">
          {(Object.keys(classStats) as (keyof typeof classStats)[]).map((job) => (
            <button key={job} onClick={() => setSelectedClass(job)} className={`px-4 py-2 rounded text-white ${selectedClass === job ? "bg-gray-500" : "bg-gray-600 hover:bg-gary-700"}`}>
              {classNames[job]}
            </button>
          ))}
        </div>

        {/* Create 버튼을 스크롤 이미지 위에 배치 */}
        <button onClick={handleCreate} disabled={loading} className="relative px-0.5 py-0.5 rounded-[1.5rem_0.5rem_1.5rem_0.5rem] text-white font-bold">
          <span className="absolute inset-0 rounded-[1.5rem_0.5rem_1.5rem_0.5rem] bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500" aria-hidden="true" />
          <span className="relative flex items-center justify-center bg-gray-700 rounded-[1.5rem_0.5rem_1.5rem_0.5rem] px-10 py-4 min-w-[150px]">{loading ? "Creating..." : "Create"}</span>
        </button>

        {selectedClass && (
          <div className="relative flex items-center justify-center overflow-hidden">
            <Image src="/Vygddrasilpage/scroll.png" alt="scroll background" width={624} height={620} className="object-contain z-0" />

            <div className="absolute z-10 text-center text-black font-bold text-sm leading-6">
              <Image src={`/Vygddrasilpage/character/${selectedClass}.jpg`} alt={selectedClass} width={240} height={240} className="border-gray-50" />
              <p className="text-2xl">{classNames[selectedClass]}</p>
              {Object.entries(classStats[selectedClass]).map(([key, value]) => (
                <p key={key} className="text-xl">
                  {key.toUpperCase()}: {value}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
