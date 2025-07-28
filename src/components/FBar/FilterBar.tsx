"use client";

import { useState } from "react";
import { CiCirclePlus } from "react-icons/ci";

export default function FilterBar() {
  const [search, setSearch] = useState("");
  const [farmsOnly, setFarmsOnly] = useState(false);

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-50 border-b-2">
      {/* 🔍 Search */}
      <div className="relative">
        <input type="text" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 pr-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
        <span className="absolute left-2 top-2.5 text-gray-500 text-sm">🔍</span>
      </div>

      {/* 🕘 Type Button */}
      <button className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 flex font-bold gap-1">
        <CiCirclePlus size={20} /> Era
      </button>
      <button className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 flex font-bold gap-1">
        <CiCirclePlus size={20} /> GM
      </button>
      <button className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 flex font-bold gap-1">
        <CiCirclePlus size={20} /> Plan
      </button>
      <button className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 flex font-bold gap-1">
        <CiCirclePlus size={20} /> Group Size
      </button>
      <button className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 flex font-bold gap-1">
        <CiCirclePlus size={20} /> Storyline
      </button>
      {/* 🌱 Farms Only Toggle */}
      <button onClick={() => setFarmsOnly(!farmsOnly)} className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${farmsOnly ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
        <span>🌽</span>
        <span>Farms only</span>
      </button>
    </div>
  );
}
