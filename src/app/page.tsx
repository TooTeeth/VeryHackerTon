import Explain from "../components/main/Explain";
import MainCard from "../components/main/MainCard";
import VideoBackGrounds from "../components/main/VideoBackGrounds";

export default function Home() {
  return (
    <div
      className="hide-bar"
      style={{
        height: "100vh",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
      }}
    >
      <section id="section1" className="relative">
        <VideoBackGrounds />
      </section>

      <section id="Explain-section" className="relative">
        <Explain />
      </section>
      <section id="MainCard-section" className="relative">
        <MainCard />
      </section>
    </div>
  );
}
