import React from "react";
import { FaWindows, FaApple, FaAndroid, FaSteam } from "react-icons/fa";
import { SiNintendoswitch } from "react-icons/si";

type Platform = string | null;

type PlatformFilterProps = {
  selectedPlatform: Platform;
  onSelectPlatform: (platform: Platform) => void;
};

const platforms: { name: Platform; label: string; icon?: React.ReactNode }[] = [
  { name: null, label: "ALL" },
  { name: "Windows", label: "Windows", icon: <FaWindows /> },
  { name: "Mac", label: "Mac", icon: <FaApple /> },
  { name: "Android", label: "Android", icon: <FaAndroid /> },
  { name: "Switch", label: "Switch", icon: <SiNintendoswitch /> },
  { name: "Steam", label: "Steam", icon: <FaSteam /> },
];

export default function PlatformFilter({ selectedPlatform, onSelectPlatform }: PlatformFilterProps) {
  return (
    <div className="flex justify-center items-center space-x-4 mb-6 text-gray-400 text-2xl relative z-9">
      {platforms.map(({ name, label, icon }, idx) => (
        <div key={label} className="flex items-center space-x-2">
          <button onClick={() => onSelectPlatform(name)} className={`transition hover:text-white ${selectedPlatform === name ? "text-yellow-400" : ""}`} title={label}>
            {icon || <span className="text-sm font-semibold">{label}</span>}
          </button>
          {idx < platforms.length - 1 && <span className="text-gray-600">•</span>}
        </div>
      ))}
    </div>
  );
}
