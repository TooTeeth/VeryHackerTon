"use client";

import { useState } from "react";
import Image from "next/image";
import { IoSwapVertical } from "react-icons/io5";

export default function SwapBox() {
  const [fromToken, setFromToken] = useState({ symbol: "VTDN", img: "/VTDNLogo.png" });
  const [toToken, setToToken] = useState({ symbol: "VERY", img: "/Mainpage/Very.png" });

  const [fromValue, setFromValue] = useState("0.00");
  const [toValue, setToValue] = useState("0.00");

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setFromValue(value);

      const num = parseFloat(value) || 0;
      setToValue((num / 100).toFixed(2));
    }
  };

  const handleSwap = () => {
    setFromToken(toToken);
    setToToken(fromToken);

    setFromValue(toValue);
    setToValue(fromValue);
  };

  return (
    <div className="max-w-md mx-auto p-7 space-y-8  backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-md flex-col  ring-gray-200 text-white">
      <div className="p-4  rounded-xl ring-1 ring-pink-400">
        <label className="text-sm font-semibold  ">From:</label>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <Image src={fromToken.img} alt={fromToken.symbol} width={24} height={24} />
            <span className="font-semibold text-lg ">{fromToken.symbol}</span>
          </div>
          <input type="number" step="0.01" value={fromValue} onChange={handleFromChange} className="bg-transparent text-right text-xl font-semibold w-24" />
        </div>
      </div>

      <div className="relative flex items-center justify-center my-4 cursor-pointer" onClick={handleSwap}>
        <div className="w-full h-px bg-gray-300" />
        <div className="absolute bg-white rounded-full border p-2 shadow z-10">
          <IoSwapVertical className="text-gray-600" />
        </div>
      </div>

      <div className="p-4 ring-1 ring-purple-400 rounded-xl">
        <label className="text-sm font-semibold ">To:</label>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <Image src={toToken.img} alt={toToken.symbol} width={24} height={24} />
            <span className="font-semibold text-lg">{toToken.symbol}</span>
          </div>
          <input type="number" value={toValue} readOnly className="bg-transparent text-right text-xl font-semibold w-24" />
        </div>
      </div>
    </div>
  );
}
