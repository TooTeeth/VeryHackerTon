"use client";

import { useReducer, useState } from "react";

import { depositVery } from "../../lib/transactionvery";
import SwapForm from "./SwapForm";
import { useWallet } from "../../app/context/WalletContext";
import { processWithdrawRequests } from "../../lib/withdraw";
import { toast } from "react-toastify";

const initialState = {
  fromToken: { symbol: "VTDN", img: "/VTDNLogo.png" },
  toToken: { symbol: "VERY", img: "/Mainpage/Very.png" },
  fromValue: "0.00",
  toValue: "0.00",
};

export default function SwapBox() {
  const { wallet } = useWallet();
  const [state, dispatch] = useReducer(reducer, initialState as typeof initialState);
  const [isLoading, setIsLoading] = useState(false);

  //call receiveVery
  async function handleDeposit(amount: string) {
    const parsed = amount?.trim();
    if (!parsed || isNaN(Number(parsed))) {
      toast.error("Invalid amount input");
      return;
    }

    if (!wallet?.address) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsLoading(true);
      await depositVery(parsed, wallet.address);
      toast.success("Deposit success");
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "message" in err) {
        const error = err as { message?: string; code?: string; info?: { error?: { code?: number; message?: string } } };

        if (error.code === "ACTION_REJECTED" && error.info?.error?.code === 4001) {
          return;
        }

        toast.error(error.message || "Unknown error");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setIsLoading(false);
    }
  }

  //call withdraw
  async function handleClaim(amount: string) {
    if (!wallet?.address) {
      toast.error("Please connect your wallet first");
      return;
    }
    const parsed = parseFloat(amount?.trim() || "0");
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Invalid amount input");
      return;
    }
    try {
      setIsLoading(true);
      await processWithdrawRequests(wallet.address, amount);
      toast.success("withdraw success");
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "message" in err) {
        const error = err as { message?: string; code?: string; info?: { error?: { code?: number; message?: string } } };
        if (error.code === "ACTION_REJECTED" && error.info?.error?.code === 4001) {
          return;
        }

        toast.error(error.message || "Unknown error");
      } else {
        toast.error("Unexpected error");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <SwapForm state={state} dispatch={dispatch} />
      <div className="flex justify-center items-center">
        <button
          onClick={() => (state.fromToken.symbol === "VTDN" ? handleClaim(state.fromValue) : handleDeposit(state.fromValue))}
          disabled={isLoading}
          className={`relative inline-flex items-center justify-center mt-4 w-24 py-3 font-bold text-white rounded-lg
    ${isLoading ? "cursor-not-allowed" : "group"}`}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-pink-500 to-blue-500 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition duration-300" />

          <span className={`absolute inset-0 rounded-lg ${isLoading ? "bg-black" : "bg-black border border-transparent group-hover:border-white transition duration-300"}`} />

          <span className="relative z-10">{isLoading ? "Pending..." : state.fromToken.symbol === "VTDN" ? "Claim" : "Deposit"}</span>
        </button>
      </div>
    </div>
  );
}

type SwapAction = { type: "SET_FROM_VALUE"; payload: string } | { type: "SWAP_TOKENS" };

function reducer(state: typeof initialState, action: SwapAction) {
  switch (action.type) {
    case "SET_FROM_VALUE": {
      const from = action.payload;
      const parsed = parseFloat(from) || 0;
      if (state.fromToken.symbol === "VTDN") {
        return {
          ...state,
          fromValue: from,
          toValue: (parsed / 100).toString(),
        };
      } else {
        return {
          ...state,
          fromValue: from,
          toValue: (parsed * 100).toString(),
        };
      }
    }
    case "SWAP_TOKENS":
      return {
        fromToken: state.toToken,
        toToken: state.fromToken,
        fromValue: state.toValue,
        toValue: state.fromValue,
      };
    default:
      return state;
  }
}
