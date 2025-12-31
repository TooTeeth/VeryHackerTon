"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "./WModal/WalletButton";
import ThemeToggle from "./DarkMode/ThemeToggle";
import { baloo } from "../styles/font";

export default function Headertop() {
  const pathname = usePathname();

  // /vygddrasil/start 경로에서는 헤더 숨김
  if (pathname === "/vygddrasil/start") {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-black/20">
      <div className="flex items-center justify-between h-12 px-4">
        {/* 로고 */}
        <div className="flex items-center">
          <Link href="/">
            <Image src="/VTDNLogo.png" alt="Logo" width={48} height={48} />
          </Link>
          <Link href="/">
            <div className={`${baloo.className} font-extrabold text-3xl mt-3 text-transparent bg-gradient-to-r from-[#f97171] to-[#8a82f6] bg-clip-text`}>VTDN</div>
          </Link>
        </div>

        {/* 메뉴 */}
        <nav className="flex space-x-10 flex-1 justify-start ml-10 mt-2 text-white">
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
          <Link href="/more" className="hover:text-sky-500 font-semibold">
            More
          </Link>
        </nav>

        {/* 오른쪽 버튼 */}
        <div className="flex items-center space-x-4">
          <WalletButton modalPosition="dropdown" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
