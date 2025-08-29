import Slippage from "../../components/SwapPage/Slippage";
import SwapBox from "../../components/SwapPage/SwapBox";

export default function SwapPage() {
  return (
    <section
      style={{
        position: "relative",
        height: "100vh",
        scrollSnapType: "y mandatory",
      }}
    >
      <video className="absolute top-0 left-0 w-full h-full object-cover z-0" autoPlay muted loop playsInline>
        <source src="/videos/swapvideos/swapvideos.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="flex flex-col justify-center items-center min-h-screen relative z-10">
        <div
          className="w-full max-w-lg p-6 rounded-3xl shadow-2xl space-y-6 space-x relative"
          style={{
            backgroundColor: "rgba(0,0,0,0.5)",
            borderRadius: "24px",
            boxShadow: "0 0 30px rgba(255, 50, 70, 0.1)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-40px",
              right: "-40px",
              width: "120px",
              height: "120px",
              background: "radial-gradient(circle, rgba(255, 79, 79, 0.3), transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
              filter: "blur(40px)",
              zIndex: 0,
            }}
          />

          <div
            style={{
              position: "absolute",
              bottom: "-40px",
              left: "-40px",
              width: "120px",
              height: "120px",
              background: "radial-gradient(circle, rgba(255, 79, 180, 0.3), transparent 70%)",
              borderRadius: "50%",
              pointerEvents: "none",
              filter: "blur(40px)",
              zIndex: 0,
            }}
          />

          <div style={{ position: "relative", zIndex: 10 }}>
            <div className="w-full flex justify-center">
              <button className="p-3 rounded-lg cursor-default font-semibold text-2xl shadow-md text-white bg-none w-full">Swap</button>
            </div>
            <SwapBox />
            <Slippage />
          </div>
        </div>
      </div>
    </section>
  );
}
