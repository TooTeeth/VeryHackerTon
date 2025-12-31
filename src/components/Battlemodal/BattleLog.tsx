// components/Battlemodal/BattleLog.tsx

import React, { useRef, useEffect, useState } from "react";
import { BattleLogEntry } from "../../types/vygddrasil.types";

interface BattleLogProps {
  logs: BattleLogEntry[];
  compact?: boolean; // 컴팩트 모드: 최근 2개만 표시 + 모달
}

export default function BattleLog({ logs, compact = false }: BattleLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);

  // 새 로그 추가시 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // 모달 열릴 때 맨 아래로 스크롤
  useEffect(() => {
    if (showModal && modalScrollRef.current) {
      modalScrollRef.current.scrollTop = modalScrollRef.current.scrollHeight;
    }
  }, [showModal]);

  // 컴팩트 모드에서 표시할 로그 (최근 2개)
  const displayLogs = compact ? logs.slice(-2) : logs;

  // 컴팩트 모드
  if (compact) {
    return (
      <>
        <div className="relative">
          {/* 로그 영역 */}
          <div ref={scrollRef} className="bg-gray-900/50 rounded-lg p-2 overflow-y-auto hide-scrollbar max-h-[56px]">
            <div className="space-y-0.5">
              {displayLogs.map((log, index) => (
                <div key={index} className={`text-xs ${log.actor === "player" ? "text-blue-300" : "text-red-300"}`}>
                  <span className="text-gray-500 mr-1">&gt;</span>
                  <span className={log.isCritical ? "text-yellow-400 font-bold" : ""}>
                    {log.action}
                    {log.damage !== undefined && <span className="ml-1 text-white">({log.damage})</span>}
                    {log.heal !== undefined && <span className="ml-1 text-green-400">(+{log.heal})</span>}
                    {log.isDodged && <span className="ml-1 text-gray-400">(회피)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 전체 로그 보기 버튼 (모달) */}
          {logs.length > 2 && (
            <button onClick={() => setShowModal(true)} className=" ml-2 hover:bg-gray-600 text-gray-300 text-[10px] px-2 py-0.5 rounded-b transition">
              📜 전체 로그 ({logs.length})
            </button>
          )}
        </div>

        {/* 전체 로그 모달 */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col border border-gray-700">
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="text-lg font-bold text-white">📜 전투 로그</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">
                  ×
                </button>
              </div>
              <div ref={modalScrollRef} className="flex-1 overflow-y-auto p-4 hide-scrollbar">
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className={`text-sm ${log.actor === "player" ? "text-blue-300" : "text-red-300"}`}>
                      <span className="text-gray-500 mr-1">[{log.turn}]</span>
                      <span className={log.isCritical ? "text-yellow-400 font-bold" : ""}>
                        {log.action}
                        {log.damage !== undefined && <span className="ml-1 text-white">({log.damage} 데미지)</span>}
                        {log.heal !== undefined && <span className="ml-1 text-green-400">(+{log.heal} 회복)</span>}
                        {log.isDodged && <span className="ml-1 text-gray-400">(회피!)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 기본 모드 - 최근 로그만 표시 + 모달 버튼
  return (
    <>
      <div className="relative h-full">
        <div ref={scrollRef} className="bg-gray-900/50 rounded-lg p-3 h-full overflow-y-auto hide-scrollbar">
          <div className="text-xs text-gray-500 mb-2">전투 로그</div>
          <div className="space-y-1">
            {logs.slice(-3).map((log, index) => (
              <div key={index} className={`text-sm ${log.actor === "player" ? "text-blue-300" : "text-red-300"}`}>
                <span className="text-gray-500 mr-1">&gt;</span>
                <span className={log.isCritical ? "text-yellow-400 font-bold" : ""}>
                  {log.action}
                  {log.damage !== undefined && <span className="ml-1 text-white">({log.damage} 데미지)</span>}
                  {log.heal !== undefined && <span className="ml-1 text-green-400">(+{log.heal} 회복)</span>}
                  {log.isDodged && <span className="ml-1 text-gray-400">(회피!)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 전체 로그 보기 버튼 */}
        {logs.length > 3 && (
          <button onClick={() => setShowModal(true)} className=" ml-2 hover:bg-gray-600 text-gray-300 text-[10px] px-2 py-0.5 rounded-b transition">
            📜 전체 로그 ({logs.length})
          </button>
        )}
      </div>

      {/* 전체 로그 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col border border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">📜 전투 로그</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>
            <div ref={modalScrollRef} className="flex-1 overflow-y-auto p-4 hide-scrollbar">
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className={`text-sm ${log.actor === "player" ? "text-blue-300" : "text-red-300"}`}>
                    <span className="text-gray-500 mr-1">[{log.turn}]</span>
                    <span className={log.isCritical ? "text-yellow-400 font-bold" : ""}>
                      {log.action}
                      {log.damage !== undefined && <span className="ml-1 text-white">({log.damage} 데미지)</span>}
                      {log.heal !== undefined && <span className="ml-1 text-green-400">(+{log.heal} 회복)</span>}
                      {log.isDodged && <span className="ml-1 text-gray-400">(회피!)</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
