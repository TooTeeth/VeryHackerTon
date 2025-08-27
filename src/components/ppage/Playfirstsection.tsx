"use client";

import { useEffect, useState } from "react";
import GameCard from "./GameCard";
import { supabase } from "../../lib/supabaseClient";
import { Pagination } from "./Pagination";
import PlatformFilter from "./GameFilter";

export default function PlayfirstSection() {
  const [games, setGames] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const filteredGames = selectedPlatform ? games.filter((game) => game.Platform === selectedPlatform) : games;

  const totalFilteredItems = filteredGames.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredGames.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    async function fetchGames() {
      const { data, error } = await supabase.from("Stream").select("*");

      if (error) {
        console.error("Stream Loading Failed:", error);
      } else {
        setGames(data);
      }
    }

    fetchGames();
  }, []);

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <div
        className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
        style={{
          backgroundImage: "url('/Playpage/noise.png')",
        }}
      />

      <div className=" pt-24 pb-5  font-bold ml-28">
        <h2 className=" text-4xl font-bold relative inline-block after:block after:h-0.5 after:mt-1 after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:w-full">ALL</h2>
      </div>

      {/* Platform Filter */}
      <PlatformFilter
        selectedPlatform={selectedPlatform}
        onSelectPlatform={(p) => {
          setSelectedPlatform(p);
          setCurrentPage(1);
        }}
      />

      <div className="w-full flex justify-center items-center flex-col">
        <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 p-10 Z-1 cursor-pointer">
          {currentItems.map((game) => (
            <GameCard
              key={game.id}
              variant="featured"
              game={{
                title: game.Title,
                players: `Max ${game.Players}`,
                Era: game.Era,
                genre: game.Genre,
                Plan: game.Plan?.toString() ?? "Unknown",
                image: game.Image || "/Mainpage/Very.png",
              }}
              showPlayButton={false}
            />
          ))}
        </div>

        <Pagination totalItems={totalFilteredItems} itemsPerPage={itemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>
    </section>
  );
}
