// "use client";

// import { useState, useEffect } from "react";
// import Image from "next/image";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useWallet } from "../context/WalletContext";
// import { createListing, createTransaction, getActiveListings, Listing, updateListingStatus } from "../../lib/supabaseMarketplace";
// import { fetchUserNFTs, NFT, NFTContract } from "../../lib/nftService";
// import { ethers } from "ethers";
// import { logoutFromWepin } from "../../lib/wepin";
// import HistorySection from "../../components/Market/HistorySection";

// const NFT_CONTRACT_LIST: NFTContract[] = [
//   { address: "0x3111565FCf79fD5b47AD5fe176AaB69C86Cc73FA", type: "ERC721" },
//   { address: "0x1c1852FF164e169fFE759075384060BD26183724", type: "ERC1155" },
//   { address: "0x40E3b5A7d76B1b447A98a5287a153BBc36C1615E", type: "ERC1155" },
// ];

// const MARKETPLACE_ADDRESS = "0x62CcC999E33B698E4EDb89A415C9FDa4f1203BDA";
// const MARKETPLACE_ABI = ["function list(address nft, uint256 tokenId, uint256 salePrice, uint256 amount) external", "function buy(address nft, uint256 tokenId, address seller, uint256 amount) external payable", "function cancel(address nft, uint256 tokenId, uint256 amount) external", "function getListedAmount(address nft, uint256 tokenId, address seller) external view returns (uint256)", "function listedAmount(address, uint256) external view returns (uint256)", "function isActive(address, uint256) external view returns (bool)"];
// const ERC1155_ABI = ["function isApprovedForAll(address owner, address operator) external view returns (bool)", "function setApprovalForAll(address operator, bool approved) external", "function balanceOf(address account, uint256 id) external view returns (uint256)", "function uri(uint256 id) external view returns (string)"];

// type Category = "전체" | "무기" | "신발" | "장갑" | "바지" | "상의" | "망토" | "투구" | "장식구" | "칭호" | "스킬";
// const CATEGORIES: Category[] = ["전체", "무기", "신발", "장갑", "바지", "상의", "망토", "투구", "장식구", "칭호", "스킬"];

// interface MarketNFT extends Listing {
//   metadata?: {
//     name: string;
//     description: string;
//     image: string;
//     category?: string;
//   };
//   listedAmount?: number;
// }

// const getCategoryFromNFT = (tokenId: string): Category => {
//   const id = parseInt(tokenId);
//   if (id >= 100 && id < 110) return "무기";
//   if (id >= 110 && id < 120) return "신발";
//   if (id >= 120 && id < 130) return "장갑";
//   if (id >= 130 && id < 140) return "바지";
//   if (id >= 140 && id < 150) return "상의";
//   if (id >= 150 && id < 160) return "망토";
//   if (id >= 160 && id < 170) return "투구";
//   if (id >= 170 && id < 180) return "장식구";
//   if (id >= 180 && id < 190) return "칭호";
//   if (id >= 190 && id < 200) return "스킬";
//   return "전체";
// };

// type ViewMode = "myNFTs" | "marketplace";

// export default function IntegratedMarketplace() {
//   const { wallet, setWallet } = useWallet();
//   const pathname = usePathname();
//   const [viewMode, setViewMode] = useState<ViewMode>("marketplace");
//   const [myNFTs, setMyNFTs] = useState<NFT[]>([]);
//   const [marketListings, setMarketListings] = useState<MarketNFT[]>([]);
//   const [myListings, setMyListings] = useState<Record<string, Listing>>({});
//   const [listedAmounts, setListedAmounts] = useState<Record<string, number>>({});
//   const [loading, setLoading] = useState(false);
//   const [selectedNFT, setSelectedNFT] = useState<NFT | MarketNFT | null>(null);
//   const [sortBy, setSortBy] = useState<"recent" | "low" | "high">("recent");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
//   const [modalMode, setModalMode] = useState<"list" | "buy" | "detail">("list");
//   const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);

//   const handleDisconnect = async () => {
//     if (wallet?.type === "wepin") {
//       await logoutFromWepin();
//     }
//     if (wallet?.type === "metamask" && typeof window !== "undefined" && window.ethereum) {
//       try {
//         await window.ethereum.request({
//           method: "wallet_revokePermissions",
//           params: [{ eth_accounts: {} }],
//         });
//       } catch (err) {
//         console.error("MetaMask 권한 제거 실패", err);
//       }
//     }
//     localStorage.setItem("disconnectedManually", "true");
//     localStorage.removeItem("connectedWallet");
//     setWallet(null);
//     setIsWalletDropdownOpen(false);
//     toast.success("Wallet disconnected successfully");
//   };

//   const isActive = (path: string) => pathname === path;

//   useEffect(() => {
//     if (viewMode === "myNFTs" && wallet?.address) {
//       loadMyNFTs();
//     } else if (viewMode === "marketplace") {
//       loadMarketplace();
//     }
//   }, [viewMode, wallet]);

//   const loadMyNFTs = async () => {
//     if (!wallet?.address) return;
//     setLoading(true);
//     try {
//       const userNFTs = await fetchUserNFTs(wallet.address, NFT_CONTRACT_LIST);
//       const allListings = await getActiveListings();
//       const myMarketListings = allListings.filter((l) => l.seller_address.toLowerCase() === wallet.address.toLowerCase());

//       // 마켓플레이스에 등록된 NFT를 포함한 전체 NFT 목록 생성
//       const nftMap = new Map<string, NFT>();

//       // 1. 지갑에 있는 NFT만 추가 (리스팅된 NFT 제외)
//       userNFTs.forEach((nft) => {
//         const key = `${nft.contractAddress}-${nft.tokenId}`;
//         // balance가 0보다 크면 추가
//         const balance = nft.balance ? parseInt(nft.balance) : 0;
//         if (balance > 0) {
//           nftMap.set(key, nft);
//         }
//       });

//       // 2. 마켓플레이스에 등록된 NFT는 My Collection에 표시하지 않음
//       // (삭제됨)

//       setMyNFTs(Array.from(nftMap.values()));

