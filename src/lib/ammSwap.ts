// lib/ammSwap.ts
import { getSupabaseClient } from "./supabaseClient";
const supabase = getSupabaseClient();

interface Pool {
  id: number;
  token_a: string;
  token_b: string;
  reserve_a: number;
  reserve_b: number;
  fee_percent: number;
}

interface SwapResult {
  amountOut: number;
  priceImpact: number;
  fee: number;
  newReserveA: number;
  newReserveB: number;
}

type GoldSource = "Vygddrasil" | "Vpunk" | "Obfuscate";

/**
 * Uniswap V2 스타일 AMM 스왑 계산
 * x * y = k 공식 사용
 */
export function calculateSwapOutput(amountIn: number, reserveIn: number, reserveOut: number, feePercent: number = 0.003): SwapResult {
  // 수수료 차감
  const fee = amountIn * feePercent;
  const amountInAfterFee = amountIn - fee;

  // Uniswap V2 공식: (x + Δx) * (y - Δy) = k
  // Δy = (y * Δx) / (x + Δx)
  const numerator = amountInAfterFee * reserveOut;
  const denominator = reserveIn + amountInAfterFee;
  const amountOut = numerator / denominator;

  // 새로운 리저브 계산
  const newReserveIn = reserveIn + amountInAfterFee;
  const newReserveOut = reserveOut - amountOut;

  // 가격 영향 계산
  const spotPriceBefore = reserveOut / reserveIn;
  const spotPriceAfter = newReserveOut / newReserveIn;
  const priceImpact = Math.abs((spotPriceAfter - spotPriceBefore) / spotPriceBefore) * 100;

  return {
    amountOut,
    priceImpact,
    fee,
    newReserveA: newReserveIn,
    newReserveB: newReserveOut,
  };
}

/**
 * 풀 정보 가져오기
 */
export async function getPool(tokenA: string, tokenB: string): Promise<Pool | null> {
  const { data, error } = await supabase.from("liquidity_pools").select("*").or(`and(token_a.eq.${tokenA},token_b.eq.${tokenB}),and(token_a.eq.${tokenB},token_b.eq.${tokenA})`).single();

  if (error || !data) {
    console.error("Pool fetch error:", error);
    return null;
  }

  return {
    id: data.id,
    token_a: data.token_a,
    token_b: data.token_b,
    reserve_a: parseFloat(data.reserve_a),
    reserve_b: parseFloat(data.reserve_b),
    fee_percent: parseFloat(data.fee_percent),
  };
}

/**
 * 모든 풀 정보 가져오기
 */
export async function getAllPools(): Promise<Pool[]> {
  const { data, error } = await supabase.from("liquidity_pools").select("*").order("id", { ascending: true });

  if (error || !data) {
    console.error("Pools fetch error:", error);
    return [];
  }

  return data.map((pool) => ({
    id: pool.id,
    token_a: pool.token_a,
    token_b: pool.token_b,
    reserve_a: parseFloat(pool.reserve_a),
    reserve_b: parseFloat(pool.reserve_b),
    fee_percent: parseFloat(pool.fee_percent),
  }));
}

/**
 * 테이블 이름 가져오기
 */
function getTableName(source: GoldSource): string {
  switch (source) {
    case "Vygddrasil":
      return "vygddrasilclass";
    case "Vpunk":
      return "vpunkclass";
    case "Obfuscate":
      return "obfuscateclass";
  }
}

/**
 * Gold 토큰 심볼을 소스로 변환
 */
function tokenToSource(tokenSymbol: string): GoldSource {
  if (tokenSymbol.includes("Vygddrasil")) return "Vygddrasil";
  if (tokenSymbol.includes("Vpunk")) return "Vpunk";
  if (tokenSymbol.includes("Obfuscate")) return "Obfuscate";
  return "Vygddrasil"; // default
}

/**
 * 사용자의 Gold 토큰 잔액 가져오기 (캐릭터 테이블에서)
 */
export async function getGoldBalance(walletAddress: string, source: GoldSource): Promise<number> {
  const tableName = getTableName(source);

  const { data, error } = await supabase.from(tableName).select("gold").eq("wallet_address", walletAddress);

  if (error || !data) {
    return 0;
  }

  return data.reduce((sum, char) => sum + (parseFloat(char.gold) || 0), 0);
}

/**
 * 모든 Gold 토큰 잔액 가져오기
 */
export async function getAllGoldBalances(walletAddress: string): Promise<{ [key: string]: number }> {
  const sources: GoldSource[] = ["Vygddrasil", "Vpunk", "Obfuscate"];
  const balances: { [key: string]: number } = {};

  for (const source of sources) {
    const balance = await getGoldBalance(walletAddress, source);
    balances[`Gold_${source}`] = balance;
  }

  return balances;
}

/**
 * VTDN 잔액 가져오기 (vtdn 테이블에서)
 */
export async function getVTDNBalance(walletAddress: string): Promise<number> {
  const { data: userData, error: userError } = await supabase.from("Users").select("id").eq("wallet_address", walletAddress).single();

  if (userError || !userData) {
    return 0;
  }

  const { data: vtdnData, error: vtdnError } = await supabase.from("vtdn").select("vtdn_balance").eq("user_id", userData.id).single();

  if (vtdnError || !vtdnData) {
    return 0;
  }

  return parseFloat(vtdnData.vtdn_balance) || 0;
}

