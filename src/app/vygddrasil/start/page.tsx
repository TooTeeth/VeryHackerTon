"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Image from "next/image";

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
  const [loading, setLoading] = useState(false);
  const [stageMeta, setStageMeta] = useState<{ title: string; description: string; image_url: string } | null>(null);
  const [currentFilter, setCurrentFilter] = useState("Vygddrasil");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

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

      setLoading(false);
    }

    fetchData();
  }, [currentFilter]);

  //Click to select the next option
  const handleChoiceClick = (value: string) => {
    setCurrentFilter(value);
  };

  if (loading) return <p>Loading...</p>;
  if (choices.length === 0) return <p>No choices available.</p>;

  return (
    //BackGround Img
    <section className="relative h-screen bg-cover bg-center z-0" style={{ backgroundImage: "url('/Vygddrasilpage/background.png')" }}>
      {/*Error message*/}
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        {loading && <p>Loading...</p>}

        {/*Title, Img, Description, Choice*/}
        {!loading && stageMeta && (
          <>
            <h2 className="mt-10 mb-6 text-4xl font-bold text-left max-w-prose mx-0">{stageMeta.title}</h2>
            <Image src={stageMeta.image_url} alt="stage image" width={320} height={320} className="max-w-xs mb-4 rounded-lg shadow-lg" />
            <p className="mt-4 mb-6 text-2xl text-left max-w-prose mx-0">{stageMeta.description}</p>
          </>
        )}

        <ul>
          {choices.map((item) => (
            <li key={item.id}>
              <button onClick={() => handleChoiceClick(item.value)} className="mt-1 mb-2 px-4 py-2 bg-stone-300 hover:bg-blue-300 rounded">
                {item.choice}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
