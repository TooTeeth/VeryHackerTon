"use client";

type Category = "전체" | "무기" | "신발" | "장갑" | "바지" | "상의" | "망토" | "투구" | "장신구" | "칭호" | "스킬";
type SortOption = "recent" | "low" | "high";
type ViewMode = "myNFTs" | "marketplace";

const CATEGORIES: Category[] = ["전체", "무기", "신발", "장갑", "바지", "상의", "망토", "투구", "장신구", "칭호", "스킬"];

interface FilterSectionProps {
  viewMode: ViewMode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: Category;
  onCategoryChange: (category: Category) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  itemCount: number;
}

export default function FilterSection({ viewMode, searchQuery, onSearchChange, selectedCategory, onCategoryChange, sortBy, onSortChange, itemCount }: FilterSectionProps) {
  return (
    <div className={`mb-10 space-y-6 ${viewMode === "myNFTs" ? "pt-20" : ""}`}>
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="mb-10 space-y-6">
          {/* Search */}
          <div className="relative group max-w-2xl mx-auto">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-[#13141a] border border-white/10 rounded-2xl overflow-hidden">
              <input type="text" placeholder="Search NFTs by name or token ID..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="w-full bg-transparent px-6 py-4 pl-14 text-white placeholder-gray-500 focus:outline-none" />
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Category Filter */}
          <div className="bg-[#13141a] border border-white/10 rounded-2xl p-6">
            <div className="flex gap-3 flex-wrap">
              {CATEGORIES.map((category) => (
                <button key={category} onClick={() => onCategoryChange(category)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${selectedCategory === category ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}>
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Sort & Count */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{itemCount} Items</p>
              <p className="text-sm text-gray-400">{viewMode === "marketplace" ? "Available for purchase" : "In your wallet"}</p>
            </div>
            <div className="relative">
              <select value={sortBy} onChange={(e) => onSortChange(e.target.value as SortOption)} className="appearance-none bg-white/5 border border-white/10 rounded-xl px-5 py-2.5 pr-8 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:border-purple-100/50 transition-all duration-300 cursor-pointer">
                <option value="recent" className="bg-[#13141a] text-white">
                  Recent
                </option>
                <option value="low" className="bg-[#13141a] text-white">
                  Low
                </option>
                <option value="high" className="bg-[#13141a] text-white">
                  High
                </option>
              </select>
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Collections Header */}
        <div className="mb-8">
          <h3 className="text-4xl font-black text-white mb-2">{viewMode === "marketplace" ? "COLLECTIONS" : "MY COLLECTION"}</h3>
        </div>
      </div>
    </div>
  );
}