//       const listingsMap: Record<string, Listing> = {};
//       const listedAmountsMap: Record<string, number> = {};

//       for (const nft of Array.from(nftMap.values())) {
//         try {
//           const listing = myMarketListings.find((l) => l.contract_address === nft.contractAddress && l.token_id === nft.tokenId);
//           if (listing) {
//             const key = `${nft.contractAddress}-${nft.tokenId}`;
//             listingsMap[key] = listing;

//             // listedAmount 조회 (에러 처리 강화)
//             try {
//               if (window.ethereum) {
//                 const provider = new ethers.BrowserProvider(window.ethereum);
//                 const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
//                 const amount = await marketplace.getListedAmount(nft.contractAddress, nft.tokenId, wallet.address);
//                 listedAmountsMap[key] = Number(amount);
//               }
//             } catch (amountError) {
//               console.warn(`listedAmount 조회 실패 (${nft.contractAddress}-${nft.tokenId}):`, amountError);
//               // 에러 발생 시 0으로 설정
//               listedAmountsMap[key] = 0;
//             }
//           }
//         } catch (err) {
//           console.warn("Listing 조회 실패:", nft.contractAddress, nft.tokenId, err);
//         }
//       }
//       setMyListings(listingsMap);
//       setListedAmounts(listedAmountsMap);
//     } catch (error: any) {
//       console.error("NFT 로드 실패:", error);
//       toast.error(error?.message || "NFT를 불러오는데 실패했습니다");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadMarketplace = async () => {
//     setLoading(true);
//     try {
//       const activeListings = await getActiveListings();
//       const uniqueListingsMap = new Map<string, Listing>();
//       activeListings.forEach((listing) => {
//         const key = `${listing.contract_address}-${listing.token_id}`;
//         if (!uniqueListingsMap.has(key)) {
//           uniqueListingsMap.set(key, listing);
//         } else {
//           const existing = uniqueListingsMap.get(key)!;
//           if (new Date(listing.created_at || 0) > new Date(existing.created_at || 0)) {
//             uniqueListingsMap.set(key, listing);
//           }
//         }
//       });
//       const uniqueListings = Array.from(uniqueListingsMap.values());

//       const listingsWithData = await Promise.all(
//         uniqueListings.map(async (listing) => {
//           try {
//             let listedAmount = 0;

//             // listedAmount 조회 (에러 처리 강화)
//             try {
//               if (window.ethereum) {
//                 const provider = new ethers.BrowserProvider(window.ethereum);
//                 const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
//                 const amount = await marketplace.getListedAmount(listing.contract_address, listing.token_id, listing.seller_address);
//                 listedAmount = Number(amount);
//               }
//             } catch (amountError) {
//               console.warn(`listedAmount 조회 실패 (${listing.contract_address}-${listing.token_id}):`, amountError);
//               // 에러 발생 시 0으로 설정하고 계속 진행
//               listedAmount = 0;
//             }

//             let metadata = {
//               name: `NFT #${listing.token_id}`,
//               description: "Epic item for your adventure",
//               image: "/nft-placeholder.png",
//               category: getCategoryFromNFT(listing.token_id),
//             };

//             try {
//               if (window.ethereum) {
//                 const provider = new ethers.BrowserProvider(window.ethereum);
//                 const ERC1155_METADATA_ABI = ["function uri(uint256 tokenId) external view returns (string memory)"];
//                 const nftContract = new ethers.Contract(listing.contract_address, ERC1155_METADATA_ABI, provider);
//                 let tokenURI = await nftContract.uri(listing.token_id);
//                 if (tokenURI.startsWith("ipfs://")) {
//                   tokenURI = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
//                 }
//                 const response = await fetch(tokenURI);
//                 const metadataJson = await response.json();
//                 let imageUrl = metadataJson.image || "/nft-placeholder.png";
//                 if (imageUrl.startsWith("ipfs://")) {
//                   imageUrl = imageUrl.replace("ipfs://", "https://ipfs.io/ipfs/");
//                 }
//                 metadata = {
//                   name: metadataJson.name || `NFT #${listing.token_id}`,
//                   description: metadataJson.description || "Epic item for your adventure",
//                   image: imageUrl,
//                   category: getCategoryFromNFT(listing.token_id),
//                 };
//               }
//             } catch (metadataError) {
//               console.warn(`메타데이터 로드 실패 (${listing.contract_address}-${listing.token_id}):`, metadataError);
//             }

//             return { ...listing, metadata, listedAmount };
//           } catch (err) {
//             console.error("리스팅 데이터 로드 실패:", err);
//             return {
//               ...listing,
//               metadata: {
//                 name: `NFT #${listing.token_id}`,
//                 description: "No description available",
//                 image: "/nft-placeholder.png",
//                 category: "전체" as Category,
//               },
//               listedAmount: 0,
//             };
//           }
//         })
//       );

//       // listedAmount가 0인 리스팅을 Supabase에서 'cancelled'로 업데이트
//       const cancelledListings = listingsWithData.filter((l) => l.listedAmount === 0);
//       if (cancelledListings.length > 0) {
//         console.log(`${cancelledListings.length}개의 취소된 리스팅 발견`);
//         for (const listing of cancelledListings) {
//           try {
//             if (listing.id) {
//               await updateListingStatus(listing.id, "cancelled");
//             }
//           } catch (err) {
//             console.warn("리스팅 상태 업데이트 실패:", listing.id, err);
//           }
//         }
//       }

//       setMarketListings(listingsWithData.filter((l) => l.listedAmount && l.listedAmount > 0));
//     } catch (error: any) {
//       console.error("마켓플레이스 로드 실패:", error);
//       toast.error("마켓플레이스를 불러오는데 실패했습니다");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleListNFT = async (listingData: { price: string; amount: number }) => {
//     if (!selectedNFT || !wallet?.address || !window.ethereum) return;

//     const nft = selectedNFT as NFT;

//     try {
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();

//       const nftAddress = nft.contractAddress;
//       const tokenId = nft.tokenId;
//       const amount = listingData.amount;

