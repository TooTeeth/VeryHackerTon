"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Character, ChoiceHistoryItem, BattleMode } from "../../types/vygddrasil.types";
import { fetchUserNFTs, NFTContract } from "../../services/nftService";
import { getSupabaseClient } from "../../lib/supabaseClient";
const supabase = getSupabaseClient();
import { VygddrasilService } from "../../services/vygddrasil.service";
import { AchievementSection } from "./AchievementSection";
import { DailyQuestSection } from "./DailyQuestSection";
import { RankingSection } from "./RankingSection";
import { StatisticsModal } from "./StatisticsModal";
import { NotificationCenter } from "./NotificationCenter";

// NFT 컨트랙트 주소 설정
const NFT_CONTRACTS: NFTContract[] = [{ address: "0x1c1852ff164e169ffe759075384060bd26183724", type: "ERC1155" }];

// 장착 가능한 카테고리 슬롯 (전체 제외)
const EQUIP_SLOTS = ["무기", "신발", "장갑", "바지", "상의", "망토", "투구", "장신구", "칭호", "스킬"] as const;
type EquipSlot = (typeof EQUIP_SLOTS)[number];

// 필터용 카테고리 (전체 포함)
const CATEGORIES = ["전체", ...EQUIP_SLOTS] as const;
type Category = (typeof CATEGORIES)[number];

// 뷰어 설정 타입
export interface ViewerSettings {
  showImage: boolean;
  showTitle: boolean;
  textLayout: "single" | "page" | "scroll"; // 기본 / 페이지 플립 / 스크롤
  theme: "light" | "dark" | "sepia" | "darkSepia" | "black";
  fontFamily: "gothic" | "myeongjo" | "malgungothic";
  fontSize: number; // 1-7
  lineHeight: number; // 1-5
  margin: number; // 1-5
  showPageList: boolean;
  // 전투 설정
  battleMode: BattleMode;
  battleSpeed: "slow" | "normal" | "fast";
  showBattleAnimations: boolean;
  // 사운드 설정
  bgmVolume: number; // 0-100
  sfxVolume: number; // 0-100
  isMuted: boolean;
}

export const defaultViewerSettings: ViewerSettings = {
  showImage: true,
  showTitle: true,
  textLayout: "single",
  theme: "light",
  fontFamily: "gothic",
  fontSize: 4,
  lineHeight: 2,
  margin: 1,
  showPageList: true,
  // 전투 설정 기본값
  battleMode: "auto",
  battleSpeed: "normal",
  showBattleAnimations: true,
  // 사운드 설정 기본값
  bgmVolume: 50,
  sfxVolume: 50,
  isMuted: false,
};

interface GameSidebarProps {
  characterId: number;
  onSave: () => void;
  onToggleAutoSave: () => void;
  autoSaveEnabled: boolean;
  autoSaveToastEnabled?: boolean;
  onToggleAutoSaveToast?: () => void;
  onPreviousStage: () => void;
  canGoBack: boolean;
  onReset: () => void;
  onResetToStage2?: () => void;
  onGoToFirstPage?: () => void;
  lastSaved: Date | null;
  currentStage: string;
  visitedStagesCount: number;
  choiceCount: number;
  recentChoices?: ChoiceHistoryItem[];
  viewerSettings?: ViewerSettings;
  onViewerSettingsChange?: (settings: ViewerSettings) => void;
  isPipWindow?: boolean;
  goldRefreshTrigger?: number; // 골드 갱신 트리거 (값이 변경되면 골드 다시 로드)
}

interface NFTItem {
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  category: string;
  bonus_str: number;
  bonus_agi: number;
  bonus_int: number;
  bonus_hp: number;
  bonus_mp: number;
  bonus_luck: number;
}

// 도감 아이템 타입
interface CollectionItem {
  id: number;
  category: string;
  name: string;
  description: string;
  image_url: string;
  nft_contract_address: string;
  nft_token_id: string;
}

// 카테고리별 장착 NFT 타입
type EquippedNFTs = Partial<Record<EquipSlot, NFTItem>>;

// 슬롯 아이콘
const SLOT_ICONS: Record<EquipSlot, string> = {
  무기: "⚔️",
  신발: "👟",
  장갑: "🧤",
  바지: "👖",
  상의: "👕",
  망토: "🧥",
  투구: "⛑️",
  장신구: "💍",
  칭호: "🏅",
  스킬: "📜",
};

const classNames: Record<string, string> = {
  assassin: "Assassin",
  archer: "Archer",
  bard: "Bard",
  magician: "Magician",
  warrior: "Warrior",
};

// Description에서 스텟 파싱 (예: "All stats + 10", "STR + 5", "HP + 100")
const parseStatsFromDescription = (description: string): { str: number; agi: number; int: number; hp: number; mp: number; luck: number } => {
  const stats = { str: 0, agi: 0, int: 0, hp: 0, mp: 0, luck: 0 };

  if (!description) return stats;

  const lowerDesc = description.toLowerCase();

  // "All stats + X" 패턴
  const allStatsMatch = lowerDesc.match(/all\s*stats?\s*\+\s*(\d+)/i);
  if (allStatsMatch) {
    const value = parseInt(allStatsMatch[1], 10);
    return { str: value, agi: value, int: value, hp: value, mp: value, luck: value };
  }

  // 개별 스텟 패턴 (예: "STR + 5", "HP +100")
  const patterns: { key: keyof typeof stats; regex: RegExp }[] = [
    { key: "str", regex: /str\s*\+\s*(\d+)/i },
    { key: "agi", regex: /agi\s*\+\s*(\d+)/i },
    { key: "int", regex: /int\s*\+\s*(\d+)/i },
    { key: "hp", regex: /hp\s*\+\s*(\d+)/i },
    { key: "mp", regex: /mp\s*\+\s*(\d+)/i },
    { key: "luck", regex: /luck\s*\+\s*(\d+)/i },
  ];

  patterns.forEach(({ key, regex }) => {
    const match = description.match(regex);
    if (match) {
      stats[key] = parseInt(match[1], 10);
    }
  });

  return stats;
};

