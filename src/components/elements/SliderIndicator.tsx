"use client";

import { IoEllipseSharp } from "react-icons/io5";

interface SlideIndicatorProps {
  count: number;
  currentIndex: number;
  onClick: (index: number) => void;
}

export default function SlideIndicator({ count, currentIndex, onClick }: SlideIndicatorProps) {
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
      {Array.from({ length: count }).map((_, index) => (
        <button key={index} onClick={() => onClick(index)} className={`text-2xl transition-all ${currentIndex === index ? "text-white scale-50" : "text-gray-400 scale-50 opacity-50"}`}>
          <IoEllipseSharp />
        </button>
      ))}
    </div>
  );
}
