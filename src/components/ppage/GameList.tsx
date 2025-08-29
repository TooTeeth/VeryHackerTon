import { GiLeafSwirl } from "react-icons/gi";
import GameCard from "./GameCard";

const games = [
  {
    title: "Vygddrasil",
    image: "/VTDNLogo.png",
    players: "∞",
    Era: "MiddleAge",
    genre: "Medievalfantasy",
    Plan: "Free",
    navigateTo: "/MainStream/Vygddrasil",
  },
  {
    title: "Vpunk",
    image: "/Mainpage/Very.png",
    players: "∞",
    Era: "Future",
    genre: "Cyberpunk",
    Plan: "Free",
    navigateTo: "/MainStream/Cyberpunk",
  },
  {
    title: "Obfuscate",
    image: "/Mainpage/Very.png",
    players: "∞",
    Era: "MiddleAge",
    genre: "Medievalorental",
    Plan: "Free",
    navigateTo: "/MainStream/Obfuscate",
  },
];

export default function GameList() {
  return (
    <div className="grid grid-cols-4 gap-10   sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 max-w-screen-2xl ">
      {games.map((game, index) => (
        <GameCard key={index} game={game} navigateTo={game.navigateTo} />
      ))}
      <GameCard createMode />
      <div className="absolute bottom-0 left-1/2 z-10 transform -translate-x-1/2 -translate-y-1/2  text-white">
        <GiLeafSwirl size={50} />
      </div>
    </div>
  );
}