export const GameSidebar: React.FC<GameSidebarProps> = ({ characterId, onSave, onToggleAutoSave, autoSaveEnabled, autoSaveToastEnabled = true, onToggleAutoSaveToast, onPreviousStage, canGoBack, onReset, onResetToStage2, onGoToFirstPage, lastSaved, currentStage, visitedStagesCount, choiceCount, recentChoices = [], viewerSettings = defaultViewerSettings, onViewerSettingsChange, isPipWindow = false, goldRefreshTrigger }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [position, setPosition] = useState<"left" | "right">(() => {
    // 초기값: localStorage에서 불러오기
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vygddrasil_sidebar_position");
      if (saved === "left" || saved === "right") return saved;
    }
    return "left";
  });
  const [character, setCharacter] = useState<Character | null>(null);
  const [showNFTPanel, setShowNFTPanel] = useState(false);
  const [userNFTs, setUserNFTs] = useState<NFTItem[]>([]);
  const [equippedNFTs, setEquippedNFTs] = useState<EquippedNFTs>({}); // 카테고리별 장착
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [selectedNFT, setSelectedNFT] = useState<NFTItem | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot | null>(null); // 장착할 슬롯 선택
  const [showViewerSettings, setShowViewerSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCollectionPanel, setShowCollectionPanel] = useState(false);
  const [collectionCategory, setCollectionCategory] = useState<"몬스터" | "아이템" | "칭호" | "스킬">("몬스터");
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [selectedCollectionItem, setSelectedCollectionItem] = useState<CollectionItem | null>(null);
  const [characterNFTs, setCharacterNFTs] = useState<{ contractAddress: string; tokenId: string }[]>([]);

  // Gold & VTDN 상태
  const [characterGold, setCharacterGold] = useState<number>(0);
  const [vtdnBalance, setVtdnBalance] = useState<number>(0);

  // 통계 모달 상태
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  // 섹션 접기/펼치기 상태
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    character: true,
    equipment: false,
    progress: false,
    achievements: false,
    dailyQuests: false,
    ranking: false,
    notifications: false,
    viewer: false,
    battle: false,
    save: false,
    collection: false,
    sound: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // 전체화면 토글
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 전체화면 상태 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // 뷰어 설정 변경 핸들러
  const updateViewerSetting = <K extends keyof ViewerSettings>(key: K, value: ViewerSettings[K]) => {
    if (onViewerSettingsChange) {
      onViewerSettingsChange({ ...viewerSettings, [key]: value });
    }
  };

  // 총 보너스 스텟 계산
  const calculateTotalBonus = () => {
    const total = { str: 0, agi: 0, int: 0, hp: 0, mp: 0, luck: 0 };
    Object.values(equippedNFTs).forEach((nft) => {
      if (nft) {
        total.str += nft.bonus_str;
        total.agi += nft.bonus_agi;
        total.int += nft.bonus_int;
        total.hp += nft.bonus_hp;
        total.mp += nft.bonus_mp;
        total.luck += nft.bonus_luck;
      }
    });
    return total;
  };

  // Load character data and equipped NFTs
  useEffect(() => {
    const loadCharacter = async () => {
      const { data, error } = await supabase.from("vygddrasilclass").select("*").eq("id", characterId).single();

      if (!error && data) {
        setCharacter(data as Character);
        // Gold 설정
        setCharacterGold(data.gold || 0);
        // JSON으로 저장된 장착 NFT 목록 로드
        if (data.equipped_nfts) {
          try {
            const parsed = typeof data.equipped_nfts === "string" ? JSON.parse(data.equipped_nfts) : data.equipped_nfts;
            setEquippedNFTs(parsed as EquippedNFTs);
          } catch {
            setEquippedNFTs({});
          }
        }
      }
    };
    loadCharacter();
  }, [characterId, goldRefreshTrigger]); // goldRefreshTrigger 변경 시 골드 다시 로드

  // Load VTDN balance (user 기반)
  useEffect(() => {
    const loadVtdnBalance = async () => {
      if (!character?.wallet_address) return;

      // Users 테이블에서 user_id 조회
      const { data: userData } = await supabase
        .from("Users")
        .select("id")
        .eq("wallet_address", character.wallet_address)
        .single();

      if (userData?.id) {
        const { data: vtdnData } = await supabase
          .from("vtdn")
          .select("vtdn_balance")
          .eq("user_id", userData.id)
          .single();

        if (vtdnData) {
          setVtdnBalance(parseFloat(vtdnData.vtdn_balance) || 0);
        }
      }
    };
    loadVtdnBalance();
  }, [character?.wallet_address]);

  // Load user's NFTs from blockchain
  useEffect(() => {
    const loadUserNFTs = async () => {
      if (!character?.wallet_address) return;

      setIsLoadingNFTs(true);
      try {
        const nfts = await fetchUserNFTs(character.wallet_address, NFT_CONTRACTS);
        const nftsWithBonus: NFTItem[] = nfts.map((nft) => {
          const description = nft.metadata?.description || "";
          const parsedStats = parseStatsFromDescription(description);

          return {
            tokenId: nft.tokenId,
            contractAddress: nft.contractAddress,
            name: nft.name,
            description: description,
            image: nft.image,
            category: nft.metadata?.category || "칭호",
            bonus_str: parsedStats.str,
            bonus_agi: parsedStats.agi,
            bonus_int: parsedStats.int,
            bonus_hp: parsedStats.hp,
            bonus_mp: parsedStats.mp,
            bonus_luck: parsedStats.luck,
          };
        });
        setUserNFTs(nftsWithBonus);
      } catch (error) {
        console.error("Error loading NFTs:", error);
      } finally {
        setIsLoadingNFTs(false);
      }
    };
    loadUserNFTs();
  }, [character?.wallet_address]);

  // Filtered NFTs by category
  const filteredNFTs = selectedCategory === "전체" ? userNFTs : userNFTs.filter((nft) => nft.category === selectedCategory);

  // 도감 아이템 로드
  useEffect(() => {
    const loadCollectionItems = async () => {
      const { data, error } = await supabase.from("collection_items").select("*").order("id");
      if (!error && data) {
        setCollectionItems(data as CollectionItem[]);
      }
    };
    loadCollectionItems();
  }, []);

  // 캐릭터별 획득 NFT 목록 로드
  useEffect(() => {
    const loadCharacterNFTs = async () => {
      const nfts = await VygddrasilService.getCharacterNFTs(characterId);
      setCharacterNFTs(nfts);
    };
    loadCharacterNFTs();
  }, [characterId]);

  // NFT 수집 여부 확인 (캐릭터가 획득한 NFT 목록 기준)
  const isCollected = (item: CollectionItem) => {
    // 캐릭터별 획득 NFT 목록에서 확인 (지갑 전체가 아닌 해당 캐릭터만)
    return characterNFTs.some((nft) => nft.contractAddress.toLowerCase() === item.nft_contract_address?.toLowerCase() && nft.tokenId === item.nft_token_id);
  };

  // 카테고리별 도감 아이템 필터
  const getCollectionByCategory = (category: string) => {
    if (category === "아이템") {
      return collectionItems.filter((item) => ["무기", "신발", "장갑", "바지", "상의", "망토", "투구", "장신구"].includes(item.category));
    }
    return collectionItems.filter((item) => item.category === category);
  };

  // NFT가 어느 슬롯에든 장착되어 있는지 확인
  const isNFTEquipped = (nft: NFTItem) => {
    return Object.values(equippedNFTs).some((equipped) => equipped?.tokenId === nft.tokenId);
  };

  // 슬롯에 장착된 NFT 가져오기
  const getEquippedInSlot = (slot: EquipSlot) => equippedNFTs[slot];

  // Equip NFT (NFT 카테고리에 맞는 슬롯에만 장착 가능)
  const handleEquipNFT = async (nft: NFTItem) => {
    if (!character) return;

    // NFT 카테고리가 유효한 슬롯인지 확인
    const slot = nft.category as EquipSlot;
    if (!EQUIP_SLOTS.includes(slot)) {
      console.error("Invalid category for equip:", nft.category);
      return;
    }

    const newEquippedNFTs = { ...equippedNFTs, [slot]: nft };
    const totalBonus = { str: 0, agi: 0, int: 0, hp: 0, mp: 0, luck: 0 };
    Object.values(newEquippedNFTs).forEach((equipped) => {
      if (equipped) {
        totalBonus.str += equipped.bonus_str;
        totalBonus.agi += equipped.bonus_agi;
        totalBonus.int += equipped.bonus_int;
        totalBonus.hp += equipped.bonus_hp;
        totalBonus.mp += equipped.bonus_mp;
        totalBonus.luck += equipped.bonus_luck;
      }
    });

    const { error } = await supabase
      .from("vygddrasilclass")
      .update({
        equipped_nfts: JSON.stringify(newEquippedNFTs),
        bonus_str: totalBonus.str,
        bonus_agi: totalBonus.agi,
        bonus_int: totalBonus.int,
        bonus_hp: totalBonus.hp,
        bonus_mp: totalBonus.mp,
        bonus_luck: totalBonus.luck,
        updated_at: new Date().toISOString(),
      })
      .eq("id", characterId);

    if (!error) {
      setEquippedNFTs(newEquippedNFTs);
      setCharacter((prev) =>
        prev
          ? {
              ...prev,
              bonus_str: totalBonus.str,
              bonus_agi: totalBonus.agi,
              bonus_int: totalBonus.int,
              bonus_hp: totalBonus.hp,
              bonus_mp: totalBonus.mp,
              bonus_luck: totalBonus.luck,
            }
          : null
      );
      setSelectedNFT(null);
      setSelectedSlot(null);
      setShowNFTPanel(false);
    }
  };

  // Unequip NFT from specific slot
  const handleUnequipNFT = async (slot: EquipSlot) => {
    if (!character) return;

    const newEquippedNFTs = { ...equippedNFTs };
    delete newEquippedNFTs[slot];

    const totalBonus = { str: 0, agi: 0, int: 0, hp: 0, mp: 0, luck: 0 };
    Object.values(newEquippedNFTs).forEach((equipped) => {
      if (equipped) {
        totalBonus.str += equipped.bonus_str;
        totalBonus.agi += equipped.bonus_agi;
        totalBonus.int += equipped.bonus_int;
        totalBonus.hp += equipped.bonus_hp;
        totalBonus.mp += equipped.bonus_mp;
        totalBonus.luck += equipped.bonus_luck;
      }
    });

    const { error } = await supabase
      .from("vygddrasilclass")
      .update({
        equipped_nfts: JSON.stringify(newEquippedNFTs),
        bonus_str: totalBonus.str,
        bonus_agi: totalBonus.agi,
        bonus_int: totalBonus.int,
        bonus_hp: totalBonus.hp,
        bonus_mp: totalBonus.mp,
        bonus_luck: totalBonus.luck,
        updated_at: new Date().toISOString(),
      })
      .eq("id", characterId);

    if (!error) {
      setEquippedNFTs(newEquippedNFTs);
      setCharacter((prev) =>
        prev
          ? {
              ...prev,
              bonus_str: totalBonus.str,
              bonus_agi: totalBonus.agi,
              bonus_int: totalBonus.int,
              bonus_hp: totalBonus.hp,
              bonus_mp: totalBonus.mp,
              bonus_luck: totalBonus.luck,
            }
          : null
      );
    }
  };

  // 장착된 NFT 개수
  const equippedCount = Object.keys(equippedNFTs).length;

  const togglePosition = () => {
    setPosition((prev) => {
      const newPosition = prev === "left" ? "right" : "left";
      localStorage.setItem("vygddrasil_sidebar_position", newPosition);
      return newPosition;
    });
  };

  // Check if NFT has any bonus stats
  const hasStats = (nft: NFTItem) => {
    return nft.bonus_str > 0 || nft.bonus_agi > 0 || nft.bonus_int > 0 || nft.bonus_hp > 0 || nft.bonus_mp > 0 || nft.bonus_luck > 0;
  };

  if (!character) return null;

  const totalBonus = calculateTotalBonus();

  return (
    <>
      {/* 사이드바 닫혔을 때 열기 버튼 - Claude.ai 스타일 햄버거 메뉴 */}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className={`fixed top-4 z-40 p-2 rounded-lg bg-white hover:bg-gray-100 border border-gray-300 shadow-sm transition ${position === "left" ? "left-3" : "right-3"}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <div className={`fixed top-0 h-full z-30 transition-transform duration-300 ${position === "left" ? "left-0" : "right-0"} ${isOpen ? "translate-x-0" : position === "left" ? "-translate-x-full" : "translate-x-full"}`}>
        <div className="relative h-full w-72 bg-black/80 backdrop-blur-md text-white overflow-y-auto hide-scrollbar">
          <div className="p-4 space-y-2">
            {/* 상단 컨트롤: 접기 아이콘 + 위치 토글 */}
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => setIsOpen(false)} className="p-2  hover:bg-gray-600 rounded-lg transition" title="사이드바 접기">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {position === "left" ? (
                    <>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </>
                  ) : (
                    <>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="15" y1="3" x2="15" y2="21" />
                    </>
                  )}
                </svg>
              </button>

              {/* 위치 토글 스위치 */}
              <div className="flex items-center gap-2">
                <button onClick={togglePosition} className={`w-10 h-5 rounded-full transition relative ${position === "right" ? "bg-purple-500" : "bg-gray-600"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${position === "right" ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>

            {/* Gold & VTDN 표시 */}
            <div className="bg-gray-800/50 rounded-lg px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">💰</span>
                <span className="text-sm font-bold text-yellow-400">{characterGold.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Image src="/VTDNLogo.png" alt="VTDN" width={20} height={20} className="rounded" />
                <span className="text-sm font-bold text-purple-400">{vtdnBalance.toLocaleString()}</span>
              </div>
            </div>

            {/* 캐릭터 + 스텟 섹션 */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection("character")} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span className="font-bold text-sm">{character.nickname}</span>
                  <span className="text-xs text-gray-400">({classNames[character.class]})</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${expandedSections.character ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.character && (
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-3 mb-3">
                    <Image src={`/Vygddrasilpage/character/${character.class}.jpg`} alt={character.class} width={60} height={60} className="rounded-lg object-cover" style={{ width: 60, height: 60 }} />
                    <div className="grid grid-cols-2 gap-1 text-sm flex-1">
                      <StatRow label="STR" base={character.str} bonus={totalBonus.str} />
                      <StatRow label="AGI" base={character.agi} bonus={totalBonus.agi} />
                      <StatRow label="INT" base={character.int} bonus={totalBonus.int} />
                      <StatRow label="HP" base={character.hp} bonus={totalBonus.hp} />
                      <StatRow label="MP" base={character.mp} bonus={totalBonus.mp} />
                      <StatRow label="LUCK" base={character.luck} bonus={totalBonus.luck} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 장착 아이템 섹션 */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection("equipment")} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-2">
                  <span>🎒</span>
                  <span className="font-bold text-sm">장착 아이템</span>
                  <span className="text-xs text-purple-400">
                    ({equippedCount}/{EQUIP_SLOTS.length})
                  </span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${expandedSections.equipment ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.equipment && (
                <div className="px-3 pb-3">
                  <div className="flex items-center justify-end mb-2">
                    <button
                      onClick={() => {
                        setSelectedSlot(null);
                        setSelectedCategory("전체");
                        setShowNFTPanel(true);
                      }}
                      className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded transition text-xs flex items-center gap-1"
                      title="인벤토리"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      인벤토리
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {EQUIP_SLOTS.map((slot) => {
                      const equipped = getEquippedInSlot(slot);
                      return (
                        <button
                          key={slot}
                          onClick={() => {
                            if (equipped) {
                              setSelectedNFT(equipped);
                            } else {
                              setSelectedSlot(slot);
                              setSelectedCategory(slot);
                              setShowNFTPanel(true);
                            }
                          }}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition relative group ${equipped ? "bg-purple-600/30 border border-purple-500" : "bg-gray-700/50 border border-gray-600 hover:border-purple-400"}`}
                          title={slot}
                        >
                          {equipped ? (
                            <>
                              {equipped.image ? (
                                <div className="w-full h-full flex items-center justify-center overflow-hidden rounded">
                                  <Image src={equipped.image} alt={equipped.name} width={32} height={32} className="object-contain w-full h-full" unoptimized />
                                </div>
                              ) : (
                                <span className="text-lg">{SLOT_ICONS[slot]}</span>
                              )}
                              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition">
                                <span className="text-[10px] text-red-400">해제</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-500 text-lg">{SLOT_ICONS[slot]}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 진행 정보 섹션 */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection("progress")} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span className="font-bold text-sm">진행 정보</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${expandedSections.progress ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.progress && (
                <div className="px-3 pb-3 text-sm space-y-1">
                  <p>
                    현재 위치: <span className="text-purple-400">{currentStage}</span>
                  </p>
                  <RecentChoicesSection recentChoices={recentChoices} />
                  <p>
                    방문한 스테이지: <span className="text-blue-400">{visitedStagesCount}</span>
                  </p>
                  <p>
                    선택 횟수: <span className="text-green-400">{choiceCount}</span>
                  </p>
                </div>
              )}
            </div>

            {/* 업적 섹션 */}
            <AchievementSection
              characterId={characterId}
              isExpanded={expandedSections.achievements}
              onToggle={() => toggleSection("achievements")}
            />

            {/* 일일 퀘스트 섹션 */}
            <DailyQuestSection
              characterId={characterId}
              isExpanded={expandedSections.dailyQuests}
              onToggle={() => toggleSection("dailyQuests")}
            />

            {/* 랭킹 섹션 */}
            <RankingSection
              characterId={characterId}
              isExpanded={expandedSections.ranking}
              onToggle={() => toggleSection("ranking")}
            />

            {/* 알림 센터 섹션 */}
            <NotificationCenter
              characterId={characterId}
              isExpanded={expandedSections.notifications}
              onToggle={() => toggleSection("notifications")}
            />

            {/* 통계 버튼 */}
            <button
              onClick={() => setShowStatisticsModal(true)}
              className="w-full bg-gray-800/50 rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-gray-700/50 transition"
            >
              <span>📊</span>
              <span className="font-bold text-sm">통계 보기</span>
            </button>

            {/* 뷰어 설정 섹션 */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection("viewer")} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-2">
                  <span>📖</span>
                  <span className="font-bold text-sm">뷰어 설정</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${expandedSections.viewer ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.viewer && (
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button onClick={() => updateViewerSetting("showImage", !viewerSettings.showImage)} className={`px-2 py-2 rounded text-xs font-medium transition flex items-center justify-center gap-1 ${viewerSettings.showImage ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-600 hover:bg-gray-700"}`}>
                      🖼️ 이미지 {viewerSettings.showImage ? "ON" : "OFF"}
                    </button>
                    <button onClick={() => updateViewerSetting("showTitle", !viewerSettings.showTitle)} className={`px-2 py-2 rounded text-xs font-medium transition flex items-center justify-center gap-1 ${viewerSettings.showTitle ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-600 hover:bg-gray-700"}`}>
                      📝 제목 {viewerSettings.showTitle ? "ON" : "OFF"}
                    </button>
                    {isPipWindow ? (
                      <button
                        onClick={() => {
                          localStorage.setItem("vygddrasil_pip_active", "false");
                          window.close();
                        }}
                        className="px-2 py-2 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center gap-1"
                      >
                        🌐 웹모드
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const width = 800;
                          const height = 600;
                          const left = window.screenX + (window.outerWidth - width) / 2;
                          const top = window.screenY + (window.outerHeight - height) / 2;
                          window.open(window.location.href, "VygddrasilPIP", `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`);
                        }}
                        className="px-2 py-2 rounded text-xs font-medium bg-gray-600 hover:bg-gray-700 transition flex items-center justify-center gap-1"
                      >
                        🪟 PIP 새창
                      </button>
                    )}
                    <button onClick={toggleFullscreen} className={`px-2 py-2 rounded text-xs font-medium transition flex items-center justify-center gap-1 ${isFullscreen ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"}`}>
                      {isFullscreen ? "🔲 창모드" : "⛶ 전체화면"}
                    </button>
                    <button onClick={() => setShowViewerSettings(true)} className="px-2 py-2 rounded text-xs font-medium bg-gray-600 hover:bg-gray-700 transition flex items-center justify-center gap-1">
                      ⚙️ 상세설정
                    </button>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => updateViewerSetting("textLayout", "single")} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${viewerSettings.textLayout === "single" ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                      기본
                    </button>
                    <button onClick={() => updateViewerSetting("textLayout", "page")} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${viewerSettings.textLayout === "page" ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                      📖 페이지
                    </button>
                    <button onClick={() => updateViewerSetting("textLayout", "scroll")} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${viewerSettings.textLayout === "scroll" ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                      📜 스크롤
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 전투 설정 섹션 */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection("battle")} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-2">
                  <span>⚔️</span>
                  <span className="font-bold text-sm">전투 설정</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${expandedSections.battle ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.battle && (
                <div className="px-3 pb-3">
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1.5">전투 모드</p>
                    <div className="flex gap-1">
                      <button onClick={() => updateViewerSetting("battleMode", "turn-based")} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${viewerSettings.battleMode === "turn-based" ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                        턴제
                      </button>
                      <button onClick={() => updateViewerSetting("battleMode", "auto")} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${viewerSettings.battleMode === "auto" ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                        자동
                      </button>
                      <button onClick={() => updateViewerSetting("battleMode", "choice")} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${viewerSettings.battleMode === "choice" ? "bg-red-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                        선택지
                      </button>
                    </div>
                  </div>
                  {(viewerSettings.battleMode === "auto" || viewerSettings.battleMode === "turn-based") && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1.5">전투 속도</p>
                      <div className="flex gap-1">
                        <button onClick={() => updateViewerSetting("battleSpeed", "slow")} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${viewerSettings.battleSpeed === "slow" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                          느림
                        </button>
                        <button onClick={() => updateViewerSetting("battleSpeed", "normal")} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${viewerSettings.battleSpeed === "normal" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                          보통
                        </button>
                        <button onClick={() => updateViewerSetting("battleSpeed", "fast")} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${viewerSettings.battleSpeed === "fast" ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                          빠름
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white">애니메이션 간소화</span>
                    <button onClick={() => updateViewerSetting("showBattleAnimations", !viewerSettings.showBattleAnimations)} className={`w-10 h-5 rounded-full transition relative ${!viewerSettings.showBattleAnimations ? "bg-green-500" : "bg-gray-600"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${!viewerSettings.showBattleAnimations ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 저장 설정 섹션 */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection("save")} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-2">
                  <span>💾</span>
                  <span className="font-bold text-sm">저장 설정</span>
                  {lastSaved && <span className="text-[10px] text-gray-500">({lastSaved.toLocaleTimeString()})</span>}
                </div>
                <svg className={`w-4 h-4 transition-transform ${expandedSections.save ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.save && (
                <div className="px-3 pb-3 space-y-2">
                  <button onClick={onSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-bold">
                    💾 수동 저장
                  </button>
                  <button onClick={onToggleAutoSave} className={`w-full ${autoSaveEnabled ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white px-3 py-2 rounded text-sm font-bold`}>
                    {autoSaveEnabled ? "✓ 자동저장 ON" : "✗ 자동저장 OFF"}
                  </button>
                  {onToggleAutoSaveToast && (
                    <button onClick={onToggleAutoSaveToast} className={`w-full ${autoSaveToastEnabled ? "bg-teal-600 hover:bg-teal-700" : "bg-gray-600 hover:bg-gray-700"} text-white px-3 py-2 rounded text-sm font-bold`}>
                      {autoSaveToastEnabled ? "🔔 저장알림 ON" : "🔕 저장알림 OFF"}
                    </button>
                  )}
                  <button onClick={onPreviousStage} disabled={!canGoBack} className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm font-bold">
                    ← 이전 단계
                  </button>
                  <button onClick={onReset} className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-bold">
                    🔄 처음부터
                  </button>
                  {viewerSettings.textLayout === "page" && onGoToFirstPage && (
                    <button onClick={onGoToFirstPage} className="w-full bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-bold">
                      📖 첫 페이지
                    </button>
                  )}
                  {onResetToStage2 && (
                    <button onClick={onResetToStage2} className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-sm font-bold">
                      🔙 스토리 처음
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 도감 섹션 */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection("collection")} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-2">
                  <span>📖</span>
                  <span className="font-bold text-sm">도감</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${expandedSections.collection ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.collection && (
                <div className="px-3 pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setCollectionCategory("몬스터");
                        setShowCollectionPanel(true);
                      }}
                      className="py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition flex items-center justify-center gap-1"
                    >
                      👹 몬스터
                    </button>
                    <button
                      onClick={() => {
                        setCollectionCategory("아이템");
                        setShowCollectionPanel(true);
                      }}
                      className="py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition flex items-center justify-center gap-1"
                    >
                      🎁 아이템
                    </button>
                    <button
                      onClick={() => {
                        setCollectionCategory("칭호");
                        setShowCollectionPanel(true);
                      }}
                      className="py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition flex items-center justify-center gap-1"
                    >
                      🏅 칭호
                    </button>
                    <button
                      onClick={() => {
                        setCollectionCategory("스킬");
                        setShowCollectionPanel(true);
                      }}
                      className="py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium transition flex items-center justify-center gap-1"
                    >
                      ⚡ 스킬
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 사운드 설정 섹션 */}
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <button onClick={() => toggleSection("sound")} className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700/50 transition">
                <div className="flex items-center gap-2">
                  <span>{viewerSettings.isMuted ? "🔇" : "🔊"}</span>
                  <span className="font-bold text-sm">사운드 설정</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${expandedSections.sound ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.sound && (
                <div className="px-3 pb-3 space-y-3">
                  {/* 음소거 토글 */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">음소거</span>
                    <button onClick={() => updateViewerSetting("isMuted", !viewerSettings.isMuted)} className={`w-10 h-5 rounded-full transition relative ${viewerSettings.isMuted ? "bg-red-500" : "bg-green-500"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${viewerSettings.isMuted ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {/* 노래 정보 */}
                  <div className="border-t border-gray-700 pt-2">
                    <p className="text-xs text-gray-300 mb-1">The hill where the Wind Passes - UG</p>
                    <a href="https://www.instagram.com/chldydghks_/" target="_blank" rel="noopener noreferrer" className="inline-block hover:opacity-80 transition">
                      <Image src="/Vygddrasilpage/insta.png" alt="Instagram" width={20} height={20} className="rounded" />
                    </a>
                    <a href="https://youtu.be/0gYw-JQnO4s?si=oj2QouxtNL9rFD-f/" target="_blank" rel="noopener noreferrer" className="inline-block hover:opacity-80 transition ml-2">
                      <Image src="/Vygddrasilpage/youtube.png" alt="YouTube" width={20} height={20} className="rounded" />
                    </a>
                  </div>

                  {/* 볼륨 슬라이더 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">볼륨</span>
                      <span className="text-xs text-purple-400">{viewerSettings.bgmVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={viewerSettings.bgmVolume}
                      onChange={(e) => {
                        const vol = parseInt(e.target.value);
                        if (onViewerSettingsChange) {
                          onViewerSettingsChange({ ...viewerSettings, bgmVolume: vol, sfxVolume: vol });
                        }
                      }}
                      disabled={viewerSettings.isMuted}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* 프리셋 버튼 */}
                  <div className="flex gap-2">
                    <button onClick={() => updateViewerSetting("isMuted", !viewerSettings.isMuted)} className={`flex-1 py-1.5 rounded text-xs font-medium transition ${viewerSettings.isMuted ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"}`}>
                      {viewerSettings.isMuted ? "OFF" : "ON"}
                    </button>
                    <button
                      onClick={() => {
                        if (onViewerSettingsChange) {
                          onViewerSettingsChange({ ...viewerSettings, bgmVolume: 50, sfxVolume: 50, isMuted: false });
                        }
                      }}
                      className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => {
                        if (onViewerSettingsChange) {
                          onViewerSettingsChange({ ...viewerSettings, bgmVolume: 100, sfxVolume: 100, isMuted: false });
                        }
                      }}
                      className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs font-medium transition"
                    >
                      100%
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NFT Selection Panel */}
      {showNFTPanel && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white">인벤토리</h2>
                {selectedSlot && (
                  <p className="text-sm text-purple-400">
                    {SLOT_ICONS[selectedSlot]} {selectedSlot} 슬롯에 장착할 NFT 선택
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowNFTPanel(false);
                  setSelectedSlot(null);
                }}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Category Filter */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button key={category} onClick={() => setSelectedCategory(category)} className={`px-3 py-1 rounded-full text-xs font-medium transition ${selectedCategory === category ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* NFT Grid */}
            <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
              {isLoadingNFTs ? (
                <div className="text-gray-400 text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  NFT 불러오는 중...
                </div>
              ) : filteredNFTs.length === 0 ? (
                <p className="text-gray-400 text-center py-8">{selectedCategory === "전체" ? "보유한 NFT가 없습니다" : `${selectedCategory} 카테고리에 NFT가 없습니다`}</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredNFTs.map((nft) => {
                    const equipped = isNFTEquipped(nft);
                    // 슬롯 선택 상태에서는 해당 카테고리만 장착 가능
                    const canEquip = !selectedSlot || nft.category === selectedSlot;
                    return (
                      <button
                        key={`${nft.contractAddress}-${nft.tokenId}`}
                        onClick={() => {
                          // 항상 상세 모달을 먼저 보여줌
                          if (!selectedSlot || canEquip) {
                            setSelectedNFT(nft);
                          }
                        }}
                        disabled={selectedSlot !== null && !canEquip}
                        className={`bg-gray-800 p-2 rounded-lg transition relative ${equipped ? "ring-2 ring-purple-500" : ""} ${selectedSlot && !canEquip ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-700"}`}
                      >
                        {equipped && <div className="absolute top-1 right-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded">장착중</div>}
                        <div className="w-full aspect-square bg-gray-700 rounded mb-2 flex items-center justify-center overflow-hidden">{nft.image ? <Image src={nft.image} alt={nft.name} width={80} height={80} className="object-cover" style={{ width: "auto", height: "auto" }} unoptimized /> : <span className="text-3xl">🎖️</span>}</div>
                        <p className="text-white text-xs truncate">{nft.name}</p>
                        <p className="text-purple-400 text-[10px]">{nft.category}</p>
                        {hasStats(nft) && <p className="text-green-400 text-xs mt-0.5">스텟 보너스</p>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto hide-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">NFT 상세정보</h2>
              <button onClick={() => setSelectedNFT(null)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Image */}
              <div className="w-full aspect-square bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">{selectedNFT.image ? <Image src={selectedNFT.image} alt={selectedNFT.name} width={300} height={300} className="object-contain" style={{ width: "auto", height: "auto" }} unoptimized /> : <span className="text-6xl">🎖️</span>}</div>

              {/* Info */}
              <div className="space-y-3">
                <div>
                  <p className="text-xl font-bold text-white">{selectedNFT.name}</p>
                  <p className="text-sm text-gray-400">Token ID: {selectedNFT.tokenId}</p>
                  <p className="text-sm text-purple-400">{selectedNFT.category}</p>
                </div>

                {selectedNFT.description && (
                  <div>
                    <p className="text-sm text-gray-400">설명</p>
                    <p className="text-white">{selectedNFT.description}</p>
                  </div>
                )}

                {/* Stats */}
                {hasStats(selectedNFT) && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">보너스 스텟</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedNFT.bonus_str > 0 && <StatBadge label="STR" value={selectedNFT.bonus_str} />}
                      {selectedNFT.bonus_agi > 0 && <StatBadge label="AGI" value={selectedNFT.bonus_agi} />}
                      {selectedNFT.bonus_int > 0 && <StatBadge label="INT" value={selectedNFT.bonus_int} />}
                      {selectedNFT.bonus_hp > 0 && <StatBadge label="HP" value={selectedNFT.bonus_hp} />}
                      {selectedNFT.bonus_mp > 0 && <StatBadge label="MP" value={selectedNFT.bonus_mp} />}
                      {selectedNFT.bonus_luck > 0 && <StatBadge label="LUCK" value={selectedNFT.bonus_luck} />}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                {isNFTEquipped(selectedNFT) ? (
                  <button
                    onClick={() => {
                      // 어느 슬롯에 장착되어 있는지 찾기
                      const slot = Object.entries(equippedNFTs).find(([, nft]) => nft?.tokenId === selectedNFT.tokenId)?.[0] as EquipSlot | undefined;
                      if (slot) handleUnequipNFT(slot);
                      setSelectedNFT(null);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition"
                  >
                    장착 해제
                  </button>
                ) : (
                  <button onClick={() => handleEquipNFT(selectedNFT)} disabled={!EQUIP_SLOTS.includes(selectedNFT.category as EquipSlot)} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition">
                    {SLOT_ICONS[selectedNFT.category as EquipSlot] || "❓"} {selectedNFT.category} 슬롯에 장착
                  </button>
                )}
                <button onClick={() => setSelectedNFT(null)} className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold transition">
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Viewer Settings Modal */}
      {showViewerSettings && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-sm overflow-hidden max-h-[90vh] overflow-y-auto hide-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">뷰어 설정</h2>
              <button onClick={() => setShowViewerSettings(false)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* 열람 방식 */}
              <div>
                <p className="text-sm text-gray-400 mb-2">열람 방식</p>
                <div className="flex gap-2">
                  <button onClick={() => updateViewerSetting("textLayout", "single")} className={`flex-1 py-2 rounded text-sm font-medium transition ${viewerSettings.textLayout === "single" ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                    기본
                  </button>
                  <button onClick={() => updateViewerSetting("textLayout", "page")} className={`flex-1 py-2 rounded text-sm font-medium transition ${viewerSettings.textLayout === "page" ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                    📖 페이지
                  </button>
                  <button onClick={() => updateViewerSetting("textLayout", "scroll")} className={`flex-1 py-2 rounded text-sm font-medium transition ${viewerSettings.textLayout === "scroll" ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                    📜 스크롤
                  </button>
                </div>
              </div>

              {/* 테마 */}
              <div>
                <p className="text-sm text-gray-400 mb-2">테마</p>
                <div className="flex gap-2">
                  {[
                    { key: "light", color: "bg-white", border: "border-gray-300" },
                    { key: "sepia", color: "bg-amber-100", border: "border-amber-300" },
                    { key: "dark", color: "bg-gray-700", border: "border-gray-500" },
                    { key: "darkSepia", color: "bg-amber-900", border: "border-amber-700" },
                    { key: "black", color: "bg-black", border: "border-gray-600" },
                  ].map((t) => (
                    <button key={t.key} onClick={() => updateViewerSetting("theme", t.key as ViewerSettings["theme"])} className={`w-8 h-8 rounded-full border-2 transition ${t.color} ${viewerSettings.theme === t.key ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900" : t.border}`} />
                  ))}
                </div>
              </div>

              {/* 글꼴 */}
              <div>
                <p className="text-sm text-gray-400 mb-2">글꼴</p>
                <div className="flex gap-2">
                  {[
                    { key: "gothic", label: "고딕체" },
                    { key: "myeongjo", label: "명조체" },
                    { key: "malgungothic", label: "맑은고딕" },
                  ].map((f) => (
                    <button key={f.key} onClick={() => updateViewerSetting("fontFamily", f.key as ViewerSettings["fontFamily"])} className={`flex-1 py-2 rounded text-sm font-medium transition ${viewerSettings.fontFamily === f.key ? "bg-purple-600" : "bg-gray-700 hover:bg-gray-600"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 글자 크기 */}
              <div>
                <p className="text-sm text-gray-400 mb-2">글자 크기</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateViewerSetting("fontSize", Math.max(1, viewerSettings.fontSize - 1))} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded text-lg">
                    -
                  </button>
                  <span className="flex-1 text-center text-white font-bold">{viewerSettings.fontSize}</span>
                  <button onClick={() => updateViewerSetting("fontSize", Math.min(7, viewerSettings.fontSize + 1))} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded text-lg">
                    +
                  </button>
                </div>
              </div>

              {/* 줄 간격 */}
              <div>
                <p className="text-sm text-gray-400 mb-2">줄 간격</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateViewerSetting("lineHeight", Math.max(1, viewerSettings.lineHeight - 1))} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded text-lg">
                    -
                  </button>
                  <span className="flex-1 text-center text-white font-bold">{viewerSettings.lineHeight}</span>
                  <button onClick={() => updateViewerSetting("lineHeight", Math.min(5, viewerSettings.lineHeight + 1))} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded text-lg">
                    +
                  </button>
                </div>
              </div>

              {/* 마진 */}
              <div>
                <p className="text-sm text-gray-400 mb-2">마진</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateViewerSetting("margin", Math.max(1, viewerSettings.margin - 1))} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded text-lg">
                    -
                  </button>
                  <span className="flex-1 text-center text-white font-bold">{viewerSettings.margin}</span>
                  <button onClick={() => updateViewerSetting("margin", Math.min(5, viewerSettings.margin + 1))} className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded text-lg">
                    +
                  </button>
                </div>
              </div>

              {/* 설정 초기화 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <button onClick={() => onViewerSettingsChange && onViewerSettingsChange(defaultViewerSettings)} className="text-sm text-gray-400 hover:text-white transition">
                  보기 설정 초기화
                </button>
              </div>

              {/* 페이지 목록 넘기기 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white">페이지 목록 넘기기</span>
                <button onClick={() => updateViewerSetting("showPageList", !viewerSettings.showPageList)} className={`w-12 h-6 rounded-full transition relative ${viewerSettings.showPageList ? "bg-green-500" : "bg-gray-600"}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${viewerSettings.showPageList ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collection Panel (도감) */}
      {showCollectionPanel && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-bold text-white">📖 도감</h2>
                <p className="text-sm text-purple-400">수집한 {collectionCategory} 목록</p>
              </div>
              <button onClick={() => setShowCollectionPanel(false)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>

            {/* Category Tabs */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex gap-2">
                {(["몬스터", "아이템", "칭호", "스킬"] as const).map((cat) => (
                  <button key={cat} onClick={() => setCollectionCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition ${collectionCategory === cat ? "bg-purple-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
                    {cat === "몬스터" && "👹 "}
                    {cat === "아이템" && "🎁 "}
                    {cat === "칭호" && "🏅 "}
                    {cat === "스킬" && "⚡ "}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Collection Grid */}
            <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
              {(() => {
                const items = getCollectionByCategory(collectionCategory);
                const collectedCount = items.filter((item) => isCollected(item)).length;
                const categoryIcon = collectionCategory === "몬스터" ? "👹" : collectionCategory === "아이템" ? "🎁" : collectionCategory === "칭호" ? "🏅" : "⚡";

                return (
                  <>
                    {/* 수집 현황 */}
                    <div className="mb-4 text-center">
                      <span className="text-gray-400 text-sm">
                        수집: <span className="text-purple-400 font-bold">{collectedCount}</span> / {items.length}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-4xl mb-2">{categoryIcon}</p>
                        <p>등록된 {collectionCategory}이(가) 없습니다</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {items.map((item) => {
                          const collected = isCollected(item);
                          return (
                            <button key={item.id} onClick={() => setSelectedCollectionItem(item)} className={`bg-gray-800 p-2 rounded-lg transition hover:bg-gray-700 ${collected ? "ring-1 ring-purple-500" : ""}`}>
                              <div className="w-full aspect-square bg-gray-700 rounded mb-2 flex items-center justify-center overflow-hidden relative">
                                {collected ? (
                                  item.image_url ? (
                                    <Image src={item.image_url} alt={item.name} width={80} height={80} className="object-cover" style={{ width: "auto", height: "auto" }} unoptimized />
                                  ) : (
                                    <span className="text-3xl">{categoryIcon}</span>
                                  )
                                ) : (
                                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                    <span className="text-4xl text-gray-600">?</span>
                                  </div>
                                )}
                                {collected && (
                                  <div className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-[10px]">✓</span>
                                  </div>
                                )}
                              </div>
                              <p className={`text-xs truncate text-center ${collected ? "text-white" : "text-gray-500"}`}>{collected ? item.name : "???"}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Collection Detail Modal (도감 상세) */}
      {selectedCollectionItem && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto hide-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">도감 상세</h2>
              <button onClick={() => setSelectedCollectionItem(null)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {(() => {
                const collected = isCollected(selectedCollectionItem);
                const categoryIcon = selectedCollectionItem.category === "몬스터" ? "👹" : ["무기", "신발", "장갑", "바지", "상의", "망토", "투구", "장신구"].includes(selectedCollectionItem.category) ? "🎁" : selectedCollectionItem.category === "칭호" ? "🏅" : "⚡";

                return (
                  <>
                    {/* Image */}
                    <div className="w-full aspect-square bg-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                      {collected ? (
                        selectedCollectionItem.image_url ? (
                          <Image src={selectedCollectionItem.image_url} alt={selectedCollectionItem.name} width={300} height={300} className="object-contain" style={{ width: "auto", height: "auto" }} unoptimized />
                        ) : (
                          <span className="text-6xl">{categoryIcon}</span>
                        )
                      ) : (
                        <div className="text-center">
                          <span className="text-8xl text-gray-600">?</span>
                          <p className="text-gray-500 mt-2">미수집</p>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-xl font-bold text-white">{collected ? selectedCollectionItem.name : "???"}</p>
                        <p className="text-sm text-purple-400">{selectedCollectionItem.category}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-400">설명</p>
                        <p className="text-white">{collected ? selectedCollectionItem.description || "설명이 없습니다." : "수집하면 정보가 공개됩니다."}</p>
                      </div>

                      {collected && (
                        <div className="bg-purple-600/20 border border-purple-500 rounded-lg p-3 text-center">
                          <span className="text-purple-400 font-bold">✓ 수집 완료</span>
                        </div>
                      )}
                    </div>

                    {/* Close Button */}
                    <div className="mt-4">
                      <button onClick={() => setSelectedCollectionItem(null)} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-bold transition">
                        닫기
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 통계 모달 */}
      <StatisticsModal
        characterId={characterId}
        isOpen={showStatisticsModal}
        onClose={() => setShowStatisticsModal(false)}
      />
    </>
  );
};

// Stat Row Component
const StatRow: React.FC<{ label: string; base: number; bonus?: number }> = ({ label, base, bonus }) => {
  const total = base + (bonus || 0);
  const hasBonus = bonus && bonus > 0;

  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span>
        {total}
        {hasBonus && <span className="text-green-400 text-xs ml-1">(+{bonus})</span>}
      </span>
    </div>
  );
};

// Stat Badge Component
const StatBadge: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="bg-gray-800 rounded px-2 py-1 text-center">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-green-400 font-bold">+{value}</p>
  </div>
);

// Recent Choices Section Component - 최근 선택 1개만 표시 + 모달
const RecentChoicesSection: React.FC<{ recentChoices: ChoiceHistoryItem[] }> = ({ recentChoices }) => {
  const [showModal, setShowModal] = useState(false);

  if (recentChoices.length === 0) return null;

  const latestChoice = recentChoices[recentChoices.length - 1];

  return (
    <>
      <div className="mt-2 pt-2 border-t border-gray-700">
        <div className="flex items-center justify-between mb-1">
          <p className="text-gray-400 text-xs">📜 최근 선택</p>
          {recentChoices.length > 1 && (
            <button onClick={() => setShowModal(true)} className="text-[10px] text-purple-400 hover:text-purple-300 transition">
              전체 보기 ({recentChoices.length})
            </button>
          )}
        </div>

        {/* 최근 1개만 표시 */}
        <p className="text-xs text-gray-300 truncate">• {latestChoice.choice}</p>
      </div>

      {/* 전체 선택 기록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg w-full max-w-sm max-h-[70vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">📜 선택 기록</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
              <div className="space-y-2">
                {[...recentChoices].reverse().map((item, idx) => (
                  <div key={idx} className="bg-gray-800 rounded p-2">
                    <p className="text-xs text-gray-400 mb-1">{item.stage}</p>
                    <p className="text-sm text-white">{item.choice}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