//       /**
//        * 🔥 price는 ETH 문자열
//        * 컨트랙트 호출 직전에만 wei 변환
//        */
//       const priceEth = listingData.price;
//       const priceWei = ethers.parseEther(priceEth);

//       const nft1155 = new ethers.Contract(nftAddress, ERC1155_ABI, signer);

//       toast.info("NFT 권한 확인 중...");
//       const isApproved = await nft1155.isApprovedForAll(wallet.address, MARKETPLACE_ADDRESS);

//       if (!isApproved) {
//         toast.info("마켓플레이스 승인 필요 - MetaMask 확인하세요");
//         const approveTx = await nft1155.setApprovalForAll(MARKETPLACE_ADDRESS, true);
//         await approveTx.wait();
//         toast.success("✅ 마켓플레이스 승인 완료!");
//       }

//       const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

//       toast.info(`NFT ${amount}개 등록 중...`);
//       const listTx = await marketplace.list(
//         nftAddress,
//         tokenId,
//         priceWei, // ✅ wei
//         amount
//       );

//       const receipt = await listTx.wait();
//       toast.success("🎉 블록체인 등록 완료!");

//       await createListing({
//         contract_address: nftAddress,
//         token_id: tokenId.toString(),
//         seller_address: wallet.address,
//         sale_type: "fixed",
//         price: priceEth, // ✅ ETH string
//         amount, // ✅ number
//         status: "active",
//       });
//       await createTransaction({
//         contract_address: nftAddress,
//         token_id: tokenId.toString(),
//         from_address: wallet.address,
//         to_address: MARKETPLACE_ADDRESS,
//         price: priceEth, // ✅ ETH
//         transaction_hash: receipt.hash,
//         transaction_type: "listing",
//       });

//       toast.success("✅ NFT 등록 완료!");
//       setSelectedNFT(null);
//       await loadMyNFTs();
//     } catch (error: any) {
//       console.error("등록 실패:", error);
//       toast.error(error.message ?? "등록에 실패했습니다");
//     }
//   };

//   const handleBuyNFT = async (amount: number) => {
//     if (!selectedNFT || !wallet?.address || !window.ethereum) {
//       toast.error("지갑을 먼저 연결해주세요");
//       return;
//     }

//     const listing = selectedNFT as MarketNFT;

//     try {
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

//       // 1️⃣ ETH → wei
//       const priceEth = listing.price; // "1"
//       const pricePerUnitWei = ethers.parseEther(priceEth);
//       const totalPriceWei = pricePerUnitWei * BigInt(amount);

//       toast.info(`${amount}개 구매 중...`);

//       // 2️⃣ 온체인 구매
//       const tx = await marketplace.buy(listing.contract_address, listing.token_id, listing.seller_address, amount, { value: totalPriceWei });

//       const receipt = await tx.wait();

//       // 🔑 변수 정리 (이름 통일)
//       const seller = listing.seller_address;
//       const buyer = wallet.address;
//       const contractAddress = listing.contract_address;
//       const tokenId = listing.token_id;
//       const listingId = listing.id; // ⭐ 반드시 있으면 넣기

//       /**
//        * 3️⃣ SELL 기록 (판매자 히스토리용)
//        */
//       await createTransaction({
//         listing_id: listingId,
//         contract_address: contractAddress,
//         token_id: tokenId,
//         from_address: MARKETPLACE_ADDRESS,
//         to_address: buyer,
//         price: priceEth,
//         transaction_hash: receipt.hash + "_sell",
//         transaction_type: "sell",
//       });

//       /**
//        * 4️⃣ BUY 기록 (구매자 히스토리용)
//        */
//       await createTransaction({
//         listing_id: listingId,
//         contract_address: contractAddress,
//         token_id: tokenId,
//         from_address: MARKETPLACE_ADDRESS,
//         to_address: buyer,
//         price: priceEth,
//         transaction_hash: receipt.hash + "_buy",
//         transaction_type: "buy",
//       });

//       // 5️⃣ 리스팅 상태 업데이트 (🔥 필수)
//       if (listingId) {
//         await updateListingStatus(listingId, "sold");
//       }

//       toast.success("🎉 구매 완료!");
//       setSelectedNFT(null);
//       await loadMarketplace();
//     } catch (error: any) {
//       console.error("❌ 구매 실패:", error);

//       let errorMsg = "구매에 실패했습니다";
//       if (error.code === "ACTION_REJECTED") {
//         errorMsg = "사용자가 트랜잭션을 거부했습니다";
//       } else if (error.reason) {
//         errorMsg = error.reason;
//       }

//       toast.error(errorMsg);
//     }
//   };

//   const handleCancelListing = async (nft: NFT | MarketNFT, amount: number) => {
//     if (!wallet?.address || !window.ethereum) return;
//     try {
//       const provider = new ethers.BrowserProvider(window.ethereum);
//       const signer = await provider.getSigner();
//       const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
//       const contractAddress = "contractAddress" in nft ? nft.contractAddress : nft.contract_address;
//       const tokenId = "tokenId" in nft ? nft.tokenId : nft.token_id;
//       toast.info(`${amount}개 취소 중...`);
//       const tx = await marketplace.cancel(contractAddress, tokenId, amount);
//       const receipt = await tx.wait();

//       // ✅ Supabase에 취소 트랜잭션 기록
//       await createTransaction({
//         listing_id: tx.listing_id ?? null,
//         contract_address: contractAddress,
//         token_id: tokenId,
//         from_address: MARKETPLACE_ADDRESS,
//         to_address: wallet.address,
//         price: "0",
//         transaction_hash: receipt.hash,
//         transaction_type: "cancel",
//       });

//       toast.success("✅ 취소 완료!");
//       if (viewMode === "myNFTs") {
//         await loadMyNFTs();
//       } else {
//         await loadMarketplace();
//       }
//     } catch (error: any) {
//       console.error("취소 실패:", error);
//       toast.error(error.message || "취소에 실패했습니다");
//     }
//   };

