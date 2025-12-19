"use client";

import { useEffect, useState } from "react";
import GameCard from "./GameCard";
import { supabase } from "../../lib/supabaseClient";
import { Pagination } from "./Pagination";
import PlatformFilter from "./GameFilter";
import CreateStreamModal from "./CreateStreamModal";

type StreamData = {
  id: number;
  Title: string;
  Players: number;
  Era: string;
  Genre: string;
  Plan: number;
  Image?: string;
  Schedule?: string;
};

type Filters = {
  Era?: string;
  Genre?: string;
  Players?: string;
  Free?: string;
};

export default function PlayfirstSection() {
  const [games, setGames] = useState<StreamData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [filters, setFilters] = useState<Filters>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredGames = games.filter((game) => {
    const { Era, Genre, Players, Free } = filters;

    if (Era && game.Era !== Era) return false;
    if (Genre && game.Genre !== Genre) return false;

    if (Players) {
      if (Players === "Limited" && game.Players === 0) return false;
      if (Players === "Unlimited" && game.Players > 0) return false;
    }

    if (Free) {
      if (Free === "Free" && game.Plan !== 0) return false;
      if (Free === "Paid" && game.Plan === 0) return false;
    }

    return true;
  });

  const totalFilteredItems = filteredGames.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredGames.slice(startIndex, startIndex + itemsPerPage);

  const fetchGames = async () => {
    const { data, error } = await supabase.from("Stream").select("*");

    if (error) {
      console.error("Stream Loading Failed:", error);
    } else {
      setGames(data as StreamData[]);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handleCreateSuccess = () => {
    fetchGames(); // Reload games after creating
  };

  return (
    <section style={{ position: "relative", minHeight: "100vh" }}>
      <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none" style={{ backgroundImage: "url('/Playpage/noise.png')" }} />

      {/* Header with Create Button */}
      <div className="pt-24 pb-5 font-bold ml-28 flex justify-between items-center pr-28">
        <h2 className="text-4xl font-bold relative inline-block after:block after:h-0.5 after:mt-1 after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:w-full">ALL</h2>

        {/* Create Button */}
        <button onClick={() => setIsCreateModalOpen(true)} className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105">
          + Create
        </button>
      </div>

      <div className="flex ml-28">
        <PlatformFilter filters={filters} onFilterChange={handleFilterChange} onReset={handleResetFilters} />
      </div>

      <div className="w-full flex justify-center items-center flex-col">
        <div className=" relative grid grid-cols-[repeat(4,minmax(320px,4fr))] gap-8 p-10 Z-1 cursor-pointer">
          {currentItems.map((game) => (
            <div key={game.id} onClick={() => (window.location.href = `/game/${game.id}`)} className="cursor-pointer">
              <GameCard
                variant="featured"
                game={{
                  title: game.Title,
                  image: game.Image || "/Mainpage/Very.png",
                  players: game.Players === 0 ? "∞" : game.Players.toString(),
                  Era: game.Era,
                  genre: game.Genre,
                  Plan: game.Plan === 0 ? "Free" : `${game.Plan}`,
                  Schedule: game.Schedule,
                }}
              />
            </div>
          ))}
        </div>
        <Pagination totalItems={totalFilteredItems} itemsPerPage={itemsPerPage} currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </div>

      {/* Create Stream Modal */}
      <CreateStreamModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={handleCreateSuccess} />
    </section>
  );
}
