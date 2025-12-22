"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { VygddrasilService } from "../../services/vygddrasil.service";
import { CharacterWithProgress, CharacterClass } from "../../types/vygddrasil.types";

const classNames: Record<CharacterClass, string> = {
  assassin: "Assassin",
  archer: "Archer",
  bard: "Bard",
  magician: "Magician",
  warrior: "Warrior",
};

export default function CharacterSelect({ walletAddress }: { walletAddress: string }) {
  const [characters, setCharacters] = useState<CharacterWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const router = useRouter();

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const charactersData = await VygddrasilService.getCharacters(walletAddress);
      setCharacters(charactersData);
    } catch (error) {
      console.error("Error loading characters:", error);
      toast.error("캐릭터 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCharacters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const handleContinue = () => {
    if (!selectedCharacterId) {
      toast.error("캐릭터를 선택해주세요.");
      return;
    }

    // Store selected character ID in sessionStorage
    sessionStorage.setItem("selectedCharacterId", selectedCharacterId.toString());
    router.push("/vygddrasil/start");
  };

  const handleDeleteCharacter = async (characterId: number) => {
    if (!confirm("정말로 이 캐릭터를 삭제하시겠습니까?")) return;

    try {
      const result = await VygddrasilService.deleteCharacter(characterId);

      if (result.success) {
        toast.success("캐릭터가 삭제되었습니다.");
        loadCharacters();
      } else {
        toast.error("캐릭터 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Error deleting character:", error);
      toast.error("캐릭터 삭제에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <section
        style={{
          position: "relative",
          height: "100vh",
          backgroundImage: "url('/Vygddrasilpage/back.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="text-white text-2xl">Loading...</div>
      </section>
    );
  }

  if (characters.length === 0) {
    return (
      <section
        style={{
          position: "relative",
          height: "100vh",
          backgroundImage: "url('/Vygddrasilpage/back.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="text-center">
          <div className="text-white text-2xl mb-4">생성된 캐릭터가 없습니다.</div>
          <button onClick={() => router.push("/vygddrasil/new")} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold">
            새 캐릭터 생성
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        backgroundImage: "url('/Vygddrasilpage/back.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        paddingTop: "2rem",
        paddingBottom: "2rem",
      }}
    >
      <div className="container mx-auto px-4">
        <h1 className="text-4xl text-white font-bold text-center mb-8">캐릭터 선택</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {characters.map((char) => (
            <div key={char.id} onClick={() => setSelectedCharacterId(char.id)} className={`relative cursor-pointer transition-all duration-200 ${selectedCharacterId === char.id ? "ring-4 ring-yellow-400 scale-105" : "hover:scale-102"}`}>
              <div className="bg-gray-800 bg-opacity-90 rounded-lg p-6 shadow-lg">
                {/* Character Image */}
                <div className="flex justify-center mb-4">
                  <Image src={`/Vygddrasilpage/character/${char.class}.jpg`} alt={char.class} width={200} height={200} className="rounded-lg border-2 border-gray-600" />
                </div>

                {/* Class Name */}
                <h2 className="text-2xl font-bold text-center text-white mb-4">{classNames[char.class as CharacterClass]}</h2>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-white mb-4">
                  <div className="text-sm">
                    <span className="font-bold">STR:</span> {char.str}
                  </div>
                  <div className="text-sm">
                    <span className="font-bold">AGI:</span> {char.agi}
                  </div>
                  <div className="text-sm">
                    <span className="font-bold">INT:</span> {char.int}
                  </div>
                  <div className="text-sm">
                    <span className="font-bold">LUCK:</span> {char.luck}
                  </div>
                  <div className="text-sm">
                    <span className="font-bold">HP:</span> {char.hp}
                  </div>
                  <div className="text-sm">
                    <span className="font-bold">MP:</span> {char.mp}
                  </div>
                </div>

                {/* Progress Info */}
                {char.progress ? (
                  <div className="bg-gray-700 rounded p-3 mb-3">
                    <div className="text-xs text-gray-300 mb-1">
                      📍 현재 위치: <span className="font-bold">{char.progress.current_stage}</span>
                    </div>
                    <div className="text-xs text-gray-300 mb-1">🗺️ 방문한 장소: {char.progress.visited_stages?.length || 0}개</div>
                    <div className="text-xs text-gray-300">⏱️ 마지막 플레이: {new Date(char.progress.updated_at || "").toLocaleDateString()}</div>
                  </div>
                ) : (
                  <div className="bg-gray-700 rounded p-3 mb-3">
                    <div className="text-xs text-gray-300 text-center">아직 플레이하지 않은 캐릭터</div>
                  </div>
                )}

                {/* Created Date */}
                <div className="text-xs text-gray-400 text-center mb-3">생성일: {new Date(char.created_at).toLocaleDateString()}</div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCharacter(char.id);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded transition"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <button onClick={handleContinue} disabled={!selectedCharacterId} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg font-bold text-xl transition">
            선택한 캐릭터로 계속하기
          </button>

          <button onClick={() => router.push("/vygddrasil")} className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-4 rounded-lg font-bold text-xl transition">
            뒤로가기
          </button>
        </div>
      </div>
    </section>
  );
}
