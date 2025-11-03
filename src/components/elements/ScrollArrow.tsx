//No longer in use.

"use client";

import { RiArrowDownDoubleFill } from "react-icons/ri";

type Props = {
  targetId: string;
};

export default function ScrollArrow({ targetId }: Props) {
  const handleScroll = () => {
    const target = document.getElementById(targetId);
    target?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-float cursor-pointer text-white z-10" onClick={handleScroll}>
        <RiArrowDownDoubleFill size={30} />
      </div>
    </div>
  );
}
