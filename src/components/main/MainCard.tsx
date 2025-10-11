import { GiLeafSwirl } from "react-icons/gi";
import CarouselComponent from "./CarouselComponent";

export default function MainCard() {
  return (
    <section
      id="Explain-section"
      style={{
        position: "relative",
        minHeight: "100vh",
        scrollSnapAlign: "start",
        backgroundImage: "url('/Mainpage/era/era-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        justifyContent: "flex-start", // 세로 정렬
        alignItems: "center",
        flexDirection: "column",
        paddingTop: "15vh", // 글씨+캐러셀 겹치지 않게
      }}
    >
      {/* 텍스트 영역 */}
      <div
        className="text-white text-center z-20"
        style={{
          fontSize: "clamp(1.7rem, 2vw, 1.5rem)",
          maxWidth: "90%",
          maxHeight: "30vh", // 글씨 영역 최대 높이 제한
          overflowWrap: "break-word",
          lineHeight: 1.2,
          marginBottom: "5vh",
        }}
      >
        <p className="text-2xl md:text-4xl  mb-5">DEFINE YOUR LEGACY</p>
        <p>THE ERA · GENRE YOU CHOOSE SHAPES YOUR PATH</p>
      </div>

      {/* 캐러셀 */}
      <CarouselComponent />

      {/* 아래 장식 */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white">
        <GiLeafSwirl size={50} />
      </div>
    </section>
  );
}
