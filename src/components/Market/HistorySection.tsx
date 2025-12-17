"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getUserEvents, NFTEvent } from "../../lib/supabaseHistory";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { createTransaction, updateListingStatus } from "../../lib/supabaseMarketplace";
import { getErrorMessage } from "../../lib/error";

type FilterType = "all" | "listing" | "buy" | "sell" | "cancel";

interface EventRow extends NFTEvent {
  remaining_amount?: number;
}

const MARKETPLACE_ADDRESS = "0x62CcC999E33B698E4EDb89A415C9FDa4f1203BDA";
const MARKETPLACE_ABI = ["function cancel(address nft, uint256 tokenId, uint256 amount) external", "function getListedAmount(address nft, uint256 tokenId, address seller) external view returns (uint256)"];

// ✅ 블록스캔 URL 생성 함수
const getBlockscanUrl = (txHash: string) => {
  // _sell, _buy 등의 접미사 제거
  const cleanHash = txHash.split("_")[0];
  return `https://www.veryscan.io/tx/${cleanHash}`;
};

export default function HistorySection({ wallet }: { wallet: { address: string } | null }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelAmount, setCancelAmount] = useState<Record<string, number>>({});
  const [showCancelModal, setShowCancelModal] = useState<EventRow | null>(null);

  // ✅ 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    } catch (error: unknown) {
      console.error("❌ 취소 실패:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ✅ 필터링된 이벤트
  const filtered = useMemo(() => {
    return filter === "all" ? events : events.filter((e) => e.event_type === filter);
  }, [events, filter]);

  // ✅ 페이지네이션 계산
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  // ✅ 필터나 itemsPerPage 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, itemsPerPage]);

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

          label: "Listed",
        };
      case "buy":
        return {
          color: "text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",

          label: "Bought",
        };
      case "sell":
        return {
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",

          label: "Sell",
        };
      case "cancel":
        return {
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",

          label: "Canceled",
        };
      default:
        return {
          color: "text-white",
          bgColor: "bg-white/10",
          borderColor: "border-white/10",
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

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50 cursor-pointer">
              <option value={10} className="bg-gray-800">
                10
              </option>
              <option value={20} className="bg-gray-800">
                20
              </option>
              <option value={30} className="bg-gray-800">
                30
              </option>
            </select>
          </div>

          <button onClick={loadHistory} disabled={loading} className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r  hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50 flex items-center gap-2 transition-all">
            <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? "Refreshing..." : ""}
          </button>
        </div>
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
        <>
          <div className="space-y-3">
            {paginatedEvents.map((e) => {
              const config = eventConfig(e.event_type);
              const remainingAmount = e.remaining_amount ?? 0;
              // 온체인 수량이 0이면 취소/판매 완료된 것
              const isCompleted = e.event_type === "listing" && remainingAmount === 0;

              return (
                <div
                  key={e.id}
                  className={`
                    ${config.bgColor} ${config.borderColor}
                    border rounded-md p-2 transition-all duration-300 
                  `}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    {/* Event Type */}
                    <div className="flex items-center gap-3 min-w-[120px]">
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
                    <div className="text-right min-w-[100px]">
                      <p className="text-white font-bold text-sm">{formatPrice(e.price)}</p>
                    </div>

                    {/* Date */}
                    <div className="text-right min-w-[140px]">
                      <p className="text-gray-400 text-xs">{formatDate(e.created_at)}</p>
                    </div>

                    {/* ✅ Blockscan Button */}
                    <div className="min-w-[120px]">
                      <a href={getBlockscanUrl(e.transaction_hash)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2  hover:from-cyan-600 hover:to-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105" onClick={(event) => event.stopPropagation()}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
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

          {/* ✅ 페이지네이션 컨트롤 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {/* 이전 버튼 */}
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* 페이지 번호 */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // 현재 페이지 주변 2개, 첫 페이지, 마지막 페이지만 표시
                  return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2;
                })
                .map((page, idx, arr) => {
                  // 생략 부호 표시
                  const showEllipsis = idx > 0 && arr[idx - 1] !== page - 1;
                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && <span className="px-2 text-gray-500">...</span>}
                      <button onClick={() => setCurrentPage(page)} className={`w-10 h-10 rounded-lg font-bold transition-all ${currentPage === page ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
                        {page}
                      </button>
                    </div>
                  );
                })}

              {/* 다음 버튼 */}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* 페이지 정보 */}
              <span className="text-gray-400 text-sm ml-4">
                {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
              </span>
            </div>
          )}
        </>
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
                닫기
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
