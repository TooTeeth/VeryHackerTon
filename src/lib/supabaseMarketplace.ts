// lib/services/supabaseMarketplace.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Supabase URL or KEY is not defined in environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// 타입 정의
export interface Listing {
  id?: string;
  contract_address: string;
  token_id: string;
  seller_address: string;
  sale_type: "fixed" | "auction";
  price?: string; // Wei 단위 (string으로 저장)
  starting_price?: string;
  current_bid?: string;
  highest_bidder?: string;
  end_time?: string;
  status: "active" | "sold" | "cancelled" | "ended";
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id?: string;
  listing_id?: string;
  contract_address: string;
  token_id: string;
  from_address: string;
  to_address: string;
  price: string;
  transaction_hash: string;
  transaction_type: "sale" | "bid" | "cancel";
  created_at?: string;
}

// 리스팅 생성
export async function createListing(listing: Omit<Listing, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("nft_listings").insert([listing]).select().single();

  if (error) throw error;
  return data;
}

// 활성 리스팅 전체 조회
export async function getActiveListings() {
  const { data, error } = await supabase.from("nft_listings").select("*").eq("status", "active").order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// 특정 사용자의 리스팅 조회
export async function getUserListings(walletAddress: string) {
  const { data, error } = await supabase.from("nft_listings").select("*").eq("seller_address", walletAddress.toLowerCase()).order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// 특정 NFT의 리스팅 조회
export async function getListingByNFT(contractAddress: string, tokenId: string) {
  try {
    const { data, error } = await supabase.from("nft_listings").select("*").eq("contract_address", contractAddress.toLowerCase()).eq("token_id", tokenId).eq("status", "active").maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null; // null로 명확하게 반환
  } catch (err) {
    console.error("Supabase NFT 조회 에러:", contractAddress, tokenId, err);
    return null;
  }
}

// 리스팅 상태 업데이트
export async function updateListingStatus(listingId: string, status: Listing["status"]) {
  const { data, error } = await supabase
    .from("nft_listings")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 입찰 업데이트
export async function updateBid(listingId: string, bidAmount: string, bidderAddress: string) {
  const { data, error } = await supabase
    .from("nft_listings")
    .update({
      current_bid: bidAmount,
      highest_bidder: bidderAddress.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", listingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 거래 내역 생성
export async function createTransaction(transaction: Omit<Transaction, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("nft_transactions")
    .insert([
      {
        ...transaction,
        from_address: transaction.from_address.toLowerCase(),
        to_address: transaction.to_address.toLowerCase(),
        contract_address: transaction.contract_address.toLowerCase(),
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 사용자 거래 내역 조회
export async function getUserTransactions(userAddress: string) {
  const normalizedAddress = userAddress.toLowerCase();

  const { data, error } = await supabase.from("nft_transactions").select("*").or(`from_address.eq.${normalizedAddress},to_address.eq.${normalizedAddress}`).order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// NFT별 거래 내역
export async function getNFTTransactions(contractAddress: string, tokenId: string) {
  const { data, error } = await supabase.from("nft_transactions").select("*").eq("contract_address", contractAddress.toLowerCase()).eq("token_id", tokenId).order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
