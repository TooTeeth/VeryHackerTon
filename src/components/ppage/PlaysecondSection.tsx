import GameList from "./GameList";

export default function PlaysecionSection() {
  return (
    <section id="Explain-section" className="relative h-screen snap-start bg-cover bg-center " style={{ backgroundImage: "url('/Playpage/PlaySecionSectionBackground.png')" }}>
      <div className="text-white pt-24 pb-5  font-bold ml-28">
        <h2 className="text-white text-4xl font-bold relative inline-block">
          Main Stream
          <span className="block h-0.5 mt-1 bg-gradient-to-r from-pink-500  to-purple-500 w-full"></span>
        </h2>
        <p className="mt-2">Play a variety of stream or create a new one.</p>
      </div>
      <div className="flex justify-center items-center">
        <GameList />
      </div>
    </section>
  );
}
