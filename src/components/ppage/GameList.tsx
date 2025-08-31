import { GiLeafSwirl } from "react-icons/gi";
import GameCard from "./GameCard";

const games = [
  {
    title: "Vygddrasil",
    image: "/Playpage/Vygddrasill2.png",
    players: "∞",
    Era: "MiddleAge",
    genre: "Medievalfantasy",
    Plan: "Free",
    link: "/vygddrasil",
  },
  {
    title: "Vpunk",
    image: "/Playpage/vpunk.png",
    players: "∞",
    Era: "Future",
    genre: "Cyberpunk",
    Plan: "Free",
    link: "/vpunk",
  },
  {
    title: "Obfuscate",
    image: "/Playpage/obfuscate2.png",
    players: "∞",
    Era: "MiddleAge",
    genre: "Medievalorental",
    Plan: "Free",
    link: "/obfuscate",
  },
];

export default function GameList() {
  return (
    <div className="grid grid-cols-4 gap-10   sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 max-w-screen-2xl ">
      {games.map((game, index) => (
        <GameCard key={index} game={game} />
      ))}
      <GameCard createMode />
      <div className="absolute bottom-0 left-1/2 z-10 transform -translate-x-1/2 -translate-y-1/2  text-white">
        <GiLeafSwirl size={50} />
      </div>
    </div>
  );
}
