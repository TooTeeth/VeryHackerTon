import Image from "next/image";

export default function Play() {
  return (
    <div className="group relative w-[360px] h-[360px] perspective mt-32">
      {/* 카드 */}
      <div className="relative w-full h-full rounded-xl overflow-hidden transition-transform duration-500 transform group-hover:rotate-x-3 group-hover:rotate-y-3 group-hover:scale-105">
        <Image
          src="/Playpage/300.png"
          alt="Aion2"
          fill
          style={{ objectFit: "cover" }}
          priority // 중요 이미지라면 사용
          sizes="360px"
        />

        {/* 오버레이 (예: 게임홈 바로가기) */}
        <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">게임홈 바로가기</div>
      </div>
    </div>
  );
}
