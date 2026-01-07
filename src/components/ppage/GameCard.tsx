"use client";

import Image from "next/image";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../context/LanguageContext";

type Game = {
  id?: number;
  title: string;
  image: string;
  players: string | React.ReactNode;
  genre: string;
  Era: string;
  Plan: string;
  link?: string;
  Schedule?: string;
};

type Props = {
  game?: Game;
  createMode?: boolean;
  variant?: "default" | "featured";
  showPlayButton?: boolean;
};

export default function GameCard({ game, createMode = false, variant = "default", showPlayButton = true }: Props) {
  const router = useRouter();
  const { t } = useLanguage();

  const handleCardClick = () => {
    if (!showPlayButton && game?.id && !createMode) {
      router.push(`/game/${game.id}`);
    }
  };

  return (
    <div
      className={`bg-gray-800 text-white mt-10 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col ring-1 ring-gray-600
           ${variant === "featured" ? "bg-white  hover:shadow-2xl  ring-2 ring-white  w-full  m-3 rounded-none" : ""}
          
      `}
      onClick={handleCardClick}
    >
      <div className="w-full h-[340px] relative">
        <Image src={game!.image} alt={game!.title} fill className="object-cover rounded-t-lg" />
      </div>

      <div className="p-4 space-y-2">
        <h3 className="text-xl font-bold">{game!.title}</h3>
        <div className="text-sm text-gray-400 space-y-1">
          <p>{t("play.title")}: {game!.title}</p>
          <p>{t("play.players")}: {game!.players}</p>
          <p>{t("play.era")}: {game!.Era}</p>
          <p>{t("play.genre")}: {game!.genre}</p>
          <p>{t("play.plan")}: {game!.Plan}</p>
          <p>{t("play.schedule")}: {game!.Schedule}</p>
        </div>
        {showPlayButton !== false && game?.link && (
          <div className="">
            <Link href={game.link}>
              <button className="relative group inline-block mt-5">
                <span className="absolute inset-0 rounded-[1rem_0.5rem_1rem_0.5rem] bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500" aria-hidden="true" />
                <span className="relative flex items-center justify-center bg-gray-800 text-white font-bold rounded-[1rem_0.5rem_1.5rem_0.5rem] m-0.5 px-6 py-2 min-w-[10px]">{t("play.play")}</span>
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
