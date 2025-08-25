import { GiLeafSwirl } from "react-icons/gi";
import GameCard from "./GameCard";

const games = [
  {
    title: "Elden Ring",
    image: "/VTDNLogo.png",
    players: "1인",
    Era: "Mediesavl",
    genre: "액션 RPG",
    Plan: "2022-02-25",
  },
  {
    title: "Elden Ring",
    image: "/Mainpage/Very.png",
    players: "1인",
    Era: "Mediesavl",
    genre: "액션 RPG",
    Plan: "2022-02-25",
  },
  {
    title: "Elden Ring",
    image: "/Mainpage/Very.png",
    players: "1인",
    Era: "Mediesavl",
    genre: "액션 RPG",
    Plan: "2022-02-25",
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
