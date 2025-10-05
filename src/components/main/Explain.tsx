import Image from "next/image";
import Link from "next/link";

export default function Explain() {
  return (
    <section
      id="Explain-section"
      style={{
        position: "relative",
        height: "100vh",
        scrollSnapAlign: "start",
        backgroundImage: "url('/Mainpage/explain/explain-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
        color: "white",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "4rem",
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            padding: "2rem",
            position: "relative",
            zIndex: 10,
            borderRadius: "1rem",
            backdropFilter: "blur(1px)",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* 빛 효과 */}
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

          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Image src="/VTDNLogo.png" alt="logo" width={300} height={300} />
          </div>

          {/* Text */}
          <div style={{ fontSize: "1.5rem", textAlign: "center", marginTop: "1.5rem", lineHeight: "2.25rem" }}>
            <p style={{ margin: "1rem 0" }}>
              is a <strong>text-based tabletop RPG</strong> built on the <strong>Very Network</strong>.
            </p>
            <p style={{ margin: "1rem 0" }}>
              Decide the rules of the world through <strong>DAO</strong>, and own items, characters, and lore as <strong>NFTs</strong>.
            </p>
            <p style={{ margin: "1rem 0" }}>
              Test your fate with dice, and shape the story through collective <strong>votes</strong>.
            </p>
            <p style={{ margin: "1rem 0" }}>Your decisions become the truth of this world.</p>
          </div>

          {/* Button */}
          <div style={{ marginTop: "2rem" }}>
            <Link href="/play" className="relative group inline-block">
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "1.5rem 0.5rem 1.5rem 0.5rem",
                  background: "linear-gradient(to right, #f472b6, #8b5cf6, #3b82f6)",
                  zIndex: -1,
                }}
                aria-hidden="true"
              />
              <span
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "black",
                  color: "white",
                  fontWeight: "bold",
                  borderRadius: "1.5rem 0.5rem 1.5rem 0.5rem",
                  margin: "0.125rem",
                  padding: "1rem 2.5rem",
                  minWidth: "150px",
                  zIndex: 1,
                }}
              >
                Explore
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
