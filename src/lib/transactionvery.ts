import { parseUnits, ethers } from "ethers";
import SwapvtdnABI from "../contracts/abi/Swapvtdn.json";
import { supabase } from "./supabaseClient";

const swapContractAddress = "0x8A0136c306f8Ec15A9011E40bF98f25bca106988";

export async function depositVery(amount: string, walletAddress: string) {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const swapContract = new ethers.Contract(swapContractAddress, SwapvtdnABI, signer);
  const trimmedAmount = amount?.trim();

  if (!trimmedAmount || isNaN(Number(trimmedAmount))) {
    throw new Error("Invalid amount input");
  }
  const amountParsed = parseUnits(trimmedAmount, 18);

  //user check
  const { data: userData, error: userError } = await supabase.from("Users").select("id").eq("wallet_address", walletAddress.toLowerCase()).single();

  if (userError || !userData) {
    throw new Error("User not found");
  }

  //vtdn balace check
  const { data: vtdnData, error: vtdnError } = await supabase.from("vtdn").select("vtdn_balance").eq("user_id", userData.id).single();

  if (vtdnError || !vtdnData) {
    throw new Error("VTDN balance not found");
  }

  //call receiveVery
  const tx = await swapContract.receiveVery({ value: amountParsed });
  await tx.wait();

  //vtdn deposit
  const currentBalance = parseFloat(vtdnData.vtdn_balance);
  const depositAmount = parseFloat(trimmedAmount) * 100;
  const newBalance = currentBalance + depositAmount;

  const { error: updateError } = await supabase.from("vtdn").update({ vtdn_balance: newBalance }).eq("user_id", userData.id);

  if (updateError) {
    throw new Error("Error updating VTDN balance: " + updateError.message);
  }

  return tx.hash;
}
