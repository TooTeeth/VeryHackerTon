// components/Vygddrasil/StageContent.tsx

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { StageMeta, ChoiceItem, BattleMode } from "../../types/vygddrasil.types";
import { ViewerSettings, defaultViewerSettings } from "./GameSidebar";

interface StageContentProps {
  stageMeta: StageMeta | null;
  viewerSettings?: ViewerSettings;
  choices?: ChoiceItem[];
  onChoiceClick?: (value: string, choiceText: string, battleMode?: BattleMode) => void;
  onPageChange?: (page: number, totalPages: number) => void;
  goToPage?: number; // 외부에서 특정 페이지로 이동 요청
  disabled?: boolean; // 선택지 비활성화 (부활 처리 중 등)
}

// 테마별 스타일
const themeStyles: Record<ViewerSettings["theme"], { bg: string; text: string; border: string }> = {
  light: { bg: "bg-white", text: "text-gray-900", border: "border-transparent" },
  dark: { bg: "bg-gray-900/95", text: "text-gray-200", border: "border-gray-700" },
  sepia: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  darkSepia: { bg: "bg-amber-950", text: "text-amber-100", border: "border-amber-800" },
  black: { bg: "bg-black", text: "text-gray-100", border: "border-gray-800" },
};

// 폰트 패밀리
const fontFamilyStyles: Record<ViewerSettings["fontFamily"], string> = {
  gothic: "font-sans",
  myeongjo: "font-serif",
  malgungothic: "font-sans",
};

// 폰트 크기 (1-7)
const fontSizeStyles: Record<number, string> = {
  1: "text-sm",
  2: "text-base",
  3: "text-lg",
  4: "text-xl",
  5: "text-2xl",
  6: "text-3xl",
  7: "text-4xl",
};

// 줄 간격 (1-5)
const lineHeightStyles: Record<number, string> = {
  1: "leading-tight",
  2: "leading-normal",
  3: "leading-relaxed",
  4: "leading-loose",
  5: "leading-[2.5]",
};

// 마진 (1-5)
const marginStyles: Record<number, string> = {
  1: "px-4",
  2: "px-8",
  3: "px-12",
  4: "px-16",
  5: "px-20",
};