//   const filteredAndSortedItems =
//     viewMode === "marketplace"
//       ? marketListings
//           .filter((listing) => {
//             if (selectedCategory !== "전체" && listing.metadata?.category !== selectedCategory) return false;
//             if (searchQuery) {
//               const query = searchQuery.toLowerCase();
//               const name = listing.metadata?.name?.toLowerCase() || "";
//               const tokenId = listing.token_id.toLowerCase();
//               const description = listing.metadata?.description?.toLowerCase() || "";
//               return name.includes(query) || tokenId.includes(query) || description.includes(query);
//             }
//             return true;
//           })
//           .sort((a, b) => {
//             if (sortBy === "low") return parseInt(a.price || "0") - parseInt(b.price || "0");
//             else if (sortBy === "high") return parseInt(b.price || "0") - parseInt(a.price || "0");
//             return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
//           })
//       : myNFTs
//           .filter((nft) => {
//             const category = getCategoryFromNFT(nft.tokenId);
//             if (selectedCategory !== "전체" && category !== selectedCategory) return false;
//             if (searchQuery) {
//               const query = searchQuery.toLowerCase();
//               return nft.name.toLowerCase().includes(query) || nft.tokenId.toLowerCase().includes(query) || nft.description.toLowerCase().includes(query);
//             }
//             return true;
//           })
//           .sort((a, b) => {
//             if (sortBy === "low" || sortBy === "high") {
//               const aPrice = myListings[`${a.contractAddress}-${a.tokenId}`]?.price || "0";
//               const bPrice = myListings[`${b.contractAddress}-${b.tokenId}`]?.price || "0";
//               return sortBy === "low" ? parseInt(aPrice) - parseInt(bPrice) : parseInt(bPrice) - parseInt(aPrice);
//             }
//             return 0;
//           });

//   // Top 5 highest priced NFTs
//   const topNFTs = viewMode === "marketplace" ? [...marketListings].sort((a, b) => parseInt(b.price || "0") - parseInt(a.price || "0")).slice(0, 5) : [];

//   if (!wallet) {
//     return (
//       <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center p-6">
//         <div className="text-center max-w-lg">
//           <div className="mb-10 relative inline-block">
//             <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] blur-3xl opacity-30 animate-pulse"></div>
//             <div className="relative text-9xl filter drop-shadow-2xl">🔐</div>
//           </div>
//           <h1 className="text-5xl font-black mb-4">
//             <span className="bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] bg-clip-text text-transparent">NFT Marketplace</span>
//           </h1>
//           <p className="text-gray-400 text-xl mb-10">Connect your wallet to explore amazing NFTs</p>
//           <div className="h-1 w-full bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] rounded-full"></div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#0a0b0d]">
//       <ToastContainer position="top-right" autoClose={3000} theme="dark" toastStyle={{ marginTop: "80px" }} />

//       {/* Navbar */}
//       <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0b0d]/80 backdrop-blur-2xl">
//         <div className="max-w-[1400px] mx-auto px-8 py-5">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-12">
//               <Link href="/" className="flex items-center gap-2">
//                 <h1 className="text-2xl font-black">
//                   <span className="bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] bg-clip-text text-transparent">NFT</span>
//                   <span className="text-white">Market</span>
//                 </h1>
//               </Link>

//               <div className="hidden lg:flex items-center gap-6">
//                 <Link href="/play" className={`text-sm font-semibold transition-colors ${isActive("/play") ? "text-white" : "text-gray-400 hover:text-white"}`}>
//                   Play
//                 </Link>
//                 <Link href="/market" className={`text-sm font-semibold transition-colors ${isActive("/market") ? "text-white" : "text-gray-400 hover:text-white"}`}>
//                   Market
//                 </Link>
//                 <Link href="/swap" className={`text-sm font-semibold transition-colors ${isActive("/swap") ? "text-white" : "text-gray-400 hover:text-white"}`}>
//                   Swap
//                 </Link>
//                 <Link href="/earn" className={`text-sm font-semibold transition-colors ${isActive("/earn") ? "text-white" : "text-gray-400 hover:text-white"}`}>
//                   Earn
//                 </Link>
//                 <Link href="/voting" className={`text-sm font-semibold transition-colors ${isActive("/voting") ? "text-white" : "text-gray-400 hover:text-white"}`}>
//                   Voting
//                 </Link>
//                 <Link href="/more" className={`text-sm font-semibold transition-colors ${isActive("/more") ? "text-white" : "text-gray-400 hover:text-white"}`}>
//                   More
//                 </Link>
//               </div>

//               <div className="flex items-center gap-2 bg-white/5 rounded-full p-1.5">
//                 <button onClick={() => setViewMode("marketplace")} className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${viewMode === "marketplace" ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow-lg shadow-purple-500/30" : "text-gray-400 hover:text-white"}`}>
//                   Marketplace
//                 </button>
//                 <button onClick={() => setViewMode("myNFTs")} className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-300 ${viewMode === "myNFTs" ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white shadow-lg shadow-purple-500/30" : "text-gray-400 hover:text-white"}`}>
//                   My Collection
//                 </button>
//               </div>
//             </div>

//             <div className="flex items-center gap-4">
//               <div className="relative">
//                 <button onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)} className="flex items-center gap-3 bg-white/5 rounded-full px-5 py-3 border border-white/10 hover:bg-white/10 transition-all">
//                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
//                   <span className="text-sm font-mono text-gray-300">
//                     {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
//                   </span>
//                   <svg className={`w-4 h-4 text-gray-400 transition-transform ${isWalletDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//                   </svg>
//                 </button>

//                 {isWalletDropdownOpen && (
//                   <>
//                     <div className="fixed inset-0 z-40" onClick={() => setIsWalletDropdownOpen(false)} />
//                     <div className="absolute right-0 mt-2 w-64 bg-[#13141a] border border-white/10 rounded-2xl p-4 shadow-2xl z-50">
//                       <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
//                         <Image src={wallet.type === "metamask" ? "/MetamaskLogo.png" : "/WepinLogo.png"} alt={wallet.type} width={40} height={40} />
//                         <div>
//                           <p className="text-xs text-gray-400">Connected with</p>
//                           <p className="text-sm font-semibold text-white">{wallet.type === "metamask" ? "MetaMask" : "Wepin"}</p>
//                         </div>
//                       </div>
//                       <div className="mb-4 p-3 bg-white/5 rounded-xl">
//                         <p className="text-xs text-gray-400 mb-1">Wallet Address</p>
//                         <p className="text-sm font-mono text-white break-all">{wallet.address}</p>
//                       </div>
//                       <button onClick={handleDisconnect} className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2">
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
//                         </svg>
//                         Disconnect
//                       </button>
//                     </div>
//                   </>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </nav>

