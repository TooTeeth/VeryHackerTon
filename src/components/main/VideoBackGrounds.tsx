"use client";

import Image from "next/image";

export default function VideoBackGrounds() {
  return (
    <section
      style={{
        position: "relative",
        height: "100vh",
        scrollSnapAlign: "start",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        scrollSnapType: "y mandatory",
      }}
    >
      {/* Main Video */}
      <video className="absolute top-0 left-0 w-full h-full object-cover z-0" autoPlay muted loop playsInline>
        <source src="/videos/MainVideo.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Main Phrase */}
      <div
        className="absolute top-1/2 left-1/2 z-10 transform -translate-x-1/2 -translate-y-1/2 pb-20"
        style={{
          width: "1500px",
        }}
      >
        <Image src="/Mainpage/phrase2.png" alt="Main phrase" width={1920} height={846} priority />
      </div>
    </section>
  );
}
