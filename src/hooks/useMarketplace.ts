"use client";

import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import { createListing, createTransaction, getActiveListings, Listing, updateListingStatus } from "../lib/supabaseMarketplace";
import { fetchUserNFTs, NFT, NFTContract } from "../services/nftService";
import { getErrorMessage } from "../lib/error";

const NFT_CONTRACT_LIST: NFTContract[] = [
  { address: "0x3111565FCf79fD5b47AD5fe176AaB69C86Cc73FA", type: "ERC721" },
  { address: "0x1c1852FF164e169fFE759075384060BD26183724", type: "ERC1155" },
  { address: "0x40E3b5A7d76B1b447A98a5287a153BBc36C1615E", type: "ERC1155" },
];

const MARKETPLACE_ADDRESS = "0x62CcC999E33B698E4EDb89A415C9FDa4f1203BDA";
const MARKETPLACE_ABI = ["function list(address nft, uint256 tokenId, uint256 salePrice, uint256 amount) external", "function buy(address nft, uint256 tokenId, address seller, uint256 amount) external payable", "function cancel(address nft, uint256 tokenId, uint256 amount) external", "function getListedAmount(address nft, uint256 tokenId, address seller) external view returns (uint256)", "function listedAmount(address, uint256) external view returns (uint256)", "function isActive(address, uint256) external view returns (bool)"];
const ERC1155_ABI = ["function isApprovedForAll(address owner, address operator) external view returns (bool)", "function setApprovalForAll(address operator, bool approved) external", "function balanceOf(address account, uint256 id) external view returns (uint256)", "function uri(uint256 id) external view returns (string)"];

type Category = "전체" | "무기" | "신발" | "장갑" | "바지" | "상의" | "망토" | "투구" | "장식구" | "칭호" | "스킬";

interface SellerListing {
  seller_address: string;
  listing_id?: string;
  price: string;
  amount: number;
  created_at?: string;
}

export interface GroupedMarketNFT {
  contract_address: string;
  token_id: string;
  metadata?: {
    name: string;
    description: string;
    image: string;
    category?: string;
  };
  sellers: SellerListing[];
  uniqueSellerCount: number;
  totalAmount: number;
  lowestPrice: string;
  highestPrice: string;
}

interface MarketNFT extends Listing {
  metadata?: {
    name: string;
    description: string;
    image: string;
    category?: string;
  };
  listedAmount?: number;
}