//       <div>
//         <div>
//           {/* Hero Section with Top NFTs */}
//           {viewMode === "marketplace" && topNFTs.length > 0 && (
//             <div
//               className="relative mb-16"
//               style={{
//                 minHeight: "900px",
//                 overflow: "hidden",
//               }}
//             >
//               {/* Background Image - fills entire section */}
//               <div className="absolute inset-0 z-0">
//                 <Image src="/Marketpage/1.jpg" alt="background" fill className="object-cover" priority />
//               </div>

//               {/* Dark overlay for better text readability */}
//               <div className="absolute inset-0 bg-black/20 z-[1]" />

//               {/* Content */}
//               <div className="relative z-10">
//                 <div className="text-center mb-12 mt-10 pt-8">
//                   <h2 className="text-6xl font-black mb-4">
//                     <span className="text-white"> MYTHIC COLLECTION</span>
//                     <br />
//                     <span className="text-white">OF </span>
//                     <span className="bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] bg-clip-text text-transparent">NFT</span>
//                     <span className="bg-gradient-to-r from-[#ec4899] to-[#06b6d4] bg-clip-text text-transparent"> ITEMS</span>
//                   </h2>
//                 </div>

//                 {/* Top 5 NFTs Showcase */}
//                 <div className="relative w-full h-[550px] flex items-center justify-center perspective-1000">
//                   {topNFTs.map((nft, index) => {
//                     const isCenter = index === 2;

//                     // 좌우 이동
//                     const baseOffset = 300;
//                     let offset = (index - 2) * baseOffset;

//                     // ⭐ 가운데 양옆 카드만 간격 추가
//                     if (index === 1) offset -= 30;
//                     if (index === 3) offset += 30;

//                     // 안쪽으로 기울기
//                     const rotation = (2 - index) * 25;

//                     // 크기 변화
//                     const scale = isCenter ? 1.05 : 1;

//                     // 가운데 카드만 위로 올리기
//                     const translateY = isCenter ? "-40px" : "0px";

//                     // 카드 크기
//                     const cardWidth = isCenter ? "w-96" : "w-64";
//                     const cardHeight = isCenter ? "h-[30rem]" : "h-96";

//                     return (
//                       <div
//                         key={`${nft.contract_address}-${nft.token_id}-${index}`}
//                         className="absolute transition-all duration-500 cursor-pointer group"
//                         style={{
//                           transform: `translateX(${offset}px) translateY(${translateY}) rotateY(${rotation}deg) scale(${scale})`,
//                           zIndex: isCenter ? 50 : 10,
//                         }}
//                         onClick={() => {
//                           setSelectedNFT(nft);
//                           setModalMode("detail");
//                         }}
//                       >
//                         <div
//                           className={`
//             ${cardWidth}
//             ${cardHeight}
//             rounded-3xl
//             overflow-hidden
//             bg-gradient-to-br
//             from-purple-900/20
//             to-pink-900/20
//             border border-white/20
//             shadow-2xl
//             group-hover:shadow-purple-500/50
//             transition-all
//             duration-300
//           `}
//                         >
//                           <div className="relative h-full">
//                             <Image src={nft.metadata?.image || "/nft-placeholder.png"} alt={nft.metadata?.name || "NFT"} fill className="object-cover" unoptimized />

//                             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>

//                             <div className="absolute bottom-0 left-0 right-0 p-5">
//                               <p className="text-white text-lg font-bold mb-2">{nft.metadata?.name || `NFT #${nft.token_id}`}</p>

//                               <div className="flex items-center justify-between">
//                                 <div>
//                                   <p className="text-xs text-gray-400">Current Bid</p>

//                                   <p className="font-bold text-xl">
//                                     <span className="text-white">{Number(nft.price || "0").toFixed(2)}</span>
//                                     <span className="text-yellow-500 ml-1">Very</span>
//                                   </p>
//                                 </div>

//                                 {isCenter && <div className=" text-green-500 px-3 py-1 rounded-full text-xs font-bold">MORE +</div>}
//                               </div>
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Search & Filter Section */}
//           <div className={`mb-10 space-y-6 ${viewMode === "myNFTs" ? "pt-20" : ""}`}></div>
//           <div className="max-w-[1400px] mx-auto">
//             <div></div>
//             <div className="mb-10 space-y-6">
//               <div className="relative group max-w-2xl mx-auto">
//                 <div className="absolute -inset-0.5 bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
//                 <div className="relative bg-[#13141a] border border-white/10 rounded-2xl overflow-hidden">
//                   <input type="text" placeholder="Search NFTs by name or token ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent px-6 py-4 pl-14 text-white placeholder-gray-500 focus:outline-none" />
//                   <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//                   </svg>
//                 </div>
//               </div>

//               <div className="bg-[#13141a] border border-white/10 rounded-2xl p-6">
//                 <div className="flex items-center gap-4 flex-wrap">
//                   <div className="flex gap-3 flex-wrap">
//                     {CATEGORIES.map((category) => (
//                       <button key={category} onClick={() => setSelectedCategory(category)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${selectedCategory === category ? "bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"}`}>
//                         {category}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               </div>

//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-2xl font-bold text-white">{filteredAndSortedItems.length} Items</p>
//                   <p className="text-sm text-gray-400">{viewMode === "marketplace" ? "Available for purchase" : "In your wallet"}</p>
//                 </div>
//                 <div className="flex gap-3">
//                   <button onClick={() => setSortBy("recent")} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${sortBy === "recent" ? "bg-white/10 text-white border border-white/20" : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5"}`}>
//                     Recent
//                   </button>
//                   <button onClick={() => setSortBy("low")} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${sortBy === "low" ? "bg-white/10 text-white border border-white/20" : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5"}`}>
//                     Low
//                   </button>
//                   <button onClick={() => setSortBy("high")} className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${sortBy === "high" ? "bg-white/10 text-white border border-white/20" : "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5"}`}>
//                     High
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* Collections Header */}
//             <div className="mb-8">
//               <h3 className="text-4xl font-black text-white mb-2">{viewMode === "marketplace" ? "COLLECTIONS" : "MY COLLECTION"}</h3>
//             </div>

