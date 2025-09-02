"use client";

import Image from "next/image";

type NFTItem = {
  id: number;
  name: string;
  image: string;
};

const mockNFTs: NFTItem[] = Array.from({ length: 10 }).map((_, i) => ({
  id: i,
  name: `NFT #${i}`,
  image: `/nft-metadata/${i % 3}.png`, // 예시 이미지
}));

export default function NFTMarketplace() {
  // 최대 8개만 표시
  const displayedNFTs = mockNFTs.slice(0, 8);

  return (
    <div className="text-white min-h-screen p-6 bg-zinc-900">
      <p className="text-3xl font-bold mb-6 mt-20 text-center">🎨 NFT Marketplace</p>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-yellow-400">🔥 보유 중인 NFT</h2>
        <div className="flex gap-3">
          <button className="bg-zinc-700 px-4 py-2 rounded text-sm hover:bg-zinc-600">가격순 &#39;⬆️&#39; &#39;⬇️&#39;</button>
          <button className="bg-zinc-700 px-4 py-2 rounded text-sm hover:bg-zinc-600">등급순 &#39;⬆️&#39; &#39;⬇️&#39;</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {displayedNFTs.map((nft) => (
          <div key={nft.id} className="bg-zinc-800 rounded-lg p-4 shadow-md hover:shadow-xl transition duration-200">
            <Image src={nft.image} alt={nft.name} width={300} height={300} className="rounded-md mx-auto mb-3" />
            <h3 className="text-center font-semibold text-lg">{nft.name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
