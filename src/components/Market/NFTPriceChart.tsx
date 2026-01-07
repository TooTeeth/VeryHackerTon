"use client";

import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { supabase } from "../../lib/supabaseClient";

interface PriceData {
  timestamp: string;
  price: number;
  time: string;
  id: string; // unique key for each data point
}

interface VolumeData {
  time: string;
  volume: number;
  count: number;
  id: string; // unique key
}

interface NFTPriceChartProps {
  contractAddress: string;
  tokenId: string;
  timeRange?: "1D" | "1W" | "1M" | "1Y";
  isVisible?: boolean; // 차트가 보이는 상태인지
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: PriceData | VolumeData;
    dataKey?: string;
  }>;
}

// wei를 ether로 변환 (또는 이미 ether인 경우 그대로 사용)
function parsePrice(priceStr: string): number {
  const price = parseFloat(priceStr);
  // 가격이 10^15 이상이면 wei로 간주하고 변환
  if (price >= 1e15) {
    return price / 1e18;
  }
  return price;
}

export default function NFTPriceChart({ contractAddress, tokenId, timeRange = "1M", isVisible = true }: NFTPriceChartProps) {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [selectedRange, setSelectedRange] = useState<"1D" | "1W" | "1M" | "1Y">(timeRange);
  const [activeTab, setActiveTab] = useState<"price" | "volume">("price");
  const [stats, setStats] = useState({ totalVolume: 0, totalTrades: 0, avgPrice: 0 });

  const timeRanges: Array<"1D" | "1W" | "1M" | "1Y"> = ["1D", "1W", "1M", "1Y"];

  const loadTransactionHistory = useCallback(async () => {
    try {
      const hoursBack = selectedRange === "1D" ? 24 : selectedRange === "1W" ? 168 : selectedRange === "1M" ? 720 : 8760;
      const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

      // NFT 거래 내역 조회 (buy, sell 타입만)
      const { data: transactions } = await supabase
        .from("nft_transactions")
        .select("*")
        .eq("contract_address", contractAddress.toLowerCase())
        .eq("token_id", tokenId)
        .in("transaction_type", ["buy", "sell"])
        .gte("created_at", startTime)
        .order("created_at", { ascending: true });

      if (transactions && transactions.length > 0) {
        // 가격 데이터 생성
        const prices: PriceData[] = transactions.map((tx, index) => {
          const date = new Date(tx.created_at);
          return {
            timestamp: tx.created_at,
            price: parsePrice(tx.price),
            time: formatTime(date, selectedRange),
            id: `price-${tx.id || index}-${date.getTime()}`,
          };
        });

        setPriceData(prices);

        // 가격 변동 계산
        if (prices.length > 0) {
          const latest = prices[prices.length - 1].price;
          const oldest = prices[0].price;
          setCurrentPrice(latest);
          if (oldest > 0) {
            setPriceChange(((latest - oldest) / oldest) * 100);
          }
        }

        // 거래량 데이터 생성 (시간대별 집계)
        const volumeMap = new Map<string, { volume: number; count: number }>();
        transactions.forEach((tx) => {
          const date = new Date(tx.created_at);
          const timeKey = formatTime(date, selectedRange);
          const existing = volumeMap.get(timeKey) || { volume: 0, count: 0 };
          volumeMap.set(timeKey, {
            volume: existing.volume + parsePrice(tx.price),
            count: existing.count + 1,
          });
        });

        const volumes: VolumeData[] = Array.from(volumeMap.entries()).map(([time, data], index) => ({
          time,
          volume: data.volume,
          count: data.count,
          id: `volume-${index}-${time}`,
        }));

        setVolumeData(volumes);

        // 통계 계산
        const totalVolume = transactions.reduce((sum, tx) => sum + parsePrice(tx.price), 0);
        const avgPrice = totalVolume / transactions.length;
        setStats({
          totalVolume,
          totalTrades: transactions.length,
          avgPrice,
        });
      } else {
        setPriceData([]);
        setVolumeData([]);
        setCurrentPrice(0);
        setPriceChange(0);
        setStats({ totalVolume: 0, totalTrades: 0, avgPrice: 0 });
      }
    } catch (error) {
      console.error("Error loading NFT transaction history:", error);
    }
  }, [contractAddress, tokenId, selectedRange]);

  useEffect(() => {
    if (isVisible) {
      loadTransactionHistory();
    }
  }, [loadTransactionHistory, isVisible]);

  function formatTime(date: Date, range: string): string {
    if (range === "1D") {
      return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    } else if (range === "1W" || range === "1M") {
      return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
    } else {
      return date.toLocaleDateString("ko-KR", { month: "short", year: "2-digit" });
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
    return num.toFixed(2);
  }

  function formatYAxis(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return (value / 1_000).toFixed(1) + "K";
    if (value >= 1) return value.toFixed(1);
    return value.toFixed(4);
  }

  const PriceTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as PriceData;
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-white font-semibold">{payload[0].value.toFixed(4)} VERY</p>
          <p className="text-gray-400 text-sm">{data.time}</p>
        </div>
      );
    }
    return null;
  };

  const VolumeTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as VolumeData;
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
          <p className="text-white font-semibold">{data.volume.toFixed(2)} VERY</p>
          <p className="text-gray-400 text-sm">{data.count} trades</p>
          <p className="text-gray-400 text-sm">{data.time}</p>
        </div>
      );
    }
    return null;
  };

  const color = priceChange >= 0 ? "#10b981" : "#ef4444";

  // 보이지 않는 상태에서는 렌더링하지 않음
  if (!isVisible) {
    return null;
  }

  const hasData = priceData.length > 0 || volumeData.length > 0;

  return (
    <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Tab Selector */}
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("price")}
                className={`px-3 py-1 rounded text-sm font-medium transition ${activeTab === "price" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Price
              </button>
              <button
                onClick={() => setActiveTab("volume")}
                className={`px-3 py-1 rounded text-sm font-medium transition ${activeTab === "volume" ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"}`}
              >
                Volume
              </button>
            </div>

            {activeTab === "price" && currentPrice > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{currentPrice.toFixed(4)} VERY</span>
                <span className={`text-sm font-semibold ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {priceChange >= 0 ? "▲" : "▼"} {Math.abs(priceChange).toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setSelectedRange(range)}
                className={`px-2 py-1 rounded text-xs font-medium transition ${selectedRange === range ? "bg-white/20 text-white" : "text-gray-400 hover:text-white"}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-40" style={{ minWidth: 200, minHeight: 160 }}>
        {hasData ? (
          activeTab === "price" ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={160}>
              <LineChart data={priceData}>
                <defs>
                  <linearGradient id={`nftPriceGradient-${tokenId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  domain={["dataMin", "dataMax"]}
                  stroke="#6b7280"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                  width={50}
                  allowDecimals={true}
                  tickCount={5}
                />
                <Tooltip content={<PriceTooltip />} />
                <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={false} fill={`url(#nftPriceGradient-${tokenId})`} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={160}>
              <BarChart data={volumeData}>
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: "#9ca3af", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatYAxis}
                  width={50}
                  tickCount={5}
                />
                <Tooltip content={<VolumeTooltip />} />
                <Bar dataKey="volume" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">No trading history available</div>
        )}
      </div>

      {/* Stats */}
      {hasData && (
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-gray-400">Total Volume</div>
            <div className="text-white font-semibold">{formatNumber(stats.totalVolume)} VERY</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-gray-400">Total Trades</div>
            <div className="text-white font-semibold">{stats.totalTrades}</div>
          </div>
          <div className="bg-white/5 rounded-lg p-2">
            <div className="text-gray-400">Avg Price</div>
            <div className="text-white font-semibold">{stats.avgPrice.toFixed(4)} VERY</div>
          </div>
        </div>
      )}
    </div>
  );
}
