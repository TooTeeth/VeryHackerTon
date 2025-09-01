"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { useWallet } from "../../app/context/WalletContext";
import { useRouter } from "next/navigation"; // 여기 추가

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

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

export default function CharacterCreate() {
  const { wallet } = useWallet();
  const [selectedClass, setSelectedClass] = useState<keyof typeof classStats | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleCreate = async () => {
    if (!wallet) {
      alert("Wallet is not Connected");
      return;
    }
    if (!selectedClass) {
      alert("Choose One Class");
      return;
    }

    setLoading(true);

    const stats = classStats[selectedClass as keyof typeof classStats];

    const { error } = await supabase.from("vygddrasilclass").insert({
      ...stats,
      class: selectedClass,
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
      router.push("/vygddrasil/start");
    }
  };

  return (
    <section
      style={{
        position: "relative",
        height: "100vh",
        backgroundImage: "url('/Vygddrasilpage/back.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <div className="flex flex-col items-center gap-6   mt-20">
        <h1 className="text-4xl text-white font-bold mb-4 shadow">New</h1>

        <div className="flex flex-wrap justify-center gap-4 font-bold shadow">
          {(Object.keys(classStats) as (keyof typeof classStats)[]).map((job) => (
            <button key={job} onClick={() => setSelectedClass(job)} className={`px-4 py-2 rounded text-white ${selectedClass === job ? "bg-gray-500" : "bg-gray-600 hover:bg-gary-700"}`}>
              {classNames[job]}
            </button>
          ))}
        </div>

        {selectedClass && (
          <div className="relative flex items-center justify-center overflow-hidden">
            <Image src="/Vygddrasilpage/scroll.png" alt="scroll background" width={624} height={620} className="object-contain z-0" />

            <div className="absolute z-10  text-center text-black font-bold text-sm leading-6">
              <Image src={`/Vygddrasilpage/character/${selectedClass}.jpg`} alt={selectedClass} width={240} height={240} className=" border-gray-50 " />
              <p className="text-2xl ">{classNames[selectedClass]}</p>
              {Object.entries(classStats[selectedClass]).map(([key, value]) => (
                <p key={key} className="text-xl">
                  {key.toUpperCase()}: {value}
                </p>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleCreate} disabled={loading} className="relative  px-0.5 py-0.5 rounded-[1.5rem_0.5rem_1.5rem_0.5rem] text-white font-bold  ">
          <span className="absolute inset-0 rounded-[1.5rem_0.5rem_1.5rem_0.5rem] bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500" aria-hidden="true" />

          <span className="relative flex items-center justify-center bg-gray-700 rounded-[1.5rem_0.5rem_1.5rem_0.5rem] px-10 py-4 min-w-[150px]">{loading ? "Creating..." : "Create"}</span>
        </button>
      </div>
    </section>
  );
}
