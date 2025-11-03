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
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: "min(90%, 1400px)",
          width: "100%",
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 0,
          }}
        >
          <Image src="/Mainpage/explain/explain-background.png" alt="Logo background" width={1240} height={1240} />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 2,
          }}
        >
          <Image
            src="/VTDNLogo.png"
            alt="logo"
            width={0}
            height={0}
            sizes="100vw"
            style={{
              width: "clamp(150px, 25vw, 250px)",
              height: "auto",
            }}
          />
        </div>

        {/* ⚪ 텍스트 */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            fontSize: "clamp(1rem, 2vw, 1.5rem)",
            lineHeight: "clamp(1.5rem, 3vw, 2.25rem)",
            marginTop: "1rem",
            maxWidth: "900px",
          }}
        >
          <p>
            is a <strong>text-based tabletop RPG</strong> built on the <strong>Very Network</strong>.
          </p>
          <p style={{ margin: "1rem 0" }}>
            Decide the rules of the world through <strong>DAO</strong>, and own items, characters, and lore as <strong>NFTs</strong>.
          </p>
          <p style={{ margin: "1rem 0" }}>
            Test your fate with dice, and shape the story through collective <strong>votes</strong>.
          </p>
          <p>Your decisions become the truth of this world.</p>
        </div>

        {/* ⚪ 버튼 */}
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
    </section>
  );
}
