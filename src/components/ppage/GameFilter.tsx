import React, { useState } from "react";
import { IoPersonSharp } from "react-icons/io5";
import { FaUnlockKeyhole } from "react-icons/fa6";
import { BiBookBookmark } from "react-icons/bi";
import { MdOutlineLocalLibrary } from "react-icons/md";

type Filters = {
  Era?: string;
  Genre?: string;
  Players?: string;
  Free?: string;
};

type PlatformFilterProps = {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string) => void;
  onReset: () => void;
};

type PlatformOption = {
  key: keyof Filters | null;
  label: string;
  icon?: React.ReactNode;
  subOptions: string[];
};

const platforms: PlatformOption[] = [
  {
    key: "Era",
    label: "Era",
    icon: <MdOutlineLocalLibrary />,
    subOptions: ["MiddleAge", "Cyberpunk", "Modern", "Others"],
  },
  {
    key: "Genre",
    label: "Genre",
    icon: <BiBookBookmark />,
    subOptions: ["Fantasy", "Action", "Romance", "Others"],
  },
  {
    key: "Players",
    label: "Players",
    icon: <IoPersonSharp />,
    subOptions: ["Limited", "Unlimited"],
  },
  {
    key: "Free",
    label: "Free",
    icon: <FaUnlockKeyhole />,
    subOptions: ["Free", "Paid"],
  },
];

export default function PlatformFilter({ filters, onFilterChange, onReset }: PlatformFilterProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const allPlatform: PlatformOption = {
    key: null,
    label: "ALL",
    icon: undefined,
    subOptions: [],
  };
  const allPlatformsWithAll = [allPlatform, ...platforms];

  return (
    <div className="flex justify-center items-center space-x-4 mb-6 text-gray-500 text-2xl relative z-9">
      {allPlatformsWithAll.map(({ key, label, icon, subOptions }, idx) => (
        <div key={label} className="relative flex items-center space-x-2">
          <button
            onClick={() => {
              if (key === null) {
                onReset();
                setOpenDropdown(null);
              } else {
                setOpenDropdown(openDropdown === key ? null : key);
              }
            }}
            className={`transition hover:text-black ${(key === null && Object.keys(filters).length === 0) || (key !== null && filters[key]) ? "text-black" : ""}`}
            title={label}
          >
            <div className="flex items-center gap-1">{icon || <span className="text-lg font-bold">{label}</span>}</div>
          </button>

          {subOptions && openDropdown === key && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border rounded shadow-md z-50 min-w-[150px]">
              {subOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    if (key) {
                      onFilterChange(key, option);
                    }
                    setOpenDropdown(null);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 text-sm font-bold"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {idx < allPlatformsWithAll.length - 1 && <span className="text-gray-600">•</span>}
        </div>
      ))}
    </div>
  );
}
