"use client";

import GameList from "./GameList";
import { useLanguage } from "../../context/LanguageContext";

export default function PlaysecionSection() {
  const { t } = useLanguage();

  return (
    <section id="Explain-section" className="relative min-h-screen snap-start bg-cover bg-center " style={{ backgroundImage: "url('/Playpage/PlaySecionSectionBackground.png')" }}>
      <div className="text-white pt-12  ml-20 font-bold ">
        <h2 className="text-white text-4xl font-bold relative inline-block mt-10">
          {t("play.mainStream")}
          <span className="block h-0.5 mt-1 bg-gradient-to-r from-pink-500  to-purple-500 w-full"></span>
        </h2>
        <p className="mt-2">{t("play.playDescription")}</p>
      </div>

      <GameList />
    </section>
  );
}
