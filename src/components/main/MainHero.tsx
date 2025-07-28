"use client";

import { useState } from "react";
import { CgScrollV } from "react-icons/cg";

export default function MainHero() {
  const [overlayVisible, setOverlayVisible] = useState(true);
  return (
    <div
      style={{
        height: "auto",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
      }}
    >
      {/* SECTION 1*/}
      <section
        style={{
          position: "relative",
          height: "100vh",
          scrollSnapAlign: "start",
          backgroundImage: "url('/Mainpage/MainBanner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        {/* 이미지 위 텍스트 */}
        <div
          className="flex flex-col"
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
            fontSize: "2.5rem",
            fontWeight: "bold",
            textShadow: ` 2px 2px 4px rgba(0,0,0,0.9),0 0 5px rgba(255,255,255,0.3),1px 1px 1px rgba(0,0,0,0.9)`,
          }}
        >
          <div>Envision Your Destiny</div>
          <div>Reap Your Very</div>
          <div>Mint Your NFT</div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "40px", // 바닥에서 살짝 띄움
            left: "50%",
            transform: "translateX(-50%)",
            color: "white",
            fontSize: "2rem",
            textShadow: "1px 1px 3px rgba(0, 0, 0, 0.8)",
            zIndex: 1,
            borderRadius: "12px",
          }}
        >
          <CgScrollV />
        </div>
      </section>

      <section
        style={{
          position: "relative",
          height: "110vh",
          scrollSnapAlign: "start",
          backgroundImage: "url('/Mainpage/MainHero.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        {/* 이미지 위 텍스트 */}
        <div
          className="flex flex-col"
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
            fontSize: "2rem",
            fontWeight: "bold",
            textShadow: ` 2px 2px 4px rgba(0,0,0,0.9),0 0 5px rgba(255,255,255,0.3),1px 1px 1px rgba(0,0,0,0.9)`,
          }}
        >
          <div>Envision Your Destiny</div>
          <div>Reap Your Very</div>
          <div>Mint Your NFT</div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "40px", // 바닥에서 살짝 띄움
            left: "50%",
            transform: "translateX(-50%)",
            color: "white",
            fontSize: "2rem",
            textShadow: "1px 1px 3px rgba(0, 0, 0, 0.8)",
            zIndex: 1,
            borderRadius: "12px",
          }}
        >
          <CgScrollV />
        </div>
      </section>

      {/* SECTION 2*/}
      <section
        style={{
          position: "relative", // 오버레이 기준
          height: "100vh",
          scrollSnapAlign: "start",
          backgroundImage: "url('/Mainpage/Era.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/*  오버레이 */}
        <div
          style={{
            position: "absolute",

            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            backdropFilter: "blur(10px) contrast(120%)",
            zIndex: 5,
            opacity: overlayVisible ? 1 : 0,
            pointerEvents: overlayVisible ? "auto" : "none",
            transition: "opacity 0.5s ease",
          }}
        />
        {overlayVisible && (
          <div>
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                padding: "10px 16px",
                color: "white",
                borderRadius: "8px",
                zIndex: 6,
                fontSize: "2rem",

                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "3.5vw", color: "#fff" }}>DEFINE YOUR LEGACY</div>
              <div style={{ fontSize: "1.5vw", color: "#ccc", marginTop: "8px" }}>THE ERA YOU CHOOSE SHAPES YOUR PATH</div>
            </div>
            <button
              onClick={() => setOverlayVisible(false)}
              style={{
                position: "absolute",
                top: "63%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                padding: "10px 16px",
                color: "white",
                border: "linear-gradient(90deg, #f97171, #8a82f6)",
                borderRadius: "8px",
                cursor: "pointer",
                zIndex: 6,
                whiteSpace: "nowrap",
                maxWidth: "150px",
                fontSize: "1rem",
                fontWeight: 700,
                backgroundImage: "linear-gradient(90deg, #f97171, #8a82f6)",
                display: "flex",
                justifyContent: "center",
              }}
            >
              Explore Your Era
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
