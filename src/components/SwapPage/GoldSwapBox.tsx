"use client";

import { useReducer, useState, useEffect, useCallback } from "react";
import { IoSwapVertical } from "react-icons/io5";
import { FiChevronDown } from "react-icons/fi";

import { toast } from "react-toastify";
import { useWallet } from "../../app/context/WalletContext";
import { executeSwap, getSwapQuote, getAllGoldBalances, getVTDNBalance } from "../../lib/ammSwap";
import PoolPriceChart from "./PoolPriceChart";

// 토큰 타입 정의
type Token = {
  symbol: string;
  iconColor: string;
  name: string;
};

// Gold 토큰 목록
const GOLD_TOKENS: Token[] = [
  {
    symbol: "Gold_Vygddrasil",
    iconColor: "text-green-400",
    name: "Vygddrasil Gold",
  },
  {
    symbol: "Gold_Vpunk",
    iconColor: "text-purple-400",
    name: "Vpunk Gold",
  },
  {
    symbol: "Gold_Obfuscate",
    iconColor: "text-blue-400",
    name: "Obfuscate Gold",
  },
];

const VTDN_TOKEN: Token = {
  symbol: "VTDN",
  iconColor: "text-yellow-400",
  name: "VTDN",
};

// State 타입
type SwapState = {
  fromToken: Token;
  toToken: Token;
  fromValue: string;
  toValue: string;
  priceImpact: number;
  fee: number;
};

// Action 타입
type SwapAction = { type: "SET_FROM_VALUE"; payload: string } | { type: "SET_TO_VALUE"; payload: string } | { type: "SWAP_TOKENS" } | { type: "SELECT_FROM_TOKEN"; payload: Token } | { type: "SELECT_TO_TOKEN"; payload: Token } | { type: "UPDATE_QUOTE"; payload: { toValue: string; priceImpact: number; fee: number } };

const initialState: SwapState = {
  fromToken: GOLD_TOKENS[0],
  toToken: VTDN_TOKEN,
  fromValue: "0",
  toValue: "0",
  priceImpact: 0,
  fee: 0,
};

function reducer(state: SwapState, action: SwapAction): SwapState {
  switch (action.type) {
    case "SET_FROM_VALUE":
      return {
        ...state,
        fromValue: action.payload,
      };
    case "SET_TO_VALUE":
      return {
        ...state,
        toValue: action.payload,
      };
    case "UPDATE_QUOTE":
      return {
        ...state,
        toValue: action.payload.toValue,
        priceImpact: action.payload.priceImpact,
        fee: action.payload.fee,
      };
    case "SWAP_TOKENS":
      return {
        fromToken: state.toToken,
        toToken: state.fromToken,
        fromValue: state.toValue,
        toValue: state.fromValue,
        priceImpact: state.priceImpact,
        fee: state.fee,
      };
    case "SELECT_FROM_TOKEN":
      return {
        ...state,
        fromToken: action.payload,
        fromValue: "0",
        toValue: "0",
      };
    case "SELECT_TO_TOKEN":
      return {
        ...state,
        toToken: action.payload,
        fromValue: "0",
        toValue: "0",
      };
    default:
      return state;
  }
}

