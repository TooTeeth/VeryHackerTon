"use client";

import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getSupabaseClient } from "../../lib/supabaseClient";
const supabase = getSupabaseClient();
import { getPoolStats, formatNumber } from "../../lib/poolStats";

interface PriceData {
  timestamp: string;
  price: number;
  time: string;
}

interface PoolPriceChartProps {
  tokenA: string;
  tokenB: string;
  timeRange?: "1D" | "1W" | "1M" | "1Y";
  onTimeRangeChange?: (range: "1D" | "1W" | "1M" | "1Y") => void;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: PriceData;
  }>;
}

export default function PoolPriceChart({ tokenA, tokenB, timeRange = "1D", onTimeRangeChange }: PoolPriceChartProps) {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ volume24h: 0, tvl: 0, fees24h: 0 });
  const [selectedRange, setSelectedRange] = useState<"1D" | "1W" | "1M" | "1Y">(timeRange);

  const timeRanges: Array<"1D" | "1W" | "1M" | "1Y"> = ["1D", "1W", "1M", "1Y"];

  const handleRangeChange = (range: "1D" | "1W" | "1M" | "1Y") => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const loadStats = useCallback(async () => {
    const poolStats = await getPoolStats(tokenA, tokenB);
    setStats(poolStats);
  }, [tokenA, tokenB]);

  const loadPriceHistory = useCallback(async () => {
    try {
      // 스왑 트랜잭션에서 가격 히스토리 가져오기
      const hoursBack = selectedRange === "1D" ? 24 : selectedRange === "1W" ? 168 : selectedRange === "1M" ? 720 : 8760;
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      const { data: swaps } = await supabase.from("swap_transactions").select("*").or(`token_in.eq.${tokenA},token_in.eq.${tokenB}`).gte("created_at", startTime).order("created_at", { ascending: true });

      if (swaps && swaps.length > 0) {
        // 각 스왑 후의 가격 계산
        const prices: PriceData[] = swaps.map((swap) => {
          const isAtoB = swap.token_in === tokenA;
          const price = isAtoB ? parseFloat(swap.reserve_b_after) / parseFloat(swap.reserve_a_after) : parseFloat(swap.reserve_a_after) / parseFloat(swap.reserve_b_after);

          const date = new Date(swap.created_at);
          return {
            timestamp: swap.created_at,
            price: price,
            time: formatTime(date, selectedRange),
          };
        });

        setPriceData(prices);

        if (prices.length > 0) {
          const latest = prices[prices.length - 1].price;
          const oldest = prices[0].price;
          setCurrentPrice(latest);
          setPriceChange(((latest - oldest) / oldest) * 100);
        }
      } else {
        // 스왑 기록이 없으면 현재 풀 상태에서 가격 계산
        const { data: pool } = await supabase.from("liquidity_pools").select("*").or(`and(token_a.eq.${tokenA},token_b.eq.${tokenB}),and(token_a.eq.${tokenB},token_b.eq.${tokenA})`).single();

        if (pool) {
          const price = pool.token_a === tokenA ? parseFloat(pool.reserve_b) / parseFloat(pool.reserve_a) : parseFloat(pool.reserve_a) / parseFloat(pool.reserve_b);

          setCurrentPrice(price);
          setPriceData([
            {
              timestamp: new Date().toISOString(),
              price: price,
              time: "Now",
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error loading price history:", error);
    } finally {
      setLoading(false);
    }
  }, [tokenA, tokenB, selectedRange]);

  useEffect(() => {
    loadPriceHistory();
    loadStats();
    const interval = setInterval(() => {
      loadPriceHistory();
      loadStats();
    }, 30000); // 30초마다 업데이트
    return () => clearInterval(interval);
  }, [tokenA, tokenB, selectedRange, loadPriceHistory, loadStats]);

  function formatTime(date: Date, range: string): string {
    if (range === "1D") {
      return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } else if (range === "1W" || range === "1M") {
      return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    } else {
      return date.toLocaleDateString("ko-KR", { month: "short", year: "2-digit" });
    }
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-white font-semibold">
            {payload[0].value.toFixed(6)} {tokenB}
          </p>
          <p className="text-gray-400 text-sm">{payload[0].payload.time}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-white/5 rounded-xl">
        <div className="text-gray-400">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-white">
                1 {tokenA.replace("Gold_", "")} = {currentPrice.toFixed(6)} {tokenB}
              </span>
              <span className="text-sm text-gray-400">(${currentPrice.toFixed(2)})</span>
            </div>
            <div className={`text-sm font-semibold ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
              {priceChange >= 0 ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)}%
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button key={range} onClick={() => handleRangeChange(range)} className={`px-3 py-1 rounded text-sm font-medium transition ${selectedRange === range ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"}`}>
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-64">
        {priceData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={priceChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={priceChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} tickLine={false} />
              <YAxis domain={["auto", "auto"]} stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} tickLine={false} tickFormatter={(value) => value.toFixed(4)} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="price" stroke={priceChange >= 0 ? "#10b981" : "#ef4444"} strokeWidth={2} dot={false} fill="url(#priceGradient)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">No price data available</div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-400">24h Volume</div>
          <div className="text-white font-semibold">{formatNumber(stats.volume24h)}</div>
        </div>
        <div>
          <div className="text-gray-400">TVL</div>
          <div className="text-white font-semibold">{formatNumber(stats.tvl)}</div>
        </div>
        <div>
          <div className="text-gray-400">Fee (24h)</div>
          <div className="text-white font-semibold">{formatNumber(stats.fees24h)}</div>
        </div>
      </div>
    </div>
  );
}
