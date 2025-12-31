import Explain from "../components/main/Explain";
import MainCard from "../components/main/MainCard";
import VideoBackGrounds from "../components/main/VideoBackGrounds";

export default function Home() {
  return (
    <div className="h-screen overflow-y-scroll no-scrollbar" style={{ scrollSnapType: "y mandatory" }}>
      <section id="section1" className="relative snap-start">
        <VideoBackGrounds />
      </section>

      <section id="Explain-section" className="relative snap-start">
        <Explain />
      </section>

      <section id="MainCard-section" className="relative snap-start">
        <MainCard />
      </section>
    </div>
  );
}
