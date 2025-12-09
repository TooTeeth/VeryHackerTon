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
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",

        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "2rem",
          maxWidth: "min(90%, 1400px)",
          width: "100%",
        }}
      >
        {/* 이미지 */}
        <div>
          <Image src="/VTDNLogo.png" alt="Logo background" width={600} height={600} style={{ objectFit: "contain" }} />
        </div>

        {/* 텍스트 + 버튼 전체 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* 큰 제목 */}
          <div
            style={{
              fontSize: "clamp(1.3rem, 3vw, 4rem)",
              background: "linear-gradient(to right, #f472b6, #8b5cf6, #3b82f6)",
              WebkitBackgroundClip: "text",
              lineHeight: "clamp(1.5rem, 3vw, 5rem)",
              color: "transparent",
              textAlign: "left",
            }}
          >
            <strong>VTDN</strong> is a{" "}
            <strong>
              text-based <br /> tabletop RPG
            </strong>
            <br />
            built on the <strong>Very Network</strong>.
          </div>

          {/* 본문 텍스트 */}
          <div
            style={{
              fontSize: "clamp(1rem, 1vw, 1.5rem)",
              marginTop: "1rem",
              maxWidth: "1000px",
              lineHeight: "1.5",
              textAlign: "left",
            }}
          >
            Decide the rules of the world through <strong>DAO</strong>, and own items, characters, and lore as <strong>NFTs</strong>.
            <br />
            Test your fate with dice, and shape the story through collective <strong>votes</strong>.
            <br />
            Your decisions become the truth of this world.
          </div>

          {/* 버튼 */}
          <div
            style={{
              marginTop: "2rem",
              position: "relative",
              zIndex: 3,
            }}
          >
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
                  padding: "clamp(0.75rem, 2vw, 1rem) clamp(1.5rem, 3vw, 2.5rem)",
                  minWidth: "120px",
                  fontSize: "clamp(0.9rem, 1.5vw, 1.2rem)",
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
