import WalletButton from "../WModal/WalletButton";

export default function Slippage() {
  return (
    <div className="max-w-md mx-auto p-2 mt-7 rounded-2xl shadow-xl backdrop-blur-md bg-white/5 border border-white/10 flex flex-col items-center space-y-4 ">
      <div className="flex items-center justify-center  text-white font-semibold">
        Connect Wallet
        <WalletButton />
      </div>
    </div>
  );
}
