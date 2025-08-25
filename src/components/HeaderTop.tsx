import Image from "next/image";
import Link from "next/link";
import WalletButton from "./WModal/WalletButton";
import ThemeToggle from "./DarkMode/ThemeToggle";
import { baloo } from "../styles/font";
import MetaMaskConnect from "./MetaMaskConnect";

export default function Headertop() {
  return (
    <div className="flex items-center border-b border-gray-400 px-4 h-16  fixed top-0 left-0 w-full  z-50">
      {/* 왼쪽: 로고 + 텍스트 */}
      <div className="flex items-center">
        <Link href={"/"}>
          <Image src="/VTDNLogo.png" alt="Logo" width={60} height={60} />
        </Link>
        <Link href={"/"}>
          <div className={`${baloo.className} font-extrabold text-3xl mt-4 text-transparent bg-gradient-to-r from-[#f97171] to-[#8a82f6] bg-clip-text`}>VTDN</div>
        </Link>
      </div>

      {/* 가운데: 메뉴 */}
      <nav className="flex space-x-10 flex-1 justify-start  ml-10 mt-2 text-gray-200 dark:white">
        <Link href="/play" className="hover:text-red-500 font-semibold">
          Play
        </Link>
        <Link href="/market" className="hover:text-green-500 font-semibold">
          Market
        </Link>
        <Link href="/swap" className="hover:text-blue-500 font-semibold">
          Swap
        </Link>
        <Link href="/earn" className="hover:text-yellow-500 font-semibold">
          Earn
        </Link>
        <Link href="/voting" className="hover:text-purple-500 font-semibold">
          Voting
        </Link>
        <Link href="/more" className="hover:text-skyblue-500 font-semibold">
          More
        </Link>
      </nav>

      {/* 오른쪽: 버튼 및 아이콘 */}
      <div className="flex items-center space-x-4 flex-1 justify-end mr-5">
        <WalletButton />
        <ThemeToggle />
        <MetaMaskConnect />
      </div>
    </div>
  );
}
