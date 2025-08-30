// SwapForm.tsx
import React from "react";
import Image from "next/image";
import { IoSwapVertical } from "react-icons/io5";

type Token = { symbol: string; img: string };
type SwapAction = { type: "SET_FROM_VALUE"; payload: string } | { type: "SWAP_TOKENS" };

interface SwapFormProps {
  state: {
    fromToken: Token;
    toToken: Token;
    fromValue: string;
    toValue: string;
  };
  dispatch: React.Dispatch<SwapAction>;
}

export default function SwapForm({ state, dispatch }: SwapFormProps) {
  const { fromToken, toToken, fromValue, toValue } = state;

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      dispatch({ type: "SET_FROM_VALUE", payload: value });
    }
  };

  const handleSwap = () => {
    dispatch({ type: "SWAP_TOKENS" });
  };

  return (
    <div className="max-w-md mx-auto p-7 space-y-8 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-md flex-col ring-gray-200 text-white">
      {/* From Section */}
      <div className="p-4 rounded-xl ring-1 ring-pink-400">
        <label className="text-sm font-semibold">From:</label>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <Image src={fromToken.img} alt={fromToken.symbol} width={24} height={24} />
            <span className="font-semibold text-lg">{fromToken.symbol}</span>
          </div>
          <input type="number" step="0.01" value={fromValue} onChange={handleFromChange} className="bg-transparent text-right text-xl font-semibold w-24" />
        </div>
      </div>

      {/* Swap Icon */}
      <div className="relative flex items-center justify-center my-4 cursor-pointer" onClick={handleSwap}>
        <div className="w-full h-px bg-gray-300" />
        <div className="absolute bg-white rounded-full border p-2 shadow z-10">
          <IoSwapVertical className="text-gray-600" />
        </div>
      </div>

      {/* To Section */}
      <div className="p-4 ring-1 ring-purple-400 rounded-xl">
        <label className="text-sm font-semibold">To:</label>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <Image src={toToken.img} alt={toToken.symbol} width={24} height={24} />
            <span className="font-semibold text-lg">{toToken.symbol}</span>
          </div>
          <div className="bg-transparent text-right text-xl font-semibold w-24">{toValue}</div>
        </div>
      </div>
    </div>
  );
}
