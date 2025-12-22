"use client";

import { useWallet } from "../context/WalletContext";
import { logoutFromWepin } from "../../lib/wepin";
import EmptyWalletState from "../../components/Market/EmptyWalletState";
import MarketplaceContainer from "../../components/Market/MarketplaceContainer";

export default function MarketplacePage() {
  const { wallet, setWallet } = useWallet();

  const handleDisconnect = async () => {
    if (wallet?.type === "wepin") {
      await logoutFromWepin();
    }
    if (wallet?.type === "metamask" && typeof window !== "undefined" && window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (err) {
        console.error("MetaMask 권한 제거 실패", err);
      }
    }
    localStorage.setItem("disconnectedManually", "true");
    localStorage.removeItem("connectedWallet");
    setWallet(null);
  };

  if (!wallet) {
    return <EmptyWalletState />;
  }

  return <MarketplaceContainer wallet={wallet} onDisconnect={handleDisconnect} />;
}
