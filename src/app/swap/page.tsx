"use client";

import { useState } from "react";
import { ToastContainer } from "react-toastify";
import ConnectWalletBox from "../../components/SwapPage/ConnectWalletBox";
import SwapBox from "../../components/SwapPage/SwapBox";
import GoldSwapBox from "../../components/SwapPage/GoldSwapBox";

export default function SwapPage() {
  const [swapMode, setSwapMode] = useState<"very" | "gold">("very");

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
            {/* Gold / Very */}
            <div className="w-full flex justify-center gap-4 mb-4">
              <button onClick={() => setSwapMode("gold")} className={`px-4 py-2 rounded-lg font-bold text-lg transition ${swapMode === "gold" ? "text-yellow-400 border-b-2 border-yellow-400" : "text-gray-400 hover:text-yellow-300"}`}>
                Gold
              </button>
              <button onClick={() => setSwapMode("very")} className={`px-4 py-2 rounded-lg font-bold text-lg transition ${swapMode === "very" ? "text-pink-400 border-b-2 border-pink-400" : "text-gray-400 hover:text-pink-300"}`}>
                Very
              </button>
            </div>

            <div className="w-full flex justify-center">
              <button className="p-3 rounded-lg cursor-default font-semibold text-2xl shadow-md text-white bg-none w-full mb-6">Swap</button>
            </div>
            <ToastContainer autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover toastStyle={{ marginTop: "80px" }} />
            {swapMode === "very" ? <SwapBox /> : <GoldSwapBox />}
            <ConnectWalletBox />
          </div>
        </div>
      </div>
    </section>
  );
}
