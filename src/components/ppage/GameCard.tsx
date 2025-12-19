"use client";

import Image from "next/image";
import { useState } from "react";
import CreateButton from "./CreateButton";
import { toast } from "react-toastify";
import { uploadGameImage } from "../../lib/uploadGameImage";
import { supabase } from "../../lib/supabaseClient";
import { FaFileUpload } from "react-icons/fa";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Game = {
  id?: number;
  title: string;
  image: string;
  players: string | React.ReactNode;
  genre: string;
  Era: string;
  Plan: string;
  link?: string;
};

type Props = {
  game?: Game;
  createMode?: boolean;
  variant?: "default" | "featured";
  showPlayButton?: boolean;
};

type CreatedGameData = {
  id: number;
  Title: string;
  Players: number;
  Era: string;
  Genre: string;
  Plan: number;
};

export default function GameCard({ game, createMode = false, variant = "default", showPlayButton = true }: Props) {
  const router = useRouter();
  const [Title, setTitle] = useState("");
  const [Players, setPlayers] = useState<number>(0);
  const [Era, setEra] = useState("");
  const [Genre, setGenre] = useState("");
  const [Plan, setPlan] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [createdGame, setCreatedGame] = useState<CreatedGameData | null>(null);

  const handleCreate = async (data: { Title: string; Players: number; Era: string; Genre: string; Plan: number }) => {
    setLoading(true);

    let uploadedImageUrl = "";

    if (imageFile) {
      const result = await uploadGameImage(imageFile);
      if (result) {
        uploadedImageUrl = result;
      } else {
        toast.error("Image Upload Failed");
        setLoading(false);
        return;
      }
    }

    const { data: insertedData, error } = await supabase
      .from("Stream")
      .insert([
        {
          Title: data.Title,
          Players,
          Era,
          Genre,
          Plan,
          Image: uploadedImageUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      toast.error("Data Save Failed " + error.message);
      setLoading(false);
      return;
    }

    try {
      await new Promise((res) => setTimeout(res, 500));

      // 모달 표시
      setCreatedGame(insertedData as CreatedGameData);
      setShowModal(true);

      // 초기화
      setTitle("");
      setPlayers(0);
      setEra("");
      setGenre("");
      setPlan(0);
      setImageFile(null);
    } catch (error) {
      toast.error("Failed to create");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = () => {
    if (!showPlayButton && game?.id && !createMode) {
      router.push(`/game/${game.id}`);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setCreatedGame(null);
  };

  const goToGamePage = () => {
    if (createdGame?.id) {
      router.push(`/game/${createdGame.id}`);
    }
  };

  return (
    <>
      <div
        className={`bg-gray-800 text-white mt-10 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col ring-1 ring-gray-600
           ${variant === "featured" ? "bg-white scale-105 hover:shadow-2xl ml-10 ring-2 ring-white w-[210px] m-3 rounded-none" : ""}
           ${!showPlayButton && !createMode ? "cursor-pointer hover:scale-105 transition-transform" : ""}
      `}
        onClick={handleCardClick}
      >
        {createMode ? (
          <div className="px-4">
            <h3 className="text-2xl font-bold p-6 text-center">New</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <div className="flex flex-col">
                <label className="mb-1 text-sm">Title</label>
                <input type="text" value={Title} onChange={(e) => setTitle(e.target.value)} className="bg-gray-700 text-white p-2 mr-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 mt-4 text-sm">Players(Max)</label>
                <input type="number" value={Players} onChange={(e) => setPlayers(Number(e.target.value))} className="bg-gray-700 text-white p-2 mr-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 mt-4 text-sm">Era</label>
                <input type="text" value={Era} onChange={(e) => setEra(e.target.value)} className="bg-gray-700 text-white mr-4 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 mt-4 text-sm">Genre</label>
                <input type="text" value={Genre} onChange={(e) => setGenre(e.target.value)} className="bg-gray-700 text-white mr-4 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 mt-4 text-sm">Plan Fee</label>
                <input type="number" value={Plan} onChange={(e) => setPlan(Number(e.target.value))} className="bg-gray-700 text-white p-2 mr-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>

              <div className="flex flex-col px-32 items-center">
                <label htmlFor="file-upload" className="inline-block px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition mt-2">
                  <FaFileUpload />
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>

              <button type="submit" disabled={loading} className="relative group inline-block mt-5">
                <span className="absolute inset-0 rounded-[1rem_0.5rem_1rem_0.5rem] bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500" aria-hidden="true" />
                <span className="relative flex items-center justify-center bg-gray-800 text-white font-bold rounded-[1rem_0.5rem_1.5rem_0.5rem] m-0.5 px-6 py-2 min-w-[10px]">
                  <CreateButton
                    data={{
                      Title,
                      Players,
                      Era,
                      Genre,
                      Plan,
                    }}
                    onCreate={handleCreate}
                  />
                </span>
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="w-full h-[240px] relative">
              <Image src={game!.image} alt={game!.title} fill className="object-cover rounded-t-lg" />
            </div>

            <div className="p-4 space-y-2">
              <h3 className="text-xl font-bold">{game!.title}</h3>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Title: {game!.title}</p>
                <p>Players: {game!.players}</p>
                <p>Era: {game!.Era}</p>
                <p>Genre: {game!.genre}</p>
                <p>Plan: {game!.Plan}</p>
              </div>
              {showPlayButton !== false && game?.link && (
                <div className="pt-2">
                  <Link href={game.link}>
                    <button className="relative group inline-block mt-24">
                      <span className="absolute inset-0 rounded-[1rem_0.5rem_1rem_0.5rem] bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500" aria-hidden="true" />
                      <span className="relative flex items-center justify-center bg-gray-800 text-white font-bold rounded-[1rem_0.5rem_1.5rem_0.5rem] m-0.5 px-6 py-2 min-w-[10px]">Play</span>
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Success Modal */}
      {showModal && createdGame && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 text-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl border border-purple-500">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500 rounded-full p-3">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500 bg-clip-text text-transparent">Game Created!</h2>

            <div className="space-y-3 mb-6 bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Title:</span>
                <span className="font-semibold">{createdGame.Title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Players:</span>
                <span className="font-semibold">{createdGame.Players === 0 ? "∞" : `Max ${createdGame.Players}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Era:</span>
                <span className="font-semibold">{createdGame.Era}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Genre:</span>
                <span className="font-semibold">{createdGame.Genre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Plan Fee:</span>
                <span className="font-semibold">{createdGame.Plan === 0 ? "Free" : `${createdGame.Plan} VERY`}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={closeModal} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition">
                Close
              </button>
              <button onClick={goToGamePage} className="flex-1 relative group">
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500" aria-hidden="true" />
                <span className="relative flex items-center justify-center bg-gray-800 text-white font-bold rounded-lg m-0.5 py-3">Go to Game</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
