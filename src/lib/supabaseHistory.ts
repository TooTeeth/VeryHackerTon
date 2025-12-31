// lib/services/supabaseHistory.ts
import { supabase } from "./supabaseClient";

export type NFTEventType = "listing" | "cancel" | "buy" | "sell";

export interface NFTEvent {
  id: string;
  event_type: NFTEventType;
  contract_address: string;
  token_id: string;
  user_address: string;
  from_address: string;
  to_address: string;
  price: string;
  transaction_hash: string;
  created_at: string;
  listing_id: string | null;
}

/**
 * 사용자의 모든 거래 내역을 조회합니다.
 * nft_events 뷰를 사용하여 user_address가 일치하는 내역을 가져옵니다.
 */
export async function getUserEvents(walletAddress: string): Promise<NFTEvent[]> {
  const normalizedAddress = walletAddress.toLowerCase();

  // nft_events 뷰에서 조회 (user_address 기준)
  const { data, error } = await supabase.from("nft_events").select("*").eq("user_address", normalizedAddress).order("created_at", { ascending: false });

  if (error) {
    console.error("사용자 거래 내역 조회 에러:", error);
    throw error;
  }

  return (data || []) as NFTEvent[];
}

/**
 * 특정 listing_id의 취소 여부를 확인합니다.
 */
export async function isListingCancelled(listingId: string): Promise<boolean> {
  const { data, error } = await supabase.from("nft_transactions").select("id").eq("listing_id", listingId).eq("transaction_type", "cancel").limit(1);

  if (error) {
    console.error("취소 여부 확인 에러:", error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}