export const StageContent: React.FC<StageContentProps> = ({ stageMeta, viewerSettings = defaultViewerSettings, choices = [], onChoiceClick, onPageChange, goToPage, disabled = false }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showChoices, setShowChoices] = useState(false); // 선택지 표시 여부
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 외부에서 페이지 이동 요청 시 처리
  useEffect(() => {
    if (goToPage !== undefined && goToPage >= 0) {
      setCurrentPage(goToPage);
    }
  }, [goToPage]);

  // 스크롤 위치 감지
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || viewerSettings.textLayout !== "scroll") return;

    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 200);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [viewerSettings.textLayout]);

  // stageMeta 변경시 페이지 및 선택지 표시 초기화
  useEffect(() => {
    setCurrentPage(0);
    setShowChoices(false);
  }, [stageMeta]);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!stageMeta) return null;

  const theme = themeStyles[viewerSettings.theme];
  const fontFamily = fontFamilyStyles[viewerSettings.fontFamily];
  const fontSize = fontSizeStyles[viewerSettings.fontSize] || "text-xl";
  const lineHeight = lineHeightStyles[viewerSettings.lineHeight] || "leading-normal";
  const margin = marginStyles[viewerSettings.margin] || "px-4";

  // 페이지 플립 뷰어 (2열 책장 넘김 형식)
  if (viewerSettings.textLayout === "page") {
    // 폰트 크기에 따른 한 쪽 페이지당 줄 수 (화면 높이 기준)
    const linesPerSideMap: Record<number, number> = {
      1: 38,
      2: 32,
      3: 26,
      4: 22,
      5: 18,
      6: 14,
      7: 11,
    };
    const linesPerSide = linesPerSideMap[viewerSettings.fontSize] || 26;

    // 텍스트를 줄 단위로 분할
    const allLines = stageMeta.description.split("\n");

    // 페이지별 텍스트 분할 - 줄 수 기반
    // showChoiceOnLeft: 왼쪽에 선택지 표시, showChoiceOnRight: 오른쪽에 선택지 표시
    const splitTextIntoPages = (): { left: string; right: string; showChoiceOnLeft?: boolean; showChoiceOnRight?: boolean }[] => {
      const pages: { left: string; right: string; showChoiceOnLeft?: boolean; showChoiceOnRight?: boolean }[] = [];
      let lineIndex = 0;
      let safetyCounter = 0;
      const maxPages = 100;

      while (lineIndex < allLines.length && safetyCounter < maxPages) {
        const isFirst = pages.length === 0;

        let leftText = "";
        let rightText = "";

        if (isFirst && viewerSettings.showImage) {
          // 첫 페이지 + 이미지 ON: 왼쪽은 이미지만, 오른쪽에 텍스트
          const rightEndIndex = Math.min(lineIndex + linesPerSide, allLines.length);
          leftText = allLines.slice(lineIndex, rightEndIndex).join("\n"); // left에 저장하지만 오른쪽에 표시됨
          lineIndex = rightEndIndex;
        } else {
          // 일반 페이지 또는 이미지 OFF
          const leftLines = isFirst ? Math.floor(linesPerSide * 0.7) : linesPerSide;

          // 왼쪽 페이지 텍스트
          const leftEndIndex = Math.min(lineIndex + leftLines, allLines.length);
          leftText = allLines.slice(lineIndex, leftEndIndex).join("\n");
          lineIndex = leftEndIndex;

          // 오른쪽 페이지 텍스트
          if (lineIndex < allLines.length) {
            const rightEndIndex = Math.min(lineIndex + linesPerSide, allLines.length);
            rightText = allLines.slice(lineIndex, rightEndIndex).join("\n");
            lineIndex = rightEndIndex;
          }
        }

        pages.push({ left: leftText, right: rightText });
        safetyCounter++;
      }

      // 선택지 처리 - 문장이 끝나는 위치에 따라 왼쪽 또는 오른쪽에 표시
      if (choices.length > 0 && pages.length > 0) {
        const lastPage = pages[pages.length - 1];
        // 마지막 페이지의 오른쪽이 비어있으면 왼쪽에 선택지 표시
        if (!lastPage.right || lastPage.right.trim() === "") {
          lastPage.showChoiceOnLeft = true;
        } else {
          // 오른쪽에 텍스트가 있으면 오른쪽 텍스트 아래에 선택지 표시
          lastPage.showChoiceOnRight = true;
        }
      }

      return pages;
    };

    const pages = splitTextIntoPages();
    const totalPages = pages.length;
    const safeCurrentPage = Math.min(currentPage, totalPages - 1);
    const currentPageData = pages[safeCurrentPage] || { left: "", right: "" };
    const isFirstPage = safeCurrentPage === 0;
    const showChoiceOnLeft = currentPageData.showChoiceOnLeft === true;
    const showChoiceOnRight = currentPageData.showChoiceOnRight === true;

    const goToPrevPage = () => {
      if (currentPage > 0) {
        const newPage = currentPage - 1;
        setCurrentPage(newPage);
        onPageChange?.(newPage, totalPages);
      }
    };

    const goToNextPage = () => {
      if (currentPage < totalPages - 1) {
        const newPage = currentPage + 1;
        setCurrentPage(newPage);
        onPageChange?.(newPage, totalPages);
      }
    };

    return (
      <div className={`${theme.bg} ${theme.text} ${fontFamily} rounded-lg shadow-xl max-w-8xl w-full relative h-[calc(100vh-2rem)] overflow-hidden`}>
        {/* 좌우 페이지 넘김 버튼 */}
        <button onClick={goToPrevPage} className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center transition text-7xl rounded-full ${currentPage === 0 ? "text-gray-600" : "text-gray-500 hover:text-gray-100 "}`}>
          ‹
        </button>
        <button onClick={goToNextPage} className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center transition text-7xl rounded-full ${currentPage >= totalPages - 1 ? "text-gray-600" : "text-gray-500 hover:text-gray-100 "}`}>
          ›
        </button>

        {/* 2열 책 페이지 레이아웃 */}
        <div className={`flex h-full ${margin} ml-12 mr-12 mt-12 relative`}>
          {/* 왼쪽 페이지 */}
          <div className={`flex-1 pr-6 pl-6`}>
            {/* 첫 페이지: 이미지 ON이면 제목+이미지만 */}
            {isFirstPage && viewerSettings.showImage ? (
              <div className="flex flex-col h-full">
                {viewerSettings.showTitle !== false && <h2 className="text-3xl font-bold text-center">{stageMeta.title}</h2>}
                <div className="flex-1 flex items-start justify-center pt-4">{stageMeta.image_url && <Image src={stageMeta.image_url} alt={stageMeta.title || "Stage image"} width={500} height={500} className="rounded-lg shadow-lg" style={{ width: "auto", height: "auto", maxHeight: "calc(100vh - 200px)" }} priority />}</div>
              </div>
            ) : (
              <>
                {isFirstPage && viewerSettings.showTitle !== false && <h2 className="text-3xl font-bold mb-4">{stageMeta.title}</h2>}
                <div className={`${fontSize} ${lineHeight} whitespace-pre-wrap`}>{currentPageData.left}</div>
                {/* 왼쪽 페이지에 선택지 보기 버튼 (문장이 왼쪽에서 끝났을 때) */}
                {showChoiceOnLeft && choices.length > 0 && !showChoices && (
                  <button onClick={() => setShowChoices(true)} className="mt-6 text-sm text-amber-400 hover:text-amber-200 transition">
                    ▼ 선택지 보기
                  </button>
                )}
                {/* 왼쪽 페이지에 선택지 표시 */}
                {showChoiceOnLeft && choices.length > 0 && showChoices && (
                  <div className="mt-6">
                    {/* 투표 중 안내 */}
                    {choices.some((item) => item.isVotingChoice) && (
                      <div className="mb-4 p-3  border  rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-400">
                          <span>🗳️</span>
                          <span className="text-sm font-medium">이 선택지들은 DAO 투표 대상입니다!</span>
                          <Link href="/voting" className="ml-auto text-xs text-yellow-500 hover:text-yellow-300 underline">
                            투표하러 가기 →
                          </Link>
                        </div>
                      </div>
                    )}
                    <ul className="space-y-4">
                      {choices.map((item) => {
                        const isItemDisabled = item.isDisabledByVote || disabled;
                        return (
                          <li key={item.id}>
                            <button onClick={() => !isItemDisabled && onChoiceClick?.(item.value, item.choice)} disabled={isItemDisabled} className={`text-left text-xl font-bold transition duration-200 ease-in-out ${isItemDisabled ? "text-gray-500 cursor-not-allowed line-through opacity-50" : "text-amber-400 hover:text-amber-200"}`} title={disabled ? "부활 처리 중입니다..." : item.isDisabledByVote ? "투표에서 선택되지 않은 선택지입니다" : item.isVotingChoice ? "DAO 투표 대상 선택지입니다" : ""}>
                              &gt; {item.choice}
                              {item.isVotingChoice && !item.isDisabledByVote && <span className="ml-2 text-xs text-yellow-600">🗳️</span>}
                              {item.isDisabledByVote && <span className="ml-2 text-xs text-gray-600">(투표 미선택)</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 중앙 분리선 */}
          <div className="relative flex flex-col items-center">
            <div className={`w-px h-full ${viewerSettings.theme === "light" ? "bg-gray-300" : viewerSettings.theme === "sepia" ? "bg-amber-300" : "bg-gray-600"}`} />
          </div>

          {/* 오른쪽 페이지 */}
          <div className={`flex-1 pl-6 pr-6 flex flex-col`}>
            {/* 첫 페이지 + 이미지 ON: 텍스트 + 선택지 (이미지 ON일 때는 텍스트가 오른쪽에만 있으므로 showChoiceOnLeft도 오른쪽에 표시) */}
            {isFirstPage && viewerSettings.showImage ? (
              <>
                <div className={`${fontSize} ${lineHeight} whitespace-pre-wrap`}>{currentPageData.left}</div>
                {/* 이미지 ON일 때 선택지 보기 버튼 (showChoiceOnLeft 또는 showChoiceOnRight) */}
                {(showChoiceOnLeft || showChoiceOnRight) && choices.length > 0 && !showChoices && (
                  <button onClick={() => setShowChoices(true)} className="mt-6 text-sm text-amber-400 hover:text-amber-200 transition">
                    ▼ 선택지 보기
                  </button>
                )}
                {/* 이미지 ON일 때 선택지 표시 */}
                {(showChoiceOnLeft || showChoiceOnRight) && choices.length > 0 && showChoices && (
                  <div className="mt-6">
                    {/* 투표 중 안내 */}
                    {choices.some((item) => item.isVotingChoice) && (
                      <div className="mb-4 p-3 border border-yellow-600/50 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-400">
                          <span>🗳️</span>
                          <span className="text-sm font-medium">이 선택지들은 DAO 투표 대상입니다!</span>
                          <Link href="/voting" className="ml-auto text-xs text-yellow-500 hover:text-yellow-300 underline">
                            투표하러 가기 →
                          </Link>
                        </div>
                      </div>
                    )}
                    <ul className="space-y-4">
                      {choices.map((item) => {
                        const isItemDisabled = item.isDisabledByVote || disabled;
                        return (
                          <li key={item.id}>
                            <button onClick={() => !isItemDisabled && onChoiceClick?.(item.value, item.choice)} disabled={isItemDisabled} className={`text-left text-xl font-bold transition duration-200 ease-in-out ${isItemDisabled ? "text-gray-500 cursor-not-allowed line-through opacity-50" : "text-amber-400 hover:text-amber-200"}`} title={disabled ? "부활 처리 중입니다..." : item.isDisabledByVote ? "투표에서 선택되지 않은 선택지입니다" : item.isVotingChoice ? "DAO 투표 대상 선택지입니다" : ""}>
                              &gt; {item.choice}
                              {item.isVotingChoice && !item.isDisabledByVote && <span className="ml-2 text-xs text-yellow-600">🗳️</span>}
                              {item.isDisabledByVote && <span className="ml-2 text-xs text-gray-600">(투표 미선택)</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* 첫 페이지 + 이미지 OFF: 제목 높이만큼 여백 추가 */}
                {isFirstPage && !viewerSettings.showImage && (
                  <h2 className="text-3xl font-bold mb-4 invisible" aria-hidden="true">
                    {stageMeta.title}
                  </h2>
                )}

                {/* 오른쪽 본문 */}
                <div className={`${fontSize} ${lineHeight} whitespace-pre-wrap`}>{currentPageData.right}</div>

                {/* 오른쪽 페이지에 선택지 보기 버튼 (문장이 오른쪽에서 끝났을 때) */}
                {showChoiceOnRight && choices.length > 0 && !showChoices && (
                  <button onClick={() => setShowChoices(true)} className="mt-6 text-sm text-amber-400 hover:text-amber-200 transition text-left">
                    ▼ 선택지 보기
                  </button>
                )}
                {/* 오른쪽 페이지에 선택지 표시 */}
                {showChoiceOnRight && choices.length > 0 && showChoices && (
                  <div className="mt-6">
                    {/* 투표 중 안내 */}
                    {choices.some((item) => item.isVotingChoice) && (
                      <div className="mb-4 p-3  border border-yellow-600/50 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-400">
                          <span>🗳️</span>
                          <span className="text-sm font-medium">이 선택지들은 DAO 투표 대상입니다!</span>
                          <Link href="/voting" className="ml-auto text-xs text-yellow-500 hover:text-yellow-300 underline">
                            투표하러 가기 →
                          </Link>
                        </div>
                      </div>
                    )}
                    <ul className="space-y-4">
                      {choices.map((item) => {
                        const isItemDisabled = item.isDisabledByVote || disabled;
                        return (
                          <li key={item.id}>
                            <button onClick={() => !isItemDisabled && onChoiceClick?.(item.value, item.choice)} disabled={isItemDisabled} className={`text-left text-xl font-bold transition duration-200 ease-in-out ${isItemDisabled ? "text-gray-500 cursor-not-allowed line-through opacity-50" : "text-amber-400 hover:text-amber-200"}`} title={disabled ? "부활 처리 중입니다..." : item.isDisabledByVote ? "투표에서 선택되지 않은 선택지입니다" : item.isVotingChoice ? "DAO 투표 대상 선택지입니다" : ""}>
                              &gt; {item.choice}
                              {item.isVotingChoice && !item.isDisabledByVote && <span className="ml-2 text-xs text-yellow-600">🗳️</span>}
                              {item.isDisabledByVote && <span className="ml-2 text-xs text-gray-600">(투표 미선택)</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 페이지 표시 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <span className="text-sm text-gray-500">
            {safeCurrentPage + 1} {totalPages}
          </span>
        </div>
      </div>
    );
  }

  // 스크롤 뷰어 (1열 스크롤 형식)
  if (viewerSettings.textLayout === "scroll") {
    return (
      <div className={`${theme.bg} ${theme.text} ${fontFamily} rounded-lg shadow-xl max-w-3xl mt-12 mb-10 w-full relative`}>
        {/* 좌우 페이지 이동 버튼 (이전/다음 스테이지용) */}
        <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-10 w-12 h-24 flex items-center justify-center text-gray-400 hover:text-gray-600 transition text-3xl">‹</button>
        <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full z-10 w-12 h-24 flex items-center justify-center text-gray-400 hover:text-gray-600 transition text-3xl">›</button>

        {/* 스크롤 가능한 콘텐츠 영역 */}
        <div ref={scrollContainerRef} className={`max-h-[75vh] overflow-y-auto ${margin} py-8 hide-scrollbar`}>
          {/* 제목 */}
          <h2 className="text-3xl font-bold mb-2">{stageMeta.title}</h2>
          <p className="text-sm text-gray-500 mb-6 border-b pb-4 border-current opacity-30">{new Date().toLocaleDateString("ko-KR")}</p>

          {/* 이미지 */}
          {viewerSettings.showImage && stageMeta.image_url && (
            <div className="mb-6">
              <Image src={stageMeta.image_url} alt={stageMeta.title || "Stage image"} width={400} height={400} className="rounded-lg shadow-lg mx-auto" style={{ width: "auto", height: "auto" }} priority />
            </div>
          )}

          {/* 본문 텍스트 */}
          <div className={`${fontSize} ${lineHeight} whitespace-pre-wrap`}>{stageMeta.description}</div>
        </div>

        {/* TOP 버튼 */}
        {showScrollTop && (
          <button onClick={scrollToTop} className="absolute bottom-4 right-4 w-12 h-12 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded flex flex-col items-center justify-center text-xs font-medium transition shadow-lg">
            <span className="text-lg">^</span>
            TOP
          </button>
        )}
      </div>
    );
  }

  // 기본 레이아웃 (single - 기존 방식)
  return (
    <div className={`${theme.bg} ${theme.text} ${fontFamily} ${margin} rounded-lg p-4 flex flex-col items-center`}>
      {viewerSettings.showTitle !== false && <h2 className="mt-6 mb-2 text-4xl font-bold text-center max-w-prose">{stageMeta.title}</h2>}
      {viewerSettings.showImage && stageMeta.image_url && <Image src={stageMeta.image_url} alt={stageMeta.title || "Stage image"} width={320} height={320} className="mb-4 rounded-lg shadow-lg" style={{ width: "auto", height: "auto" }} priority />}
      <p className={`mt-2 mb-6 ${fontSize} ${lineHeight} text-left shadow max-w-prose whitespace-pre-wrap`}>{stageMeta.description}</p>
    </div>
  );
};
