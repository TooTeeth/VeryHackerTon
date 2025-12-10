"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { ethers } from "ethers";
import { fetchUserNFTs, NFT, NFTContract } from "../../../lib/nftService";
import { useWallet } from "../../context/WalletContext";
import { createListing, createTransaction, getActiveListings, Listing } from "../../../lib/supabaseMarketplace";

const NFT_CONTRACT_LIST: NFTContract[] = [
  { address: "0x3111565FCf79fD5b47AD5fe176AaB69C86Cc73FA", type: "ERC721" },
  { address: "0x1c1852FF164e169fFE759075384060BD26183724", type: "ERC1155" },
  { address: "0x40E3b5A7d76B1b447A98a5287a153BBc36C1615E", type: "ERC1155" },
];

const MARKETPLACE_ADDRESS = "0xe7ab0d36191aF4f5d9ACD98210544fAC48A09eC1";

const MARKETPLACE_ABI = ["function list(address nft, uint256 tokenId, uint256 price, uint256 amount) external", "function cancel(address nft, uint256 tokenId, uint256 amount) external", "function listedAmount(address nft, uint256 tokenId) external view returns (uint256)"];

const ERC1155_ABI = ["function isApprovedForAll(address owner, address operator) external view returns (bool)", "function setApprovalForAll(address operator, bool approved) external", "function balanceOf(address account, uint256 id) external view returns (uint256)"];

interface NFTWithListing extends NFT {
  listing?: Listing;
  listedAmount?: number;
}

type TabType = "available" | "listed";

