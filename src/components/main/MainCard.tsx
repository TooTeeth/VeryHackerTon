import { GiLeafSwirl } from "react-icons/gi";
import CarouselComponent from "./CarouselComponent";

export default function MainCard() {
  return (
    <section
      id="Explain-section"
      style={{
        position: "relative",
        height: "100vh",
        scrollSnapAlign: "start",
        backgroundImage: "url('/Mainpage/era/era-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "0 2rem",
      }}
    >
      <CarouselComponent />
      <div className="absolute bottom-0 left-1/2 z-10 transform -translate-x-1/2 -translate-y-1/2  text-white">
        <GiLeafSwirl size={50} />
      </div>
    </section>
  );
}