//             {/* NFT Grid */}
//             {loading ? (
//               <div className="flex flex-col items-center justify-center py-32">
//                 <div className="relative w-20 h-20 mb-6">
//                   <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
//                   <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
//                 </div>
//                 <p className="text-gray-400 text-lg">Loading NFTs...</p>
//               </div>
//             ) : filteredAndSortedItems.length === 0 ? (
//               <div className="flex flex-col items-center justify-center py-32">
//                 <div className="text-7xl mb-6 opacity-50">📦</div>
//                 <p className="text-gray-400 text-xl mb-8">{searchQuery || selectedCategory !== "전체" ? "No NFTs found matching your search" : viewMode === "myNFTs" ? "You don't own any NFTs yet" : "No NFTs available for sale"}</p>
//                 {(searchQuery || selectedCategory !== "전체") && (
//                   <button
//                     onClick={() => {
//                       setSearchQuery("");
//                       setSelectedCategory("전체");
//                     }}
//                     className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-all border border-white/10"
//                   >
//                     Clear Filters
//                   </button>
//                 )}
//               </div>
//             ) : (
//               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
//                 {viewMode === "myNFTs"
//                   ? (filteredAndSortedItems as NFT[]).map((nft) => {
//                       const key = `${nft.contractAddress}-${nft.tokenId}`;
//                       return (
//                         <MyNFTCard
//                           key={key}
//                           nft={nft}
//                           wallet={wallet}
//                           listing={myListings[key]}
//                           listedAmount={listedAmounts[key] || 0}
//                           onList={() => {
//                             setSelectedNFT(nft);
//                             setModalMode("list");
//                           }}
//                           onCancel={(amount) => handleCancelListing(nft, amount)}
//                           onDetail={() => {
//                             setSelectedNFT(nft);
//                             setModalMode("detail");
//                           }}
//                         />
//                       );
//                     })
//                   : (filteredAndSortedItems as MarketNFT[]).map((listing, index) => (
//                       <MarketNFTCard
//                         key={`${listing.contract_address}-${listing.token_id}-${index}`}
//                         listing={listing}
//                         onBuy={() => {
//                           setSelectedNFT(listing);
//                           setModalMode("buy");
//                         }}
//                         onCancel={(amount) => handleCancelListing(listing, amount)}
//                         onDetail={() => {
//                           setSelectedNFT(listing);
//                           setModalMode("detail");
//                         }}
//                         isOwner={wallet?.address?.toLowerCase() === listing.seller_address.toLowerCase()}
//                       />
//                     ))}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* ✅ History Section 추가 - My Collection에서만 표시 */}
//       {viewMode === "myNFTs" && wallet?.address && (
//         <div className="max-w-[1400px] mx-auto px-8 mt-8">
//           <HistorySection wallet={wallet} onRefresh={loadMyNFTs} />
//         </div>
//       )}

//       {selectedNFT && modalMode === "list" && <ListModal nft={selectedNFT as NFT} onClose={() => setSelectedNFT(null)} onSubmit={handleListNFT} />}
//       {selectedNFT && modalMode === "buy" && <BuyModal listing={selectedNFT as MarketNFT} onClose={() => setSelectedNFT(null)} onBuy={handleBuyNFT} />}
//       {selectedNFT && modalMode === "detail" && <DetailModal nft={selectedNFT} onClose={() => setSelectedNFT(null)} wallet={wallet} onBuy={() => setModalMode("buy")} />}

//       <style jsx global>{`
//         .perspective-1000 {
//           perspective: 1000px;
//         }

//         /* 스크롤바 숨기기 */
//         ::-webkit-scrollbar {
//           display: none;
//         }
//         * {
//           -ms-overflow-style: none;
//           scrollbar-width: none;
//         }
//       `}</style>
//     </div>
//   );
// }

// function MyNFTCard({ nft, wallet, listing, listedAmount, onList, onCancel, onDetail }: { nft: NFT; wallet: any; listing?: Listing; listedAmount: number; onList: () => void; onCancel: (amount: number) => void; onDetail: () => void }) {
//   const [showCancelInput, setShowCancelInput] = useState(false);
//   const [cancelAmount, setCancelAmount] = useState(1);

//   // totalBalance = 지갑에 있는 balance + 마켓플레이스에 등록된 수량
//   const walletBalance = parseInt(nft.balance || "0");
//   const totalBalance = walletBalance + listedAmount;

//   const isListed = listing && listedAmount > 0;
//   const unlistedAmount = walletBalance; // 지갑에 남아있는 수량
//   const hasPartialListing = isListed && unlistedAmount > 0;

//   return (
//     <div className="group relative " onClick={onDetail}>
//       {/* 투명한 배경 카드 (더 넓게) */}
//       <div className="absolute -inset-2 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-lg backdrop-blur-sm"></div>

//       <div
//         className="relative overflow-hidden transition-all duration-500 cursor-pointer border"
//         style={{
//           background: "linear-gradient(180deg, #2a2a3e 0%, #1a1a2e 100%)",
//           borderColor: "rgba(139, 92, 246, 0.4)",
//         }}
//       >
//         <div className="relative h-56 overflow-hidden">
//           <Image src={nft.image} alt={nft.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />

//           {/* 등록 수량 - 오른쪽 상단 */}
//           {listedAmount > 0 && <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/20">{listedAmount} listed</div>}

