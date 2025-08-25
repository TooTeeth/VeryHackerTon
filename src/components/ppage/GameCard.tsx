import Image from "next/image";
import CreateButton from "./CreateButton";

type Game = {
  title: string;
  image: string;
  players: string;
  genre: string;
  Era: string;
  Plan: string;
};

type Props = {
  game?: Game;
  createMode?: boolean;
};

export default function GameCard({ game, createMode = false }: Props) {
  return (
    <div className="bg-gray-800 text-white rounded-lg shadow-md  hover:shadow-xl transition-shadow duration-300 flex flex-col ">
      {createMode ? (
        // 🎮 생성 카드
        <div className="px-4">
          <h3 className="text-2xl font-bold p-6  text-center">New</h3>

          <form className="">
            {/* Title 입력 */}
            <div className="flex flex-col ">
              <label className="mb-1 text-sm">Title</label>
              <input type="text" className="bg-gray-700 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Players 입력 */}
            <div className="flex flex-col">
              <label className="mb-1 mt-4 text-sm">Players</label>
              <input type="text" className="bg-gray-700 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Era 입력 */}
            <div className="flex flex-col">
              <label className="mb-1 mt-4 text-sm">Era</label>
              <input type="text" className="bg-gray-700 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Genre 입력 */}
            <div className="flex flex-col">
              <label className="mb-1 mt-4 text-sm">Genre</label>
              <input type="text" className="bg-gray-700 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Plan 입력 */}
            <div className="flex flex-col">
              <label className="mb-1 mt-4  text-sm">Plan</label>
              <input type="text" className="bg-gray-700 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Create 버튼 */}
            <div className="relative group inline-block mt-5">
              <span className="absolute inset-0 rounded-[1rem_0.5rem_1rem_0.5rem] bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500" aria-hidden="true" />

              <span className="relative flex items-center justify-center bg-gray-800 text-white font-bold rounded-[1rem_0.5rem_1.5rem_0.5rem] m-0.5 px-6 py-2  min-w-[10px]">
                <CreateButton />
              </span>
            </div>
          </form>
        </div>
      ) : (
        //Main Stream Card
        <Image src={game!.image} alt={game!.title} width={424} height={420} className="object-cover h-70 " />
      )}

      {!createMode && (
        <div className="p-4 space-y-2 ">
          <h3 className="text-xl font-bold">{game!.title}</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p>👥 Players: {game!.players}</p>
            <p>👥 Era: {game!.Era}</p>
            <p>🎮 Genre: {game!.genre}</p>
            <p>🗓 Plan: {game!.Plan}</p>
          </div>
          <div className="pt-2">
            <button className="relative group inline-block">
              <span className="absolute inset-0 rounded-[1rem_0.5rem_1rem_0.5rem] bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500" aria-hidden="true" />

              <span className="relative flex items-center justify-center bg-gray-800 text-white font-bold rounded-[1rem_0.5rem_1.5rem_0.5rem] m-0.5 px-6 py-2  min-w-[10px]">Play</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
