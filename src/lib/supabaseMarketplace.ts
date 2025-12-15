// lib/services/supabaseMarketplace.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("Supabase URL or KEY is not defined in environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export type TransactionType = "listing" | "buy" | "sell" | "bid" | "cancel";

// 타입 정의
export interface Listing {
  id?: string;
  contract_address: string;
  token_id: string;
  seller_address: string;
  sale_type: "fixed" | "auction";
  price: string;
  amount?: number;
  status: "active" | "sold" | "cancelled" | "ended";
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id?: string;
  listing_id?: string | null;
  contract_address: string;
  token_id: string;
  from_address: string;
  to_address: string;
  price: string;
  transaction_hash: string;
  transaction_type: TransactionType;
  created_at?: string;
}

export interface User {
  id: number;
  wallet_address: string;
  username?: string;
  email?: string;
  created_at: string;
}

// 사용자 관리 함수
export async function ensureUserExists(walletAddress: string): Promise<User> {
  const normalizedAddress = walletAddress.toLowerCase();

  const { data: existingUser, error: fetchError } = await supabase.from("Users").select("*").eq("wallet_address", normalizedAddress).maybeSingle();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("사용자 조회 에러:", fetchError);
    throw fetchError;
  }

  if (existingUser) {
    return existingUser;
  }

  const { data: newUser, error: insertError } = await supabase
    .from("Users")
    .insert([{ wallet_address: normalizedAddress }])
    .select()
    .single();

  if (insertError) {
    console.error("사용자 생성 에러:", insertError);
    throw insertError;
  }

  return newUser;
}

export async function getUser(walletAddress: string): Promise<User | null> {
  const normalizedAddress = walletAddress.toLowerCase();

  const { data, error } = await supabase.from("Users").select("*").eq("wallet_address", normalizedAddress).maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("사용자 조회 에러:", error);
    return null;
  }

  return data;
}

// ==========================================
// 리스팅 관리 함수
// ==========================================

export async function createListing(listing: Omit<Listing, "id" | "created_at" | "updated_at">) {
  try {
    await ensureUserExists(listing.seller_address);

    const insertData = {
      contract_address: listing.contract_address.toLowerCase(),
      token_id: listing.token_id,
      seller_address: listing.seller_address.toLowerCase(),
      sale_type: listing.sale_type,
      price: listing.price,
      amount: listing.amount || 1,
      status: listing.status || "active",
    };

    console.log("📝 Creating listing with data:", insertData);

    const { data, error } = await supabase.from("nft_listings").insert([insertData]).select().single();

    if (error) {
      console.error("❌ createListing 에러:", error);
      throw error;
    }

    console.log("✅ createListing 완료:", data);
    return data;
  } catch (error) {
    console.error("리스팅 생성 에러:", error);
    throw error;
  }
}

// ✅ 활성 리스팅 전체 조회 - 디버깅 강화
// supabaseMarketplace.ts에 추가

