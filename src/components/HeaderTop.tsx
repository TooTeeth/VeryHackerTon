import Image from "next/image";
import Link from "next/link";

import WalletButton from "./WalletButton";

export default function Headertop() {
  return (
    <div className="flex ">
      <div className="HeaderStyle">
        <Link href={"/"}>
          <Image src="/VeryLogo.png" alt="Logo" width={50} height={50} priority />
        </Link>
      </div>
      <div className="HeaderStyle bg-red-200">
        <Link href={"/play"}>PLAY</Link>
      </div>
      <div className="HeaderStyle bg-green-200">
        <Link href={"/market"}>MARKET</Link>
      </div>
      <div className="HeaderStyle bg-blue-200">
        <Link href={"/swap"}>SWAP</Link>
      </div>

      <div className="HeaderStyle text-4xl bg-gray-200">
        <WalletButton />
      </div>
    </div>
  );
}
