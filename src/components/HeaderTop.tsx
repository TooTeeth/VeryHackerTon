"use client";

import Image from "next/image";
import Link from "next/link";
import WalletButton from "./WModal/WalletButton";
import ThemeToggle from "./DarkMode/ThemeToggle";
import { baloo } from "../styles/font";

export default function Headertop() {
  // const [isOpen, setIsOpen] = useState(true);
  // const [isScrolled, setIsScrolled] = useState(false);

  // // ✅ 스크롤 시 블러 효과 감지
  // useEffect(() => {
  //   const handleScroll = () => {
  //     setIsScrolled(window.scrollY > 50); // 50px 이상 스크롤 시 블러 켜기
  //   };
  //   window.addEventListener("scroll", handleScroll);
  //   return () => window.removeEventListener("scroll", handleScroll);
  // }, []);

  // // ✅ 버튼 위치 동적 계산
  // const buttonTop = isOpen ? "top-[64px]" : "top-0";

  return (
    <div>
      {/* ✅ 접기/펼치기 버튼 */}
      {/* <button onClick={() => setIsOpen(!isOpen)} className={`fixed right-1/2 + translate-x-[45%] z-[60]  text-white p-2 rounded-b-lg hover:bg-gray-400 transition-all duration-300 ${buttonTop}`}>
        {isOpen ? <IoChevronUpCircleOutline className="w-6 h-6" /> : <IoChevronDownCircleOutline className="w-6 h-6" />}
      </button>

      {/* ✅ 헤더 */}
      {/* <div
        className={`fixed left-0 w-full z-50 border-b border-gray-400 px-4 transition-all duration-300 overflow-hidden ${isOpen ? "h-16 opacity-100" : "h-0 opacity-0"} ${
          isScrolled
            ? "bg-black/40 backdrop-blur-md" // 스크롤 시 블러 켜짐
            : "bg-transparent backdrop-blur-0" // 처음엔 투명
        }`}
      > */}
      <div className="flex items-center justify-between h-16">
        {/* 로고 */}
        <div className="flex items-center">
          <Link href={"/"}>
            <Image src="/VTDNLogo.png" alt="Logo" width={60} height={60} />
          </Link>
          <Link href={"/"}>
            <div className={`${baloo.className} font-extrabold text-3xl mt-4 text-transparent bg-gradient-to-r from-[#f97171] to-[#8a82f6] bg-clip-text`}>VTDN</div>
          </Link>
        </div>

        {/* 메뉴 */}
        <nav className="flex space-x-10 flex-1 justify-start ml-10 mt-2 text-white mix-blend-difference">
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
        <div className="flex items-center space-x-4 flex-1 justify-end mr-5">
          <WalletButton modalPosition="dropdown" />
          <ThemeToggle />
        </div>
      </div>
    </div>
    // </>
  );
}
