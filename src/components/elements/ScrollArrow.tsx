"use client";

import { GiLeafSwirl } from "react-icons/gi";
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
      <div className="absolute bottom-0 left-1/2 z-10 transform -translate-x-1/2 -translate-y-1/2  text-white">
        <GiLeafSwirl size={50} />
      </div>
      <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 animate-float cursor-pointer text-white z-10" onClick={handleScroll}>
        <RiArrowDownDoubleFill size={40} />
      </div>
    </div>
  );
}
