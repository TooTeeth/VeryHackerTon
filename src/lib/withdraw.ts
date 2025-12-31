import { ethers } from "ethers";
import SwapvtdnABI from "../contracts/abi/Swapvtdn.json";
import { supabase } from "./supabaseClient";
import { toast } from "react-toastify";
const swapContractAddress = "0x8A0136c306f8Ec15A9011E40bF98f25bca106988";

interface ErrorData {
  code?: string;
  message?: string;
  info?: {
    error?: {
      code?: number;
      message?: string;
    };
  };
}

export async function processWithdrawRequests(walletAddress: string, amount: string) {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);

  const signer = await provider.getSigner();

  const swapContract = new ethers.Contract(swapContractAddress, SwapvtdnABI, signer);

  const veryPerPoint = 0.01;
  const parsedAmount = parseFloat(amount);

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Invalid amount input");
  }

  const veryAmount = ethers.parseUnits((parsedAmount * veryPerPoint).toString(), 18);
  toast.info("Checking permissions...");

  //user check
  const { data: userData, error: userError } = await supabase.from("Users").select("id, wallet_address").eq("wallet_address", walletAddress).single();

  if (userError || !userData) {
    throw new Error("User not found");
  }

  //vtdn balance check
  const { data: vtdnData, error: vtdnError } = await supabase.from("vtdn").select("vtdn_balance").eq("user_id", userData.id).single();

  if (vtdnError || !vtdnData) {
    throw new Error("VTDN balance not found");
  }

  const currentVtdnBalance = parseFloat(vtdnData.vtdn_balance); // `vtdn` 테이블에서 조회한 잔액

  // `VTDN` 잔액이 요청 금액보다 적으면 트랜잭션을 실행하지 않음
  if (currentVtdnBalance < parsedAmount) {
    throw new Error("Insufficient VTDN balance");
  }

  //call authorizeWithdrawal
  await toast.promise(
    swapContract.authorizeWithdrawal(walletAddress, veryAmount).then((tx) => tx.wait()),
    {
      pending: "Checking Authorizing...",
      success: "Authorized!",
      error: {
        render({ data }: { data: ErrorData }) {
          if (data.code === "ACTION_REJECTED" && data.info?.error?.code === 4001) {
            return "rejected register authorized";
          }
          return `Error: ${data.message || "Unknown error"}`;
        },
      },
    }
  );

  //backend status pending update
  const { error: insertError } = await supabase.from("withdraw_requests").insert([
    {
      user_address: walletAddress,
      withdraw_requests_vtdn: parsedAmount,
      status: "pending",
    },
  ]);

  if (insertError) {
    throw new Error("Error inserting withdraw request: " + insertError.message);
  }

  //call VERY withdraw
  await toast.promise(
    swapContract.withdraw(veryAmount).then((tx) => tx.wait()),
    {
      pending: "Withdrawal in progress",
      error: {
        render({ data }: { data: ErrorData }) {
          if (data.code === "ACTION_REJECTED" && data.info?.error?.code === 4001) {
            return "rejected register authorized";
          }
          return `Error: ${data.message || "Unknown error"}`;
        },
      },
    }
  );

  const newBalance = currentVtdnBalance - parsedAmount;

  const { error: updateVtdnError } = await supabase.from("vtdn").update({ vtdn_balance: newBalance }).eq("user_id", userData.id);

  if (updateVtdnError) {
    throw new Error("Error updating VTDN balance: " + updateVtdnError.message);
  }

  // 5. withdraw_requests 상태 업데이트 + 차감 후 잔액 업데이트
  const { error: updateRequestError } = await supabase.from("withdraw_requests").update({ status: "completed", vtdnbalance: newBalance, updated_at: new Date() }).eq("user_address", walletAddress).eq("status", "pending");

  if (updateRequestError) {
    throw new Error("Error updating withdraw request status: " + updateRequestError.message);
  }
}