export function useMarketplace(walletAddress?: string) {
  const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
  const [groupedMarketNFTs, setGroupedMarketNFTs] = useState<GroupedMarketNFT[]>([]);
  const [myListings, setMyListings] = useState<Record<string, Listing>>({});
  const [listedAmounts, setListedAmounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const loadMyNFTs = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    console.log("🔄 내 NFT 로딩 시작...");

    try {
      const userNFTs = await fetchUserNFTs(walletAddress, NFT_CONTRACT_LIST);
      console.log("📦 지갑의 NFT:", userNFTs.length, "개");

      const allListings = await getActiveListings();
      const myMarketListings = allListings.filter((l) => l.seller_address.toLowerCase() === walletAddress.toLowerCase());
      console.log("📝 내 마켓 리스팅:", myMarketListings.length, "개");

      const nftMap = new Map<string, NFT>();
      userNFTs.forEach((nft) => {
        const key = `${nft.contractAddress}-${nft.tokenId}`;
        const balance = nft.balance ? parseInt(nft.balance) : 0;
        if (balance > 0) {
          nftMap.set(key, nft);
        }
      });

      setMyNFTs(Array.from(nftMap.values()));

      const listingsMap: Record<string, Listing> = {};
      const listedAmountsMap: Record<string, number> = {};

      for (const listing of myMarketListings) {
        const key = `${listing.contract_address}-${listing.token_id}`;

        try {
          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
            const amount = await marketplace.getListedAmount(listing.contract_address, listing.token_id, walletAddress);
            const onChainAmount = Number(amount);

            if (onChainAmount > 0) {
              listingsMap[key] = listing;
              listedAmountsMap[key] = onChainAmount;
              console.log(`NFT #${listing.token_id}: ${onChainAmount}개 리스팅됨`);
            } else if (listing.id && listing.status === "active") {
              await updateListingStatus(listing.id, "cancelled");
            }
          }
        } catch (err) {
          console.warn("Listing 조회 실패:", listing.contract_address, listing.token_id, err);
        }
      }

      setMyListings(listingsMap);
      setListedAmounts(listedAmountsMap);
    } catch (error: unknown) {
      console.error("❌ NFT 로드 실패:", error);
      const errorMessage = error instanceof Error ? error.message : "NFT를 불러오는데 실패했습니다";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const loadMarketplace = useCallback(async () => {
    setLoading(true);
    console.log("🔄 마켓플레이스 로딩 시작...");

    try {
      const activeListings = await getActiveListings();
      console.log("📊 Supabase active 리스팅:", activeListings.length, "개");

      const listingsWithData: MarketNFT[] = [];

      for (const listing of activeListings) {
        try {
          let listedAmount = 0;

          if (window.ethereum) {
            try {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
              const amount = await marketplace.getListedAmount(listing.contract_address, listing.token_id, listing.seller_address);
              listedAmount = Number(amount);
              console.log(`✅ getListedAmount 성공 (${listing.token_id}): ${listedAmount}`);
            } catch (amountErr) {
              console.warn(`❌ getListedAmount 실패 (${listing.token_id}), Supabase 데이터 사용:`, amountErr);
              // 온체인 조회 실패 시 Supabase amount 사용
              listedAmount = listing.amount || 0;
            }
          } else {
            // MetaMask 없을 때도 Supabase 데이터 사용
            listedAmount = listing.amount || 0;
          }

          if (listedAmount === 0) {
            console.log(`⚠️ 리스팅 수량 0 (${listing.token_id}), 스킵`);
            if (listing.id && listing.status === "active") {
              await updateListingStatus(listing.id, "cancelled");
            }
            continue;
          }

          let metadata = {
            name: `NFT #${listing.token_id}`,
            description: "Epic item for your adventure",
            image: "/nft-placeholder.png",
            category: "전체" as Category,
          };

          try {
            if (window.ethereum) {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const nftContract = new ethers.Contract(listing.contract_address, ["function uri(uint256 tokenId) external view returns (string memory)"], provider);
              let tokenURI = await nftContract.uri(listing.token_id);
              if (tokenURI.startsWith("ipfs://")) {
                tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
              }
              const response = await fetch(tokenURI);
              const json = await response.json();

              metadata = {
                name: json.name || metadata.name,
                description: json.description || metadata.description,
                image: (json.image || "").replace("ipfs://", "https://ipfs.io/ipfs/") || metadata.image,
                category: (json.category as Category) || metadata.category,
              };
            }
          } catch {
            // metadata fetch failed, use defaults
          }

          listingsWithData.push({ ...listing, metadata, listedAmount });
        } catch (err) {
          console.error("리스팅 처리 실패:", err);
        }
      }

      const grouped = new Map<string, GroupedMarketNFT>();
      const sellerAmountCache = new Map<string, number>();

      for (const listing of listingsWithData) {
        const nftKey = `${listing.contract_address}-${listing.token_id}`;
        const sellerKey = `${listing.contract_address}-${listing.token_id}-${listing.seller_address.toLowerCase()}`;
        const priceNum = parseFloat(listing.price || "0");

        let sellerOnChainAmount = sellerAmountCache.get(sellerKey);
        if (sellerOnChainAmount === undefined) {
          sellerOnChainAmount = listing.listedAmount || 0;
          sellerAmountCache.set(sellerKey, sellerOnChainAmount);
        }

        if (!grouped.has(nftKey)) {
          grouped.set(nftKey, {
            contract_address: listing.contract_address,
            token_id: listing.token_id,
            metadata: listing.metadata,
            sellers: [],
            uniqueSellerCount: 0,
            totalAmount: 0,
            lowestPrice: listing.price || "0",
            highestPrice: listing.price || "0",
          });
        }

        const group = grouped.get(nftKey)!;

        group.sellers.push({
          seller_address: listing.seller_address,
          listing_id: listing.id,
          price: listing.price || "0",
          amount: listing.amount || 0,
          created_at: listing.created_at,
        });

        if (priceNum < parseFloat(group.lowestPrice)) group.lowestPrice = listing.price || "0";
        if (priceNum > parseFloat(group.highestPrice)) group.highestPrice = listing.price || "0";
      }

      grouped.forEach((group) => {
        const uniqueSellers = new Set(group.sellers.map((s) => s.seller_address.toLowerCase()));
        group.uniqueSellerCount = uniqueSellers.size;

        let totalAmount = 0;
        const countedSellers = new Set<string>();

        for (const seller of group.sellers) {
          const sellerKey = `${group.contract_address}-${group.token_id}-${seller.seller_address.toLowerCase()}`;
          if (!countedSellers.has(sellerKey)) {
            countedSellers.add(sellerKey);
            totalAmount += sellerAmountCache.get(sellerKey) || 0;
          }
        }
        group.totalAmount = totalAmount;
      });

      setGroupedMarketNFTs(Array.from(grouped.values()));
      console.log(`✅ 그룹화된 NFT: ${grouped.size}개`);
    } catch (error: unknown) {
      console.error("❌ 마켓플레이스 로드 실패:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleListNFT = useCallback(
    async (nft: NFT, listingData: { price: string; amount: number }) => {
      if (!walletAddress || !window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const nftAddress = nft.contractAddress;
        const tokenId = nft.tokenId;
        const amount = listingData.amount;
        const priceEth = listingData.price;
        const priceWei = ethers.parseEther(priceEth);

        const nft1155 = new ethers.Contract(nftAddress, ERC1155_ABI, signer);

        toast.info("NFT 권한 확인 중...");
        let isApproved = false;
        try {
          isApproved = await nft1155.isApprovedForAll(walletAddress, MARKETPLACE_ADDRESS);
        } catch (err) {
          console.warn("isApprovedForAll 조회 실패, 승인 진행:", err);
          isApproved = false; // 기본값: 승인 안됨으로 처리
        }

        if (!isApproved) {
          toast.info("마켓플레이스 승인 필요 - MetaMask 확인하세요");
          const approveTx = await nft1155.setApprovalForAll(MARKETPLACE_ADDRESS, true);
          await approveTx.wait();
          toast.success("✅ 마켓플레이스 승인 완료!");
        }

        const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

        toast.info(`NFT ${amount}개 등록 중...`);
        const listTx = await marketplace.list(nftAddress, tokenId, priceWei, amount);
        const receipt = await listTx.wait();

        toast.success("🎉 블록체인 등록 완료!");

        const createdListing = await createListing({
          contract_address: nftAddress,
          token_id: tokenId.toString(),
          seller_address: walletAddress,
          sale_type: "fixed",
          price: priceEth,
          amount,
          status: "active",
        });

        await createTransaction({
          listing_id: createdListing.id,
          contract_address: nftAddress,
          token_id: tokenId.toString(),
          from_address: walletAddress,
          to_address: MARKETPLACE_ADDRESS,
          price: priceEth,
          transaction_hash: receipt.hash,
          transaction_type: "listing",
        });

        toast.success("✅ NFT 등록 완료!");
        await loadMyNFTs();
        await loadMarketplace();
      } catch (error: unknown) {
        console.error("❌ 등록 실패:", error);
        toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [walletAddress, loadMyNFTs, loadMarketplace]
  );

  const handleBuyFromSeller = useCallback(
    async (nft: GroupedMarketNFT, seller: SellerListing, amount: number) => {
      if (!walletAddress || !window.ethereum) {
        toast.error("지갑을 먼저 연결해주세요");
        return;
      }

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

        const priceEth = seller.price;
        const pricePerUnitWei = ethers.parseEther(priceEth);
        const totalPriceWei = pricePerUnitWei * BigInt(amount);

        const contractAddress = nft.contract_address;
        const tokenId = nft.token_id;

        toast.info(`${amount}개 구매 중...`);

        const tx = await marketplace.buy(contractAddress, tokenId, seller.seller_address, amount, {
          value: totalPriceWei,
        });

        const receipt = await tx.wait();

        await createTransaction({
          listing_id: seller.listing_id,
          contract_address: contractAddress,
          token_id: tokenId,
          from_address: seller.seller_address,
          to_address: walletAddress,
          price: priceEth,
          transaction_hash: receipt.hash + "_sell",
          transaction_type: "sell",
        });

        await createTransaction({
          listing_id: seller.listing_id,
          contract_address: contractAddress,
          token_id: tokenId,
          from_address: MARKETPLACE_ADDRESS,
          to_address: walletAddress,
          price: priceEth,
          transaction_hash: receipt.hash + "_buy",
          transaction_type: "buy",
        });

        try {
          const remainingAmount = await marketplace.getListedAmount(contractAddress, tokenId, seller.seller_address);
          if (Number(remainingAmount) === 0 && seller.listing_id) {
            await updateListingStatus(seller.listing_id, "sold");
          }
        } catch (err) {
          console.warn("remainingAmount 조회 실패, 리스팅 상태 sold로 업데이트:", err);
          if (seller.listing_id) {
            await updateListingStatus(seller.listing_id, "sold");
          }
        }

        toast.success("🎉 구매 완료!");
        await loadMarketplace();
      } catch (error: unknown) {
        console.error("❌ 구매 실패:", error);
        toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [walletAddress, loadMarketplace]
  );

  const handleCancelListing = useCallback(
    async (nft: NFT | MarketNFT, amount: number) => {
      if (!walletAddress || !window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
        const contractAddress = "contractAddress" in nft ? nft.contractAddress : nft.contract_address;
        const tokenId = "tokenId" in nft ? nft.tokenId : nft.token_id;

        let currentAmount = 0;
        try {
          const amount = await marketplace.getListedAmount(contractAddress, tokenId, walletAddress);
          currentAmount = Number(amount);
        } catch (err) {
          console.warn("currentAmount 조회 실패:", err);
          toast.error("리스팅 정보를 불러올 수 없습니다.");
          return;
        }
        const onChainAmount = Number(currentAmount);

        if (onChainAmount === 0) {
          toast.error("이미 취소된 NFT입니다");
          await loadMyNFTs();
          await loadMarketplace();
          return;
        }

        const amountToCancel = Math.min(amount, onChainAmount);

        toast.info(`${amountToCancel}개 취소 중...`);
        const tx = await marketplace.cancel(contractAddress, tokenId, amountToCancel);
        const receipt = await tx.wait();

        const key = `${contractAddress}-${tokenId}`;
        const listing = myListings[key];

        await createTransaction({
          listing_id: listing?.id ?? null,
          contract_address: contractAddress,
          token_id: tokenId,
          from_address: MARKETPLACE_ADDRESS,
          to_address: walletAddress,
          price: "0",
          transaction_hash: receipt.hash,
          transaction_type: "cancel",
        });

        try {
          const remainingAmount = await marketplace.getListedAmount(contractAddress, tokenId, walletAddress);
          if (Number(remainingAmount) === 0 && listing?.id) {
            await updateListingStatus(listing.id, "cancelled");
          }
        } catch (err) {
          console.warn("remainingAmount 조회 실패, 리스팅 상태 cancelled로 업데이트:", err);
          if (listing?.id) {
            await updateListingStatus(listing.id, "cancelled");
          }
        }

        toast.success("✅ 취소 완료!");
        await loadMyNFTs();
        await loadMarketplace();
      } catch (error: unknown) {
        console.error("취소 실패:", error);
        toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [walletAddress, myListings, loadMyNFTs, loadMarketplace]
  );

  return {
    myNFTs,
    groupedMarketNFTs,
    myListings,
    listedAmounts,
    loading,
    loadMyNFTs,
    loadMarketplace,
    handleListNFT,
    handleBuyFromSeller,
    handleCancelListing,
  };
}