/**
 * 스왑 실행 (DB 트랜잭션)
 */
export async function executeSwap(walletAddress: string, tokenIn: string, tokenOut: string, amountIn: number): Promise<{ success: boolean; amountOut?: number; error?: string }> {
  try {
    // 1. 풀 정보 가져오기
    const pool = await getPool(tokenIn, tokenOut);
    if (!pool) {
      return { success: false, error: "Pool not found" };
    }

    // 2. 스왑 방향 결정
    const isAtoB = pool.token_a === tokenIn;
    const reserveIn = isAtoB ? pool.reserve_a : pool.reserve_b;
    const reserveOut = isAtoB ? pool.reserve_b : pool.reserve_a;

    // 3. 스왑 출력량 계산
    const swapResult = calculateSwapOutput(amountIn, reserveIn, reserveOut, pool.fee_percent);

    // 4. 잔액 확인 및 업데이트
    if (tokenIn === "VTDN") {
      // VTDN -> Gold
      const vtdnBalance = await getVTDNBalance(walletAddress);
      if (vtdnBalance < amountIn) {
        return { success: false, error: "Insufficient VTDN balance" };
      }

      // VTDN 차감
      const { data: userData } = await supabase.from("Users").select("id").eq("wallet_address", walletAddress).single();

      if (!userData) {
        return { success: false, error: "User not found" };
      }

      await supabase
        .from("vtdn")
        .update({ vtdn_balance: (vtdnBalance - amountIn).toString() })
        .eq("user_id", userData.id);

      // Gold 증가 (첫 번째 캐릭터에)
      const source = tokenToSource(tokenOut);
      const tableName = getTableName(source);

      const { data: chars } = await supabase.from(tableName).select("id, gold").eq("wallet_address", walletAddress).limit(1);

      if (!chars || chars.length === 0) {
        return { success: false, error: `No ${source} character found` };
      }

      const charGold = parseFloat(chars[0].gold) || 0;
      await supabase
        .from(tableName)
        .update({ gold: charGold + swapResult.amountOut })
        .eq("id", chars[0].id);
    } else {
      // Gold -> VTDN
      const source = tokenToSource(tokenIn);
      const goldBalance = await getGoldBalance(walletAddress, source);

      if (goldBalance < amountIn) {
        return { success: false, error: "Insufficient Gold balance" };
      }

      // Gold 차감 (가장 많은 캐릭터부터)
      const tableName = getTableName(source);
      const { data: chars } = await supabase.from(tableName).select("id, gold").eq("wallet_address", walletAddress).order("gold", { ascending: false });

      if (!chars || chars.length === 0) {
        return { success: false, error: "No character found" };
      }

      let remainingAmount = amountIn;
      for (const char of chars) {
        if (remainingAmount <= 0) break;
        const charGold = parseFloat(char.gold) || 0;
        const deductAmount = Math.min(charGold, remainingAmount);

        await supabase
          .from(tableName)
          .update({ gold: charGold - deductAmount })
          .eq("id", char.id);

        remainingAmount -= deductAmount;
      }

      // VTDN 증가
      const { data: userData } = await supabase.from("Users").select("id").eq("wallet_address", walletAddress).single();

      if (!userData) {
        return { success: false, error: "User not found" };
      }

      const vtdnBalance = await getVTDNBalance(walletAddress);
      await supabase.from("vtdn").upsert(
        {
          user_id: userData.id,
          vtdn_balance: (vtdnBalance + swapResult.amountOut).toString(),
        },
        { onConflict: "user_id" }
      );
    }

    // 5. 풀 업데이트
    await supabase
      .from("liquidity_pools")
      .update({
        reserve_a: isAtoB ? swapResult.newReserveA : swapResult.newReserveB,
        reserve_b: isAtoB ? swapResult.newReserveB : swapResult.newReserveA,
        updated_at: new Date().toISOString(),
      })
      .eq("id", pool.id);

    // 6. 트랜잭션 기록
    await supabase.from("swap_transactions").insert({
      wallet_address: walletAddress,
      pool_id: pool.id,
      token_in: tokenIn,
      token_out: tokenOut,
      amount_in: amountIn,
      amount_out: swapResult.amountOut,
      fee_amount: swapResult.fee,
      price_impact: swapResult.priceImpact,
      reserve_a_before: pool.reserve_a,
      reserve_b_before: pool.reserve_b,
      reserve_a_after: isAtoB ? swapResult.newReserveA : swapResult.newReserveB,
      reserve_b_after: isAtoB ? swapResult.newReserveB : swapResult.newReserveA,
    });

    return {
      success: true,
      amountOut: swapResult.amountOut,
    };
  } catch (error) {
    console.error("Swap execution error:", error);
    return { success: false, error: "Swap failed" };
  }
}

/**
 * 실시간 스왑 견적 (실제 실행 없이 계산만)
 */
export async function getSwapQuote(tokenIn: string, tokenOut: string, amountIn: number): Promise<SwapResult | null> {
  const pool = await getPool(tokenIn, tokenOut);
  if (!pool) return null;

  const isAtoB = pool.token_a === tokenIn;
  const reserveIn = isAtoB ? pool.reserve_a : pool.reserve_b;
  const reserveOut = isAtoB ? pool.reserve_b : pool.reserve_a;

  return calculateSwapOutput(amountIn, reserveIn, reserveOut, pool.fee_percent);
}