//           {/* 가격 정보 - 하단 오버레이 (End In 삭제) */}
//           {isListed && listing && (
//             <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 pt-8">
//               <div className="flex justify-between items-center">
//                 <div>
//                   <div className="text-gray-400 text-xs mb-1">Current Bid</div>
//                   <div className="text-white font-bold text-lg">{Number(listing.price || "0").toFixed(2)} Very</div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         <div className="p-4" style={{ background: "linear-gradient(180deg, #2a2a3e 0%, #1f1f2f 100%)" }}>
//           {/* NFT 이름 */}
//           <h3 className="font-bold text-xl text-white mb-2 truncate">{nft.name}</h3>

//           {/* NFT 소유자 지갑주소 */}
//           <p className="text-purple-300 text-sm font-semibold mb-1">@{wallet?.address ? `${wallet.address.slice(0, 7)}...${wallet.address.slice(-5)}` : "unknown"}</p>

//           {/* Token ID */}
//           <p className="text-gray-500 text-xs mb-1">#{nft.tokenId}</p>

//           {/* NFT 설명 */}
//           <p className="text-gray-400 text-xs mb-3 line-clamp-1">{nft.description || "Epic item for your adventure"}</p>

//           {/* 액션 버튼 */}
//           {showCancelInput ? (
//             <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
//               <div className="flex items-center gap-2">
//                 <input type="number" min="1" max={listedAmount} value={cancelAmount} onChange={(e) => setCancelAmount(Math.min(Math.max(1, parseInt(e.target.value) || 1), listedAmount))} className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" placeholder="Amount" />
//                 <span className="text-gray-400 text-xs">/ {listedAmount}</span>
//               </div>
//               <div className="flex gap-2">
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     onCancel(cancelAmount);
//                     setShowCancelInput(false);
//                   }}
//                   className="flex-1 bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
//                 >
//                   Confirm
//                 </button>
//                 <button
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     setShowCancelInput(false);
//                   }}
//                   className="flex-1 bg-white/10 text-white py-2 rounded-lg text-xs font-bold transition-all hover:bg-white/20"
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </div>
//           ) : hasPartialListing ? (
//             <div className="flex gap-2">
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   onList();
//                 }}
//                 className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
//               >
//                 List More
//               </button>
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setShowCancelInput(true);
//                   setCancelAmount(Math.min(1, listedAmount));
//                 }}
//                 className="flex-1 bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
//               >
//                 Cancel
//               </button>
//             </div>
//           ) : isListed ? (
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 setShowCancelInput(true);
//                 setCancelAmount(Math.min(1, listedAmount));
//               }}
//               className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
//             >
//               Cancel
//             </button>
//           ) : (
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 onList();
//               }}
//               className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white py-3 rounded-lg text-sm font-bold transition-all hover:scale-105"
//             >
//               List
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// function MarketNFTCard({ listing, onBuy, onCancel, onDetail, isOwner }: { listing: MarketNFT; onBuy: () => void; onCancel: (amount: number) => void; onDetail: () => void; isOwner: boolean }) {
//   const priceInEth = Number(listing.price || "0").toFixed(2);

//   return (
//     <div className=" group relative m-4 " onClick={onDetail}>
//       <div className="absolute -inset-3  bg-white/15  backdrop-blur-md shadow-lg " />
//       <div
//         className="relative overflow-hidden transition-all duration-500 cursor-pointer border"
//         style={{
//           background: "linear-gradient(180deg, #2a2a3e 0%, #1a1a2e 100%)",
//           border: "none",
//         }}
//       >
//         <div className="relative h-56  overflow-hidden">
//           <Image src={listing.metadata?.image || "/nft-placeholder.png"} alt={listing.metadata?.name || "NFT"} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />

//           {/* 등록 수량 - 오른쪽 상단 */}
//           {listing.listedAmount !== undefined && listing.listedAmount > 0 && <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-white/20">{listing.listedAmount} listed</div>}

//           {/* 가격 정보 - 하단 오버레이  */}
//           <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 pt-8">
//             <div className="flex justify-between items-center">
//               <div>
//                 <div className="text-gray-400 text-xs mb-1">Current Bid</div>
//                 <div className="text-white font-bold text-lg">{priceInEth} Very</div>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="p-4 bg-white/10  ">
//           <h3 className="font-bold text-2xl text-white mb-2 truncate">{listing.metadata?.name}</h3>
//           <p className="text-purple-300 text-sm mb-1">
//             @{listing.seller_address.slice(0, 7)}...{listing.seller_address.slice(-5)}
//           </p>
//           <p className="text-gray-400 text-xs mb-3 line-clamp-1">{listing.metadata?.description}</p>

