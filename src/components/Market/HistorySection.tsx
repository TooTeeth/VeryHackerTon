"use client";

import { useEffect, useState, useCallback } from "react";
import { getUserEvents, NFTEvent } from "../../lib/supabaseHistory";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { createTransaction, updateListingStatus } from "../../lib/supabaseMarketplace";

type FilterType = "all" | "listing" | "buy" | "sell" | "cancel";

interface EventRow extends NFTEvent {
  remaining_amount?: number;
}

const MARKETPLACE_ADDRESS = "0x62CcC999E33B698E4EDb89A415C9FDa4f1203BDA";
const MARKETPLACE_ABI = ["function cancel(address nft, uint256 tokenId, uint256 amount) external", "function getListedAmount(address nft, uint256 tokenId, address seller) external view returns (uint256)"];

export default function HistorySection({ wallet }: { wallet: any }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelAmount, setCancelAmount] = useState<Record<string, number>>({});
  const [showCancelModal, setShowCancelModal] = useState<EventRow | null>(null);

  const loadHistory = useCallback(async () => {
    if (!wallet?.address) return;
    setLoading(true);
    try {
      const data = await getUserEvents(wallet.address);

      // 각 listing 이벤트에 대해 온체인 남은 수량 확인
      const eventsWithAmounts: EventRow[] = await Promise.all(
        data.map(async (event) => {
          if (event.event_type === "listing" && window.ethereum) {
            try {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

              // 온체인에서 현재 리스팅된 수량 확인 (from_address가 seller)
              const amount = await marketplace.getListedAmount(
                event.contract_address,
                event.token_id,
                event.from_address // listing 이벤트에서 from_address가 seller
              );

              return {
                ...event,
                remaining_amount: Number(amount),
              };
            } catch (err) {
              console.warn("온체인 수량 확인 실패:", err);
              return { ...event, remaining_amount: 0 };
            }
          }
          return event;
        })
      );

      setEvents(eventsWithAmounts);
      console.log("📋 히스토리 로드 완료:", eventsWithAmounts.length, "개");
    } catch (error) {
      console.error("히스토리 로드 실패:", error);
      toast.error("거래 내역을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  }, [wallet?.address]);

  const openCancelModal = (event: EventRow) => {
    setCancelAmount({ [event.id]: event.remaining_amount || 1 });
    setShowCancelModal(event);
  };

  const handleCancelListing = async (event: EventRow, amountToCancel: number) => {
    if (!wallet?.address) {
      toast.error("지갑을 먼저 연결해주세요");
      return;
    }

    if (!window.ethereum) {
      toast.error("MetaMask를 설치해주세요");
      return;
    }

    if (amountToCancel <= 0) {
      toast.error("취소할 수량을 입력해주세요");
      return;
    }

    setCancellingId(event.id);
    setShowCancelModal(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      // 온체인에서 현재 seller의 리스팅 수량 확인
      const listedAmount = await marketplace.getListedAmount(event.contract_address, event.token_id, wallet.address);

      const currentListed = Number(listedAmount);
      console.log("📦 현재 리스팅된 수량:", currentListed);

      if (currentListed === 0) {
        toast.error("이미 취소되었거나 판매된 NFT입니다");
        await loadHistory();
        return;
      }

      // 취소할 수량 검증
      const finalCancelAmount = Math.min(amountToCancel, currentListed);

      if (finalCancelAmount <= 0) {
        toast.error("취소할 수량이 유효하지 않습니다");
        return;
      }

      toast.info(`${finalCancelAmount}개 취소 중...`);

      const tx = await marketplace.cancel(event.contract_address, event.token_id, finalCancelAmount);

      console.log("⏳ 트랜잭션 대기 중...", tx.hash);
      const receipt = await tx.wait();
      console.log("✅ 트랜잭션 완료:", receipt.hash);

      // 취소 트랜잭션 기록
      await createTransaction({
        listing_id: event.listing_id,
        contract_address: event.contract_address,
        token_id: event.token_id,
        from_address: MARKETPLACE_ADDRESS,
        to_address: wallet.address,
        price: "0",
        transaction_hash: receipt.hash,
        transaction_type: "cancel",
      });

      // 남은 수량 확인 후 리스팅 상태 업데이트
      const remainingAmount = await marketplace.getListedAmount(event.contract_address, event.token_id, wallet.address);

      if (Number(remainingAmount) === 0 && event.listing_id) {
        await updateListingStatus(event.listing_id, "cancelled");
      }

      toast.success(`✅ ${finalCancelAmount}개 취소 완료!`);
      await loadHistory();
    } catch (error: any) {
      console.error("❌ 취소 실패:", error);

      let errorMsg = "취소에 실패했습니다";
      if (error.code === "ACTION_REJECTED") {
        errorMsg = "사용자가 트랜잭션을 거부했습니다";
      } else if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast.error(errorMsg);
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filtered = filter === "all" ? events : events.filter((e) => e.event_type === filter);

  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const formatDate = (d?: string) => {
    if (!d) return "-";
    const date = new Date(d);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  /**
   * ✅ 가격 포맷팅 함수
   * - Wei 단위 (큰 숫자)인 경우 ETH로 변환
   * - 이미 ETH 단위 (작은 숫자)인 경우 그대로 표시
   */
  const formatPrice = (priceStr: string): string => {
    if (!priceStr || priceStr === "0") return "-";

    try {
      const price = BigInt(priceStr);

      // Wei 단위인지 판단 (1 ETH = 10^18 Wei)
      // 만약 값이 10^15보다 크면 Wei로 가정
      const WEI_THRESHOLD = BigInt("1000000000000000"); // 0.001 ETH

      if (price > WEI_THRESHOLD) {
        // Wei -> ETH 변환
        const ethValue = Number(price) / 1e18;
        return `${ethValue.toFixed(4)} Very`;
      } else {
        // 이미 ETH 단위이거나 작은 값
        return `${Number(priceStr).toFixed(4)} Very`;
      }
    } catch {
      // BigInt 변환 실패 시 그대로 표시
      return `${Number(priceStr).toFixed(4)} Very`;
    }
  };

  const eventConfig = (type: EventRow["event_type"]) => {
    switch (type) {
      case "listing":
        return {
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
          icon: "📋",
          label: "Listed",
        };
      case "buy":
        return {
          color: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          icon: "🛒",
          label: "Bought",
        };
      case "sell":
        return {
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          icon: "💰",
          label: "Sold",
        };
      case "cancel":
        return {
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          icon: "❌",
          label: "Canceled",
        };
      default:
        return {
          color: "text-white",
          bgColor: "bg-white/10",
          borderColor: "border-white/10",
          icon: "🔄",
          label: "Unknown",
        };
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#13141a] to-[#1a1a2e] rounded-3xl p-8 border border-white/10 shadow-2xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-white mb-2">Transaction History</h2>
          <p className="text-gray-400 text-sm">Track all your NFT activities</p>
        </div>

        <button onClick={loadHistory} disabled={loading} className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50 flex items-center gap-2 transition-all">
          <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {(["all", "listing", "buy", "sell", "cancel"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap
              ${filter === f ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}
            `}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-400">Loading history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4 opacity-50">📦</div>
          <p className="text-gray-400 text-lg">No transaction history</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => {
            const config = eventConfig(e.event_type);
            const remainingAmount = e.remaining_amount ?? 0;
            // 온체인 수량이 0이면 취소/판매 완료된 것
            const isCompleted = e.event_type === "listing" && remainingAmount === 0;

            return (
              <div
                key={e.id}
                className={`
                  ${config.bgColor} ${config.borderColor}
                  border rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02]
                `}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* Event Type */}
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <span className="text-3xl">{config.icon}</span>
                    <div>
                      <p className={`${config.color} font-bold text-lg`}>{config.label}</p>
                      <p className="text-gray-500 text-xs">NFT #{e.token_id}</p>
                      {e.event_type === "listing" && <p className="text-gray-400 text-xs">남은 수량: {remainingAmount}개</p>}
                    </div>
                  </div>

                  {/* Address Flow */}
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <div className="bg-white/5 px-3 py-1.5 rounded-lg">
                      <p className="font-mono text-xs text-gray-400">{shortAddr(e.from_address)}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <div className="bg-white/5 px-3 py-1.5 rounded-lg">
                      <p className="font-mono text-xs text-gray-400">{shortAddr(e.to_address)}</p>
                    </div>
                  </div>

                  {/* Price - ✅ 개선된 가격 포맷팅 */}
                  <div className="text-right min-w-[120px]">
                    <p className="text-white font-bold text-lg">{formatPrice(e.price)}</p>
                  </div>

                  {/* Date */}
                  <div className="text-right min-w-[140px]">
                    <p className="text-gray-400 text-xs">{formatDate(e.created_at)}</p>
                  </div>

                  {/* Cancel Button - listing 이벤트만 표시 */}
                  {e.event_type === "listing" && (
                    <div className="min-w-[100px]">
                      {isCompleted ? (
                        <div className="px-4 py-2 rounded-lg bg-gray-500/20 text-gray-500 text-sm font-bold text-center">Completed</div>
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openCancelModal(e);
                          }}
                          disabled={cancellingId === e.id}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {cancellingId === e.id ? "Canceling..." : "Cancel"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">취소할 수량 선택</h3>

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-2">
                NFT #{showCancelModal.token_id} - 남은 수량: {showCancelModal.remaining_amount}개
              </p>
              <input
                type="number"
                min="1"
                max={showCancelModal.remaining_amount || 1}
                value={cancelAmount[showCancelModal.id] || 1}
                onChange={(e) =>
                  setCancelAmount({
                    ...cancelAmount,
                    [showCancelModal.id]: Math.min(Math.max(1, parseInt(e.target.value) || 1), showCancelModal.remaining_amount || 1),
                  })
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(null)} className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 transition-all">
                취소
              </button>
              <button onClick={() => handleCancelListing(showCancelModal, cancelAmount[showCancelModal.id] || 1)} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold hover:from-red-600 hover:to-pink-600 transition-all">
                {cancelAmount[showCancelModal.id] || 1}개 취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