export default function RegisterPage() {
  const { wallet } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [listedNFTs, setListedNFTs] = useState<NFTWithListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<NFTWithListing | null>(null);
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState(1);
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("available");
  const [cancelAmount, setCancelAmount] = useState(1);

  useEffect(() => {
    if (wallet?.address) {
      loadNFTs();
    }
  }, [wallet]);

  const loadNFTs = async () => {
    if (!wallet?.address) return;

    setLoading(true);
    try {
      const userNFTs = await fetchUserNFTs(wallet.address, NFT_CONTRACT_LIST);

      // 등록된 NFT 정보 가져오기
      const allListings = await getActiveListings();
      const myListings = allListings.filter((l) => l.seller_address.toLowerCase() === wallet.address.toLowerCase());

      const listedNFTsData: NFTWithListing[] = [];
      const availableNFTsData: NFT[] = [];

      for (const nft of userNFTs) {
        const listing = myListings.find((l) => l.contract_address === nft.contractAddress && l.token_id === nft.tokenId);

        if (listing && window.ethereum) {
          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
            const listedAmount = await marketplace.listedAmount(nft.contractAddress, nft.tokenId);

            if (Number(listedAmount) > 0) {
              listedNFTsData.push({
                ...nft,
                listing,
                listedAmount: Number(listedAmount),
              });
            }
          } catch (err) {
            console.warn("Listed amount 조회 실패:", err);
          }
        }

        // 보유 수량이 있으면 available에 추가
        const totalBalance = parseInt(nft.balance || "1");
        if (totalBalance > 0) {
          availableNFTsData.push(nft);
        }
      }

      setNfts(availableNFTsData);
      setListedNFTs(listedNFTsData);
    } catch (error: any) {
      console.error("NFT 로드 실패:", error);
      toast.error(error?.message || "NFT를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedNFT || !wallet?.address || !window.ethereum) return;

    if (!price || parseFloat(price) <= 0) {
      toast.error("올바른 가격을 입력하세요");
      return;
    }

    const maxAmount = parseInt(selectedNFT.balance || "1");
    if (amount <= 0 || amount > maxAmount) {
      toast.error(`수량은 1~${maxAmount} 사이여야 합니다`);
      return;
    }

    setRegistering(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const nftAddress = selectedNFT.contractAddress;
      const tokenId = selectedNFT.tokenId;
      const priceInWei = ethers.parseEther(price);

      const nft1155 = new ethers.Contract(nftAddress, ERC1155_ABI, signer);

      toast.info("NFT 권한 확인 중...");
      const isApproved = await nft1155.isApprovedForAll(wallet.address, MARKETPLACE_ADDRESS);

      if (!isApproved) {
        toast.info("마켓플레이스 승인 필요 - MetaMask 확인하세요");
        const approveTx = await nft1155.setApprovalForAll(MARKETPLACE_ADDRESS, true);
        toast.info("승인 트랜잭션 대기 중...");
        await approveTx.wait();
        toast.success("✅ 마켓플레이스 승인 완료!");
      }

      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      toast.info(`NFT ${amount}개 등록 중...`);
      const listTx = await marketplace.list(nftAddress, tokenId, priceInWei, amount);
      toast.info("등록 트랜잭션 대기 중...");
      const receipt = await listTx.wait();

      toast.success("🎉 블록체인 등록 완료!");

      toast.info("데이터베이스 저장 중...");

      await createListing({
        contract_address: nftAddress,
        token_id: tokenId,
        seller_address: wallet.address,
        sale_type: "fixed",
        price: priceInWei.toString(),
        status: "active",
      });

      await createTransaction({
        contract_address: nftAddress,
        token_id: tokenId,
        from_address: wallet.address,
        to_address: MARKETPLACE_ADDRESS,
        price: priceInWei.toString(),
        transaction_hash: receipt.hash,
        transaction_type: "sale",
      });

      toast.success("✅ NFT 등록 완료!");

      // Reset form
      setSelectedNFT(null);
      setPrice("");
      setAmount(1);

      await loadNFTs();
    } catch (error: any) {
      console.error("등록 실패:", error);
      let errorMsg = "등록에 실패했습니다";
      if (error.code === "ACTION_REJECTED") {
        errorMsg = "사용자가 트랜잭션을 거부했습니다";
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast.error(errorMsg);
    } finally {
      setRegistering(false);
    }
  };

  const handleCancel = async (nft: NFTWithListing) => {
    if (!wallet?.address || !window.ethereum || !nft.listedAmount) return;

    if (cancelAmount <= 0 || cancelAmount > nft.listedAmount) {
      toast.error(`취소 수량은 1~${nft.listedAmount} 사이여야 합니다`);
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      toast.info(`${cancelAmount}개 취소 중...`);
      const tx = await marketplace.cancel(nft.contractAddress, nft.tokenId, cancelAmount);
      await tx.wait();

      toast.success("✅ 취소 완료!");
      setCancelAmount(1);
      await loadNFTs();
    } catch (error: any) {
      console.error("취소 실패:", error);
      toast.error(error.message || "취소에 실패했습니다");
    }
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-white mb-4">NFT 등록</h1>
          <p className="text-zinc-400 mb-6">NFT를 등록하려면 먼저 지갑을 연결해주세요</p>
        </div>
      </div>
    );
  }

  const currentList = activeTab === "available" ? nfts : listedNFTs;

  return (
    <div className="text-white min-h-screen p-6 bg-zinc-900">
      <ToastContainer position="top-right" autoClose={3000} theme="dark" toastStyle={{ marginTop: "80px" }} />

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 mt-20">
          <div>
            <h1 className="text-3xl font-bold mb-2">➕ NFT 등록하기</h1>
            <p className="text-zinc-400">보유한 NFT를 마켓플레이스에 등록하세요</p>
          </div>
          <Link href="/market">
            <button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-6 py-3 rounded-lg font-semibold transition transform hover:scale-105 shadow-lg">🛒 마켓플레이스로 돌아가기</button>
          </Link>
        </div>

        <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
          <p className="text-sm text-zinc-400">연결된 지갑</p>
          <p className="font-mono text-blue-400">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NFT Selection Panel */}
          <div className="bg-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">1️⃣ NFT 선택</h2>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setActiveTab("available");
                  setSelectedNFT(null);
                }}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${activeTab === "available" ? "bg-blue-600 text-white" : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"}`}
              >
                보유 중 ({nfts.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab("listed");
                  setSelectedNFT(null);
                }}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${activeTab === "listed" ? "bg-green-600 text-white" : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"}`}
              >
                등록 중 ({listedNFTs.length})
              </button>
            </div>

            {loading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-4 text-zinc-400">NFT 불러오는 중...</p>
              </div>
            ) : currentList.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-2">📦</div>
                <p className="text-zinc-400">{activeTab === "available" ? "보유한 NFT가 없습니다" : "등록된 NFT가 없습니다"}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {currentList.map((nft) => {
                  const key = `${nft.contractAddress}-${nft.tokenId}`;
                  const isSelected = selectedNFT?.contractAddress === nft.contractAddress && selectedNFT?.tokenId === nft.tokenId;
                  const nftWithListing = nft as NFTWithListing;

                  return (
                    <button key={key} onClick={() => setSelectedNFT(nftWithListing)} className={`w-full flex items-center gap-4 p-3 rounded-lg border-2 transition ${isSelected ? "border-blue-500 bg-blue-600/20" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <Image src={nft.image} alt={nft.name} fill className="object-cover rounded" unoptimized />
                        {activeTab === "listed" && nftWithListing.listedAmount && <div className="absolute -top-1 -right-1 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">{nftWithListing.listedAmount}개</div>}
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold">{nft.name}</h3>
                        <p className="text-xs text-zinc-400 truncate">{nft.description}</p>
                        {nft.tokenType === "ERC1155" && <p className="text-xs text-purple-400 mt-1">{activeTab === "available" ? `보유: ${nft.balance}개` : `판매 중: ${nftWithListing.listedAmount}개`}</p>}
                        {activeTab === "listed" && nftWithListing.listing && <p className="text-xs text-green-400 mt-1">{(parseInt(nftWithListing.listing.price || "0") / 1e18).toFixed(4)} ETH</p>}
                      </div>
                      {isSelected && <div className="text-2xl">✔</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Panel */}
          <div className="bg-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">{activeTab === "available" ? "2️⃣ 판매 정보 입력" : "2️⃣ 등록 취소"}</h2>

            {selectedNFT ? (
              <div className="space-y-6">
                <div className="bg-zinc-900 rounded-lg p-4">
                  <p className="text-sm text-zinc-400 mb-2">선택한 NFT</p>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24">
                      <Image src={selectedNFT.image} alt={selectedNFT.name} fill className="object-cover rounded" unoptimized />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedNFT.name}</h3>
                      <p className="text-sm text-zinc-400">{selectedNFT.description}</p>
                      {selectedNFT.tokenType === "ERC1155" && <p className="text-sm text-purple-400 mt-1">{activeTab === "available" ? `보유: ${selectedNFT.balance}개` : `판매 중: ${selectedNFT.listedAmount}개`}</p>}
                    </div>
                  </div>
                </div>

                {activeTab === "available" ? (
                  // 등록 폼
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">판매 가격 (ETH/개)</label>
                      <input type="number" step="0.001" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-3 text-white" />
                      <p className="text-xs text-zinc-400 mt-1">개당 판매 가격을 ETH로 입력하세요</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">판매 수량 (최대: {selectedNFT.balance || "1"})</label>
                      <input type="number" min="1" max={parseInt(selectedNFT.balance || "1")} value={amount} onChange={(e) => setAmount(Math.min(parseInt(e.target.value) || 1, parseInt(selectedNFT.balance || "1")))} className="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-3 text-white" />
                      <p className="text-xs text-zinc-400 mt-1">판매할 NFT 수량을 입력하세요</p>
                    </div>

                    <div className="bg-blue-600/20 border border-blue-600 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">ℹ️</div>
                        <div className="flex-1">
                          <p className="text-blue-400 font-semibold mb-2">등록 안내</p>
                          <ul className="text-sm text-zinc-300 space-y-1">
                            <li>• NFT가 마켓플레이스로 전송됩니다</li>
                            <li>• 판매가 완료되면 ETH를 받게 됩니다</li>
                            <li>• 언제든지 판매를 취소할 수 있습니다</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {price && amount && (
                      <div className="bg-green-600/20 border border-green-600 rounded-lg p-4">
                        <p className="text-green-400 text-sm mb-1">예상 총 판매 금액</p>
                        <p className="text-white text-2xl font-bold">{(parseFloat(price) * amount).toFixed(4)} ETH</p>
                      </div>
                    )}

                    <button onClick={handleRegister} disabled={!price || registering} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 text-white py-4 rounded-lg font-semibold transition transform hover:scale-105 disabled:transform-none">
                      {registering ? "등록 중..." : `${amount}개 등록하기`}
                    </button>
                  </>
                ) : (
                  // 취소 폼
                  <>
                    {selectedNFT.listing && (
                      <div className="bg-green-600/20 border border-green-600 rounded-lg p-4">
                        <p className="text-green-400 text-sm mb-1">현재 판매가</p>
                        <p className="text-white text-2xl font-bold">{(parseInt(selectedNFT.listing.price || "0") / 1e18).toFixed(4)} ETH</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">취소 수량 (최대: {selectedNFT.listedAmount || "1"})</label>
                      <input type="number" min="1" max={selectedNFT.listedAmount || 1} value={cancelAmount} onChange={(e) => setCancelAmount(Math.min(parseInt(e.target.value) || 1, selectedNFT.listedAmount || 1))} className="w-full bg-zinc-700 border border-zinc-600 rounded px-4 py-3 text-white" />
                      <p className="text-xs text-zinc-400 mt-1">취소할 NFT 수량을 입력하세요</p>
                    </div>

                    <div className="bg-orange-600/20 border border-orange-600 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">⚠️</div>
                        <div className="flex-1">
                          <p className="text-orange-400 font-semibold mb-2">취소 안내</p>
                          <ul className="text-sm text-zinc-300 space-y-1">
                            <li>• NFT가 다시 지갑으로 돌아옵니다</li>
                            <li>• 취소 후 다시 등록할 수 있습니다</li>
                            <li>• 가스비가 발생합니다</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <button onClick={() => handleCancel(selectedNFT)} className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 rounded-lg font-semibold transition transform hover:scale-105">
                      {cancelAmount}개 등록 취소하기
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">👈</div>
                <p className="text-zinc-400">{activeTab === "available" ? "왼쪽에서 등록할 NFT를 선택하세요" : "왼쪽에서 취소할 NFT를 선택하세요"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
