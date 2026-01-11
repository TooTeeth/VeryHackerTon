"use client";

import { useState } from "react";
import Image from "next/image";
import type { GroupedMarketNFT } from "../../hooks/useMarketplace";

interface HeroSectionProps {
  topNFTs: GroupedMarketNFT[];
  onNFTClick: (nft: GroupedMarketNFT) => void;
}

export default function HeroSection({ topNFTs, onNFTClick }: HeroSectionProps) {
  const [centerIndex, setCenterIndex] = useState(0);

  if (topNFTs.length === 0) return null;

  // 5개의 고정 위치 정의
  const positions = [
    { offset: -615, rotation: 50, scale: 1.05, translateY: "0px", width: "w-64", height: "h-96" },
    { offset: -335, rotation: 25, scale: 1.05, translateY: "0px", width: "w-64", height: "h-96" },
    { offset: 0, rotation: 0, scale: 1.05, translateY: "-40px", width: "w-96", height: "h-[30rem]" },
    { offset: 335, rotation: -25, scale: 1.05, translateY: "0px", width: "w-64", height: "h-96" },
    { offset: 615, rotation: -50, scale: 1.05, translateY: "0px", width: "w-64", height: "h-96" },
  ];

  // 각 NFT가 어느 위치에 있을지 계산
  const getNFTPosition = (nftIndex: number) => {
    // centerIndex를 기준으로 상대적 위치 계산
    let relativePos = nftIndex - centerIndex;

    // 5개 범위 내로 조정 (항상 왼쪽에서 오른쪽 순서 유지)
    while (relativePos < -2) relativePos += topNFTs.length;
    while (relativePos > 2) relativePos -= topNFTs.length;

    // 위치 인덱스 (0~4)
    const posIndex = relativePos + 2;

    if (posIndex < 0 || posIndex > 4) return null; // 보이지 않음

    return {
      position: positions[posIndex],
      isCenter: posIndex === 2,
    };
  };

  return (
    <div className="relative mt-10 mb-10" style={{ minHeight: "1000px", overflow: "hidden" }}>
      <div className="absolute inset-0 z-0">
        <Image src="/Marketpage/1.jpg" alt="background" fill className="object-cover" priority />
      </div>
      <div className="absolute inset-0 bg-black/20 z-[1]" />

      <div className="relative z-10">
        <div className="text-center mb-12 mt-10 pt-8">
          <h2 className="text-6xl font-black mb-4">
            <span className="text-white"> MYTHIC COLLECTION</span>
            <br />
            <span className="text-white">OF </span>
            <span className="bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] bg-clip-text text-transparent">NFT</span>
            <span className="bg-gradient-to-r from-[#ec4899] to-[#06b6d4] bg-clip-text text-transparent"> ITEMS</span>
          </h2>
        </div>

        <div className="relative w-full h-[550px] flex items-center justify-center perspective-1000">
          {topNFTs.map((nft, nftIndex) => {
            const positionData = getNFTPosition(nftIndex);

            if (!positionData) return null;

            const { position, isCenter } = positionData;

            return (
              <div
                key={`nft-${nft.contract_address}-${nft.token_id}`}
                className="absolute cursor-pointer group"
                style={{
                  transform: `translateX(${position.offset}px) translateY(${position.translateY}) rotateY(${position.rotation}deg) scale(${position.scale})`,
                  zIndex: isCenter ? 50 : 10,
                  transition: "all 2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
                onClick={() => onNFTClick(nft)}
              >
                <div className={`${position.width} ${position.height} rounded-3xl overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-white/20 shadow-2xl group-hover:shadow-purple-500/50 transition-all duration-300`}>
                  <div className="relative h-full">
                    <Image src={nft.metadata?.image || "/nft-placeholder.png"} alt={nft.metadata?.name || "NFT"} fill className="object-cover" unoptimized />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="text-white text-lg font-bold mb-2">{nft.metadata?.name || `NFT #${nft.token_id}`}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-400">Highest Price</p>
                          <p className="font-bold text-xl">
                            <span className="text-white">{Number(nft.highestPrice || "0").toFixed(2)}</span>
                            <span className="text-yellow-500 ml-1">Very</span>
                          </p>
                        </div>
                        {isCenter && <div className="text-green-500 px-3 py-1 rounded-full text-xs font-bold">MORE +</div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 점 네비게이션 */}
        <div className="flex justify-center gap-3 mt-8">
          {topNFTs.map((_, index) => (
            <button key={index} onClick={() => setCenterIndex(index)} className={`transition-all duration-300 rounded-full ${index === centerIndex ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] w-8 h-3" : "bg-white/30 hover:bg-white/50 w-3 h-3"}`} aria-label={`Go to slide ${index + 1}`} />
          ))}
        </div>
      </div>

      <style jsx global>{`
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
}
