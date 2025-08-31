"use client";

import Image from "next/image";
import { useState } from "react";
import CreateButton from "./CreateButton";
import { toast } from "react-toastify";
import { uploadGameImage } from "../../lib/uploadGameImage";
import { supabase } from "../../lib/supabaseClient";
import { FaFileUpload } from "react-icons/fa";
import Link from "next/link";

type Game = {
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
  createMode?: boolean; //Create Card
  variant?: "default" | "featured"; //Card Style
  showPlayButton?: boolean;
};

export default function GameCard({ game, createMode = false, variant = "default", showPlayButton = true }: Props) {
  const [Title, setTitle] = useState("");
  const [Players, setPlayers] = useState<number>(0);
  const [Era, setEra] = useState("");
  const [Genre, setGenre] = useState("");
  const [Plan, setPlan] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

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

    const { error } = await supabase.from("Stream").insert([
      {
        Title: data.Title,
        Players,
        Era,
        Genre,
        Plan,
        Image: uploadedImageUrl,
      },
    ]);
    if (error) {
      toast.error("Data Save Failed " + error.message);
      setLoading(false);
      return;
    }
    try {
      await new Promise((res) => setTimeout(res, 1000));
      alert(`Created Game:\nTitle: ${Title}\nPlayers: ${Players}\nEra: ${Era}\nGenre: ${Genre}\nPlan: ${Plan}`);

      /*Initialize after creation*/
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

  return (
    <div
      className={`bg-gray-800 text-white mt-10 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col ring-1 ring-gray-600
         ${variant === "featured" ? "bg-white scale-105 hover:shadow-2xl ml-10  ring-2 ring-white w-[210px] m-3 rounded-none" : ""}
    `}
      onClick={() => {
        if (!showPlayButton) {
        }
      }}
      style={{ cursor: !showPlayButton ? "pointer" : "default" }}
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
              <input type="text" value={Title} onChange={(e) => setTitle(e.target.value)} className="bg-gray-700 text-white p-2  mr-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
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
              <input type="text" value={Genre} onChange={(e) => setGenre(e.target.value)} className="bg-gray-700 text-white  mr-4 p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div className="flex flex-col ">
              <label className="mb-1 mt-4 text-sm">Plan Fee</label>
              <input type="number" value={Plan} onChange={(e) => setPlan(Number(e.target.value))} className="bg-gray-700 text-white p-2 mr-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="flex flex-col px-32 items-center ">
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

            <button type="submit" disabled={loading} className="relative group inline-block mt-5 ">
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
        // Main Stream Card
        <>
          <div className="w-full h-[240px] relative">
            <Image src={game!.image} alt={game!.title} fill className="object-cover rounded-t-lg" />
          </div>

          <div className="p-4 space-y-2 ">
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
  );
}