export async function getActiveListings(): Promise<Listing[]> {
  const timestamp = Date.now();

  try {
    console.log(`🔍 [${timestamp}] getActiveListings 시작`);

    // 1. 먼저 전체 리스팅 조회 (디버깅용)
    const { data: allData, error: allError } = await supabase.from("nft_listings").select("*").order("created_at", { ascending: false });

    if (allError) {
      console.error("❌ 전체 리스팅 조회 에러:", allError);
    } else {
      console.log(`📊 전체 리스팅: ${allData?.length || 0}개`);
      if (allData && allData.length > 0) {
        console.log("📋 리스팅 샘플:", allData.slice(0, 3));
        console.log(
          "🔢 상태별 분포:",
          allData.reduce((acc, l) => {
            acc[l.status] = (acc[l.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        );
      }
    }

    // 2. active 상태만 조회
    const { data, error } = await supabase.from("nft_listings").select("*").eq("status", "active").order("created_at", { ascending: false });

    if (error) {
      console.error("❌ active 리스팅 조회 에러:", error);
      console.error("에러 상세:", JSON.stringify(error, null, 2));
      throw error;
    }

    console.log(`✅ [${timestamp}] active 리스팅: ${data?.length || 0}개`);

    if (data && data.length > 0) {
      console.log(
        "📋 Active 리스팅 상세:",
        data.map((l) => ({
          id: l.id?.slice(0, 8),
          token_id: l.token_id,
          seller: l.seller_address?.slice(0, 10),
          price: l.price,
          amount: l.amount,
          created_at: l.created_at,
        }))
      );
    } else {
      console.warn("⚠️ active 상태의 리스팅이 없습니다");
    }

    return data || [];
  } catch (err) {
    console.error("❌ getActiveListings 예외:", err);
    throw err;
  }
}

// 특정 사용자의 리스팅 조회
export async function getUserListings(walletAddress: string) {
  const { data, error } = await supabase.from("nft_listings").select("*").eq("seller_address", walletAddress.toLowerCase()).order("created_at", { ascending: false });

  if (error) {
    console.error("사용자 리스팅 조회 에러:", error);
    return [];
  }

  return data || [];
}

// 특정 NFT의 리스팅 조회
export async function getListingByNFT(contractAddress: string, tokenId: string) {
  try {
    const { data, error } = await supabase.from("nft_listings").select("*").eq("contract_address", contractAddress.toLowerCase()).eq("token_id", tokenId).eq("status", "active").maybeSingle();

    if (error && error.code !== "PGRST116") throw error;
    return data ?? null;
  } catch (err) {
    console.error("NFT 리스팅 조회 에러:", contractAddress, tokenId, err);
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

  if (error) {
    console.error("리스팅 상태 업데이트 에러:", error);
    throw error;
  }

  console.log(`✅ Listing ${listingId} 상태 → ${status}`);
  return data;
}

// 입찰 업데이트
export async function updateBid(listingId: string, bidAmount: string, bidderAddress: string) {
  try {
    await ensureUserExists(bidderAddress);

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
  } catch (error) {
    console.error("입찰 업데이트 에러:", error);
    throw error;
  }
}

// ==========================================
// 거래 내역 관리 함수
// ==========================================

export async function createTransaction(transaction: Omit<Transaction, "id" | "created_at">) {
  try {
    await ensureUserExists(transaction.from_address);
    await ensureUserExists(transaction.to_address);

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

    console.log(`✅ Transaction 생성 (${transaction.transaction_type}):`, data.id);
    return data;
  } catch (error) {
    console.error("거래 내역 생성 에러:", error);
    throw error;
  }
}

// 사용자 거래 내역 조회
export async function getUserTransactions(userAddress: string) {
  const normalizedAddress = userAddress.toLowerCase();

  const { data, error } = await supabase.from("nft_transactions").select("*").or(`from_address.eq.${normalizedAddress},to_address.eq.${normalizedAddress}`).order("created_at", { ascending: false });

  if (error) {
    console.error("사용자 거래 내역 조회 에러:", error);
    return [];
  }

  return data || [];
}

// NFT별 거래 내역
export async function getNFTTransactions(contractAddress: string, tokenId: string) {
  const { data, error } = await supabase.from("nft_transactions").select("*").eq("contract_address", contractAddress.toLowerCase()).eq("token_id", tokenId).order("created_at", { ascending: false });

  if (error) {
    console.error("NFT 거래 내역 조회 에러:", error);
    return [];
  }

  return data || [];
}

// ==========================================
// 디버깅 헬퍼 함수
// ==========================================

// 전체 리스팅 조회 (상태 무관)
export async function getAllListings(): Promise<Listing[]> {
  const { data, error } = await supabase.from("nft_listings").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error("전체 리스팅 조회 에러:", error);
    return [];
  }

  console.log("📊 전체 리스팅:", data?.length || 0, "개");
  return data || [];
}

// 특정 ID로 리스팅 조회
export async function getListingById(listingId: string): Promise<Listing | null> {
  const { data, error } = await supabase.from("nft_listings").select("*").eq("id", listingId).single();

  if (error) {
    console.error("리스팅 조회 에러:", error);
    return null;
  }

  return data;
}