//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               onBuy();
//             }}
//             className="w-full bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 text-white py-3 rounded-lg text-sm font-bold hover:scale-105 transition-all"
//           >
//             Buy
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function DetailModal({ nft, onClose, wallet, onBuy }: { nft: NFT | MarketNFT; onClose: () => void; wallet: any; onBuy: () => void }) {
//   const isMarketNFT = "seller_address" in nft;
//   const metadata = isMarketNFT ? (nft as MarketNFT).metadata : nft;
//   const price = isMarketNFT ? (nft as MarketNFT).price : undefined;
//   const sellerAddress = isMarketNFT ? (nft as MarketNFT).seller_address : undefined;
//   const tokenId = isMarketNFT ? (nft as MarketNFT).token_id : (nft as NFT).tokenId;
//   const contractAddress = isMarketNFT ? (nft as MarketNFT).contract_address : (nft as NFT).contractAddress;
//   const category = metadata && typeof metadata === "object" && "category" in metadata ? metadata.category : getCategoryFromNFT(tokenId);

//   return (
//     <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
//       <div className="relative max-w-4xl w-full">
//         <div className="absolute -inset-1 bg-gradient-to-r from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] rounded-3xl blur-2xl opacity-30"></div>
//         <div className="relative bg-[#13141a] border border-white/10 rounded-3xl p-8 max-h-[90vh] overflow-y-auto">
//           <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all flex items-center justify-center text-2xl z-10">
//             ×
//           </button>

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//             {/* Image Section */}
//             <div>
//               <div className="relative aspect-square rounded-2xl overflow-hidden mb-4">
//                 <Image src={metadata?.image || "/nft-placeholder.png"} alt={metadata?.name || "NFT"} fill className="object-cover" unoptimized />
//               </div>
//             </div>

//             {/* Info Section */}
//             <div>
//               <div className="mb-6">
//                 <p className="text-gray-400 text-sm mb-2">{category || "NFT"}</p>
//                 <h2 className="text-4xl font-black text-white mb-4">{metadata?.name || `NFT #${tokenId}`}</h2>
//                 <p className="text-gray-400 text-sm leading-relaxed">{metadata?.description || "No description available"}</p>
//               </div>

//               {/* Properties */}
//               <div className="bg-white/5 rounded-2xl p-4 mb-6">
//                 <h3 className="text-white font-bold mb-3">Properties</h3>
//                 <div className="space-y-2 text-sm">
//                   <div className="flex justify-between">
//                     <span className="text-gray-400">Token ID</span>
//                     <span className="text-white font-mono">#{tokenId}</span>
//                   </div>
//                   <div className="flex justify-between">
//                     <span className="text-gray-400">Contract</span>
//                     <span className="text-white font-mono text-xs">
//                       {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
//                     </span>
//                   </div>
//                   {isMarketNFT && sellerAddress && (
//                     <div className="flex justify-between">
//                       <span className="text-gray-400">Owner</span>
//                       <span className="text-white font-mono text-xs">
//                         {sellerAddress.slice(0, 6)}...{sellerAddress.slice(-4)}
//                       </span>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Price & Action */}
//               {isMarketNFT && price && (
//                 <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 mb-6">
//                   <p className="text-green-400 text-sm font-semibold mb-2">Current Price</p>
//                   <p className="text-white text-5xl font-black mb-4">{Number(price).toFixed(4)} Very</p>

//                   {wallet?.address?.toLowerCase() !== sellerAddress?.toLowerCase() && (
//                     <button
//                       onClick={() => {
//                         onClose();
//                         onBuy();
//                       }}
//                       className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all"
//                     >
//                       Buy Now
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function ListModal({ nft, onClose, onSubmit }: { nft: NFT; onClose: () => void; onSubmit: (data: { price: string; amount: number }) => void }) {
//   const [price, setPrice] = useState("");
//   const [amount, setAmount] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const maxAmount = parseInt(nft.balance || "1");

//   const handleSubmit = async () => {
//     if (!price || parseFloat(price) <= 0) {
//       toast.error("Please enter a valid price");
//       return;
//     }
//     if (amount <= 0 || amount > maxAmount) {
//       toast.error(`Amount must be between 1 and ${maxAmount}`);
//       return;
//     }
//     setLoading(true);
//     try {
//       await onSubmit({ price, amount });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
//       <div className="relative max-w-lg w-full">
//         <div className="absolute -inset-1 bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] rounded-3xl blur-2xl opacity-30"></div>
//         <div className="relative bg-[#13141a] border border-white/10 rounded-3xl p-8">
//           <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all flex items-center justify-center text-2xl">
//             ×
//           </button>

//           <h2 className="text-3xl font-black mb-6">
//             <span className="bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] bg-clip-text text-transparent">List NFT</span>
//           </h2>

//           <div className="mb-6 relative h-64 rounded-2xl overflow-hidden">
//             <Image src={nft.image} alt={nft.name} fill className="object-cover" unoptimized />
//           </div>

//           <div className="space-y-5">
//             <div>
//               <label className="block text-sm font-bold text-gray-300 mb-3">Price (Very)</label>
//               <input type="number" step="0.001" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:border-purple-500/50" />
//             </div>

//             <div>
//               <label className="block text-sm font-bold text-gray-300 mb-3">Amount (Max: {maxAmount})</label>
//               <input type="number" min="1" max={maxAmount} value={amount} onChange={(e) => setAmount(Math.min(parseInt(e.target.value) || 1, maxAmount))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:border-purple-500/50" />
//             </div>

//             <button onClick={handleSubmit} disabled={!price || loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold disabled:opacity-50 hover:scale-105 transition-all">
//               {loading ? "Listing..." : `List for ${(parseFloat(price || "0") * amount).toFixed(4)} Very`}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function BuyModal({ listing, onClose, onBuy }: { listing: MarketNFT; onClose: () => void; onBuy: (amount: number) => void }) {
//   const [amount, setAmount] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const pricePerUnit = Number(listing.price || "0");
//   const totalPrice = pricePerUnit * amount;
//   const maxAmount = listing.listedAmount || 1;

//   const handleSubmit = async () => {
//     if (amount <= 0 || amount > maxAmount) {
//       toast.error(`Amount must be between 1 and ${maxAmount}`);
//       return;
//     }
//     setLoading(true);
//     try {
//       await onBuy(amount);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
//       <div className="relative max-w-lg w-full">
//         <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl blur-2xl opacity-30"></div>
//         <div className="relative bg-[#13141a] border border-white/10 rounded-3xl p-8">
//           <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all flex items-center justify-center text-2xl">
//             ×
//           </button>

//           <h2 className="text-3xl font-black mb-6">
//             <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">Buy NFT</span>
//           </h2>

//           <div className="mb-6 relative h-64 rounded-2xl overflow-hidden">
//             <Image src={listing.metadata?.image || "/nft-placeholder.png"} alt={listing.metadata?.name || "NFT"} fill className="object-cover" unoptimized />
//           </div>

//           <div className="space-y-5">
//             <div>
//               <label className="block text-sm font-bold text-gray-300 mb-3">Amount (Max: {maxAmount})</label>
//               <input type="number" min="1" max={maxAmount} value={amount} onChange={(e) => setAmount(Math.min(parseInt(e.target.value) || 1, maxAmount))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-lg focus:outline-none focus:border-green-500/50" />
//             </div>

//             <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
//               <p className="text-green-400 text-sm font-bold mb-2">Total Payment</p>
//               <p className="text-white text-4xl font-black">{totalPrice.toFixed(4)} Very</p>
//             </div>

//             <button onClick={handleSubmit} disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-lg disabled:opacity-50 hover:scale-105 transition-all">
//               {loading ? "Processing..." : `Buy ${amount} NFT${amount > 1 ? "s" : ""}`}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
