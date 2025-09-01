import Image from "next/image";

export default function NFTMarketplace() {
  return (
    <div className="text-white h-screen p-6  bg-zinc-800 ">
      <p className="text-2xl font-bold mb-4 mt-20">NFT Marketplace</p>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-fantasy-gold dark:text-[var(--fantasy-gold)] text-xl font-semibold">🔥 List</h2>
        <div className="flex gap-2">
          <button className="bg-zinc-700  px-4 py-1 rounded text-sm hover:bg-zinc-600 cursor-pointer">가격순 &#39;⬆️&#39; &#39;⬇️&#39;</button>

          <button className="bg-zinc-700 px-3 py-1 rounded text-sm hover:bg-zinc-600 cursor-pointer">등급순 &#39;⬆️&#39; &#39;⬇️&#39;</button>
        </div>
      </div>
      <Image src={"/nft-metadata/nftlist.png"} alt="list" width={1560} height={640} className="ml-40 mt-10" />
    </div>
  );
}
