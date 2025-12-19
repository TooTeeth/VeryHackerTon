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
    <div className="w-full flex justify-center">
      <div
        className="
          grid
          grid-cols-[repeat(auto-fit,minmax(320px,1fr))]
          gap-16
          w-full
          max-w-[1400px]
        "
      >
        {games.map((game, index) => (
          <GameCard key={index} game={game} />
        ))}
      </div>
    </div>
  );
}
