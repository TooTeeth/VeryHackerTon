"use client";

import Link from "next/link";

export default function Explain() {
  return (
    <section
      id="Explain-section"
      style={{
        position: "relative",
        height: "100vh",
        scrollSnapAlign: "start",
        backgroundImage: "url('/Mainpage/VTDN3.png')",
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
      <div style={{ marginTop: "auto", paddingBottom: "80px", marginRight: "525px", marginBottom: "80px" }}>
        <Link href={"/play"} className="relative group inline-block">
          <span className="absolute inset-0 rounded-[1.5rem_0.5rem_1.5rem_0.5rem] bg-gradient-to-r from-pink-400 via-purple-500 to-blue-500" aria-hidden="true" />

          <span className="relative flex items-center justify-center bg-black text-white font-bold rounded-[1.5rem_0.5rem_1.5rem_0.5rem] m-0.5 px-10 py-4  min-w-[150px]">Explore</span>
        </Link>
      </div>
    </section>
  );
}