export default function GoldSwapBox() {
  const { wallet } = useWallet();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [balances, setBalances] = useState<{ [key: string]: number }>({});
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [chartTimeRange, setChartTimeRange] = useState<"1D" | "1W" | "1M" | "1Y">("1D");
  const [showChart, setShowChart] = useState(false);

  // 잔액 로드
  const loadBalances = useCallback(async () => {
    if (!wallet?.address) return;

    try {
      const goldBalances = await getAllGoldBalances(wallet.address);
      const vtdnBalance = await getVTDNBalance(wallet.address);

      setBalances({
        ...goldBalances,
        VTDN: vtdnBalance,
      });
    } catch (error) {
      console.error("Failed to load balances:", error);
    }
  }, [wallet?.address]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // 입력값 변경 시 실시간 견적
  const updateQuote = useCallback(async () => {
    const amountIn = parseFloat(state.fromValue);
    if (isNaN(amountIn) || amountIn <= 0) {
      dispatch({
        type: "UPDATE_QUOTE",
        payload: { toValue: "0", priceImpact: 0, fee: 0 },
      });
      return;
    }

    try {
      const quote = await getSwapQuote(state.fromToken.symbol, state.toToken.symbol, amountIn);

      if (quote) {
        dispatch({
          type: "UPDATE_QUOTE",
          payload: {
            toValue: quote.amountOut.toFixed(6),
            priceImpact: quote.priceImpact,
            fee: quote.fee,
          },
        });
      }
    } catch (error) {
      console.error("Failed to get quote:", error);
    }
  }, [state.fromValue, state.fromToken.symbol, state.toToken.symbol]);

  useEffect(() => {
    if (state.fromValue && parseFloat(state.fromValue) > 0) {
      updateQuote();
    }
  }, [state.fromValue, updateQuote]);

  async function handleSwap() {
    if (!wallet?.address) {
      toast.error("Please connect your wallet first");
      return;
    }

    const amountIn = parseFloat(state.fromValue);
    if (isNaN(amountIn) || amountIn <= 0) {
      toast.error("Invalid amount");
      return;
    }

    try {
      setIsLoading(true);

      const result = await executeSwap(wallet.address, state.fromToken.symbol, state.toToken.symbol, amountIn);

      if (result.success) {
        toast.success(`Swapped ${amountIn} ${state.fromToken.symbol} for ${result.amountOut?.toFixed(4)} ${state.toToken.symbol}`);
        dispatch({ type: "SET_FROM_VALUE", payload: "0" });
        await loadBalances();
      } else {
        toast.error(result.error || "Swap failed");
      }
    } catch (error) {
      console.error("Swap error:", error);
      const errorMessage = error instanceof Error ? error.message : "Swap failed";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      dispatch({ type: "SET_FROM_VALUE", payload: value });
    }
  }

  function handleSwapDirection() {
    dispatch({ type: "SWAP_TOKENS" });
  }

  function selectFromToken(token: Token) {
    if (token.symbol === state.toToken.symbol) {
      // 같은 토큰 선택 시 자동으로 스왑
      dispatch({ type: "SWAP_TOKENS" });
    } else {
      dispatch({ type: "SELECT_FROM_TOKEN", payload: token });
    }
    setShowFromDropdown(false);
  }

  function selectToToken(token: Token) {
    if (token.symbol === state.fromToken.symbol) {
      // 같은 토큰 선택 시 자동으로 스왑
      dispatch({ type: "SWAP_TOKENS" });
    } else {
      dispatch({ type: "SELECT_TO_TOKEN", payload: token });
    }
    setShowToDropdown(false);
  }

  const fromBalance = balances[state.fromToken.symbol] || 0;
  const toBalance = balances[state.toToken.symbol] || 0;

  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Swap Form */}
      <div className="max-w-md mx-auto p-7 space-y-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-md text-white">
        {/* From Section */}
        <div className="p-4 rounded-xl ring-1 ring-pink-400 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold">From:</label>
            <span className="text-xs text-gray-400">Balance: {fromBalance.toFixed(4)}</span>
          </div>

          <div className="flex items-center justify-between">
            {/* Token Selector */}
            <div className="relative">
              <button onClick={() => setShowFromDropdown(!showFromDropdown)} className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition" disabled={state.fromToken.symbol === "VTDN"}>
                <span className="font-semibold text-lg">{state.fromToken.symbol.replace("Gold_", "")}</span>
                {state.fromToken.symbol !== "VTDN" && <FiChevronDown className="text-gray-400" />}
              </button>

              {/* Dropdown */}
              {showFromDropdown && state.fromToken.symbol !== "VTDN" && (
                <div className="absolute top-full mt-2 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 min-w-[200px]">
                  {GOLD_TOKENS.map((token) => (
                    <button key={token.symbol} onClick={() => selectFromToken(token)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition first:rounded-t-lg last:rounded-b-lg">
                      <div className="text-left">
                        <div className="font-medium">{token.symbol.replace("Gold_", "")}</div>
                        <div className="text-xs text-gray-400">{(balances[token.symbol] || 0).toFixed(2)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <input type="text" inputMode="decimal" value={state.fromValue} onChange={handleFromChange} placeholder="0.0" className="bg-transparent text-right text-xl font-semibold w-32 outline-none" />
          </div>

          {/* Max Button */}
          <button
            onClick={() =>
              dispatch({
                type: "SET_FROM_VALUE",
                payload: fromBalance.toString(),
              })
            }
            className="text-xs text-pink-400 hover:text-pink-300 transition"
          >
            MAX
          </button>
        </div>

        {/* Swap Icon */}
        <div className="relative flex items-center justify-center cursor-pointer" onClick={handleSwapDirection}>
          <div className="w-full h-px bg-gray-600" />
          <div className="absolute bg-gradient-to-r from-pink-500 to-purple-500 rounded-full border-2 border-gray-800 p-2 shadow-lg hover:scale-110 transition z-10">
            <IoSwapVertical className="text-white text-xl" />
          </div>
        </div>

        {/* To Section */}
        <div className="p-4 rounded-xl ring-1 ring-purple-400 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold">To:</label>
            <span className="text-xs text-gray-400">Balance: {toBalance.toFixed(4)}</span>
          </div>

          <div className="flex items-center justify-between">
            {/* Token Selector */}
            <div className="relative">
              <button onClick={() => setShowToDropdown(!showToDropdown)} className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition" disabled={state.toToken.symbol === "VTDN"}>
                <span className="font-semibold text-lg">{state.toToken.symbol.replace("Gold_", "")}</span>
                {state.toToken.symbol !== "VTDN" && <FiChevronDown className="text-gray-400" />}
              </button>

              {/* Dropdown */}
              {showToDropdown && state.toToken.symbol !== "VTDN" && (
                <div className="absolute top-full mt-2 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 min-w-[200px]">
                  {GOLD_TOKENS.map((token) => (
                    <button key={token.symbol} onClick={() => selectToToken(token)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition first:rounded-t-lg last:rounded-b-lg">
                      <div className="text-left">
                        <div className="font-medium">{token.symbol.replace("Gold_", "")}</div>
                        <div className="text-xs text-gray-400">{(balances[token.symbol] || 0).toFixed(2)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Output */}
            <div className="text-right text-xl font-semibold w-32">{state.toValue}</div>
          </div>
        </div>

        {/* Swap Info */}
        {parseFloat(state.fromValue) > 0 && (
          <div className="text-xs text-gray-400 space-y-1 px-2">
            <div className="flex justify-between">
              <span>Price Impact:</span>
              <span className={state.priceImpact > 5 ? "text-red-400" : state.priceImpact > 2 ? "text-yellow-400" : "text-green-400"}>{state.priceImpact.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Fee (0.3%):</span>
              <span>
                {state.fee.toFixed(6)} {state.fromToken.symbol}
              </span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <button
          onClick={handleSwap}
          disabled={isLoading || !wallet?.address || parseFloat(state.fromValue) <= 0}
          className={`relative w-full py-4 font-bold text-white rounded-lg overflow-hidden
          ${isLoading || !wallet?.address || parseFloat(state.fromValue) <= 0 ? "cursor-not-allowed opacity-50" : "group"}`}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 blur-sm opacity-75 group-hover:opacity-100 transition duration-300" />
          <span className="absolute inset-0 bg-black rounded-lg" />
          <span className="relative z-10">{isLoading ? "Swapping..." : !wallet?.address ? "Connect Wallet" : "Swap"}</span>
        </button>
      </div>

      {/* Chart Toggle Button */}
      <button onClick={() => setShowChart(!showChart)} className="fixed right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-purple-500 to-pink-500 text-white px-3 py-6 rounded-l-xl shadow-lg hover:px-4 transition-all z-40 font-semibold">
        {showChart ? "›" : "‹"}
      </button>

      {/* Side Panel Chart */}
      <div className={`fixed right-0 top-0 h-screen bg-gray-900/95 backdrop-blur-lg border-l border-white/10 shadow-2xl transition-transform duration-300 ease-in-out z-30 ${showChart ? "translate-x-0" : "translate-x-full"}`} style={{ width: "500px" }}>
        <div className="h-full overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Price Chart</h2>
            <button onClick={() => setShowChart(false)} className="text-gray-400 hover:text-white transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <PoolPriceChart tokenA={state.fromToken.symbol} tokenB={state.toToken.symbol} timeRange={chartTimeRange} onTimeRangeChange={setChartTimeRange} />
        </div>
      </div>
    </div>
  );
}
