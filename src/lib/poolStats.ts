// lib/poolStats.ts
import { getSupabaseClient } from './supabaseClient';
const supabase = getSupabaseClient();

interface PoolStats {
  volume24h: number;
  tvl: number;
  fees24h: number;
  transactions24h: number;
}

/**
 * 풀의 24시간 통계 계산
 */
export async function getPoolStats(tokenA: string, tokenB: string): Promise<PoolStats> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. 24시간 거래량 계산
    const { data: swaps } = await supabase
      .from('swap_transactions')
      .select('amount_in, amount_out, fee_amount, token_in, token_out')
      .or(`and(token_in.eq.${tokenA},token_out.eq.${tokenB}),and(token_in.eq.${tokenB},token_out.eq.${tokenA})`)
      .gte('created_at', dayAgo);

    let volume24h = 0;
    let fees24h = 0;

    if (swaps) {
      swaps.forEach(swap => {
        const amount = parseFloat(swap.amount_in);
        volume24h += amount;
        fees24h += parseFloat(swap.fee_amount);
      });
    }

    // 2. TVL (Total Value Locked) 계산
    const { data: pool } = await supabase
      .from('liquidity_pools')
      .select('reserve_a, reserve_b, token_a, token_b')
      .or(`and(token_a.eq.${tokenA},token_b.eq.${tokenB}),and(token_a.eq.${tokenB},token_b.eq.${tokenA})`)
      .single();

    let tvl = 0;
    if (pool) {
      const reserveA = parseFloat(pool.reserve_a);
      const reserveB = parseFloat(pool.reserve_b);
      // TVL = 두 토큰의 총 가치 (단순화: VTDN 기준으로 계산)
      if (pool.token_b === 'VTDN') {
        tvl = reserveB * 2; // 양쪽 토큰의 가치를 합산
      } else {
        tvl = reserveA * 2;
      }
    }

    return {
      volume24h,
      tvl,
      fees24h,
      transactions24h: swaps?.length || 0,
    };
  } catch (error) {
    console.error('Error calculating pool stats:', error);
    return {
      volume24h: 0,
      tvl: 0,
      fees24h: 0,
      transactions24h: 0,
    };
  }
}

/**
 * 숫자를 간단하게 포맷 (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}
