"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";
import BattleModal from "../../../components/Battlemodal/Battlemodal";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

type ChoiceItem = {
  id: number;
  mainstream_slug: string;
  choice: string;
  value: string;
  state: string;
};

export default function StartPage() {
  const [choices, setChoices] = useState<ChoiceItem[]>([]);

  const router = useRouter();

  const [stageMeta, setStageMeta] = useState<{ title: string; description: string; image_url: string } | null>(null);
  const [currentFilter, setCurrentFilter] = useState("Vygddrasil");

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Fetch choice list
      const { data: choiceData, error: choiceError } = await supabase.from("Vygddrasilchoice").select("*").eq("mainstream_slug", currentFilter);

      // Fetch title, description, and image URL for the current filter from Vygddrasilstage table
      const { data: metaData, error: metaError } = await supabase.from("Vygddrasilstage").select("title, description, image_url").eq("slug", currentFilter).single();

      if (choiceError || metaError) {
        console.error("Error fetching data:", { choiceError, metaError });
        setChoices([]);
        setStageMeta(null);
      } else {
        setChoices(choiceData || []);
        setStageMeta(metaData || null);
      }
    }

    fetchData();
  }, [currentFilter]);

  //Click to select the next option
  const handleChoiceClick = (value: string) => {
    if (value === "ending") {
      router.push("/play");
      return;
    }

    if (value === "showModal") {
      setModalOpen(true);
      return;
    }

    setCurrentFilter(value);
  };

  return (
    //BackGround Img
    <section className="relative h-screen bg-cover bg-center z-0" style={{ backgroundImage: "url('/Vygddrasilpage/BACK.jpg')" }}>
      {/*Error message*/}
      <div className="flex flex-col items-center justify-center h-screen  px-4">
        {/*Title, Img, Description, Choice*/}
        {stageMeta && (
          <>
            <h2 className="mt-10 mb-6 text-4xl font-bold text-left max-w-prose mx-0 text-gray-300">{stageMeta.title}</h2>
            <Image src={stageMeta.image_url} alt="stage image" width={320} height={320} className=" mb-4 rounded-lg shadow-lg" />
            <p className="mt-4 mb-6 text-2xl text-left text-gray-300 shadow max-w-prose mx-0 ">{stageMeta.description}</p>
          </>
        )}

        <ul>
          {choices.map((item) => (
            <li key={item.id}>
              <button onClick={() => handleChoiceClick(item.value)} className=" text-bronze text-left text-lg mt-2 font-bold hover:text-gray-300">
                &gt; {item.choice}
              </button>
            </li>
          ))}
        </ul>
        <BattleModal isOpen={modalOpen} onClose={() => setModalOpen(false)}></BattleModal>
      </div>
    </section>
  );
}
