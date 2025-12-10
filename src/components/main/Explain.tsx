"use client";
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
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
      }}
    >
      {/* Animated background particles */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 20% 50%, rgba(244, 114, 182, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
          animation: "pulse 8s ease-in-out infinite",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "4rem",
          maxWidth: "min(90%, 1400px)",
          width: "100%",
          zIndex: 2,
        }}
      >
        {/* Logo with enhanced styling */}
        <div style={{ position: "relative" }}>
          {/* Glow effect behind logo */}
          <div
            style={{
              position: "absolute",
              inset: "-20%",
              background: "radial-gradient(circle, rgba(244, 114, 182, 0.3) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 70%)",
              filter: "blur(40px)",
              animation: "glow 4s ease-in-out infinite",
            }}
          />

          {/* Logo container with gradient border */}
          <div
            style={{
              position: "relative",
              padding: "3px",
              background: "linear-gradient(135deg, #f472b6, #8b5cf6, #3b82f6)",
              borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
              animation: "rotate 500s linear infinite",
            }}
          >
            <div
              style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)",
                borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
                padding: "2rem",
              }}
            >
              <Image
                src="/VTDNLogo.png"
                alt="VTDN Logo"
                width={500}
                height={500}
                style={{
                  objectFit: "contain",
                  filter: "drop-shadow(0 0 30px rgba(244, 114, 182, 0.5))",
                }}
              />
            </div>
          </div>
        </div>

        {/* Content section */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Title with enhanced gradient */}
          <div
            style={{
              fontSize: "clamp(2rem, 4vw, 4.5rem)",
              fontWeight: 900,
              background: "linear-gradient(135deg, #f472b6 0%, #c084fc 50%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1.2,
              textAlign: "left",
              letterSpacing: "-0.02em",
            }}
          >
            <div style={{ marginBottom: "0.5rem" }}>
              <span
                style={{
                  display: "inline-block",
                  textShadow: "0 0 40px rgba(244, 114, 182, 0.5)",
                }}
              >
                VTDN
              </span>
            </div>
            <div style={{ fontSize: "clamp(1.5rem, 3vw, 3rem)" }}>
              is a <span style={{ fontWeight: 700 }}>text-based</span>
              <br />
              <span style={{ fontWeight: 700 }}>tabletop RPG</span>
            </div>
            <div
              style={{
                fontSize: "clamp(1.2rem, 2.5vw, 2.5rem)",
                marginTop: "0.5rem",
              }}
            >
              built on the{" "}
              <span
                style={{
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                }}
              >
                Very Network
              </span>
            </div>
          </div>

          {/* Description with enhanced styling */}
          <div
            style={{
              fontSize: "clamp(1rem, 1.2vw, 1.3rem)",
              maxWidth: "700px",
              lineHeight: 1.8,
              textAlign: "left",
              color: "rgba(255, 255, 255, 0.9)",
              background: "rgba(255, 255, 255, 0.05)",
              backdropFilter: "blur(10px)",
              padding: "1.5rem",
              borderRadius: "1rem",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <p style={{ marginBottom: "1rem" }}>
              Decide the rules of the world through{" "}
              <strong
                style={{
                  background: "linear-gradient(135deg, #f472b6, #8b5cf6)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                DAO
              </strong>
              , and own items, characters, and lore as{" "}
              <strong
                style={{
                  background: "linear-gradient(135deg, #f472b6, #8b5cf6)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                NFTs
              </strong>
              .
            </p>
            <p style={{ marginBottom: "1rem" }}>
              Test your fate with dice, and shape the story through collective{" "}
              <strong
                style={{
                  background: "linear-gradient(135deg, #f472b6, #8b5cf6)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                votes
              </strong>
              .
            </p>
            <p
              style={{
                fontSize: "clamp(0.9rem, 1.1vw, 1.2rem)",
                fontStyle: "italic",
                color: "rgba(244, 114, 182, 0.9)",
              }}
            >
              Your decisions become the truth of this world.
            </p>
          </div>

          {/* Enhanced button */}
          <div style={{ marginTop: "1rem" }}>
            <Link href="/play" className="group inline-block">
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
              >
                {/* Glow effect */}
                <div
                  style={{
                    position: "absolute",
                    inset: "-4px",
                    background: "linear-gradient(135deg, #f472b6, #8b5cf6, #3b82f6)",
                    borderRadius: "2rem",
                    filter: "blur(20px)",
                    opacity: 0.6,
                    transition: "opacity 0.3s",
                  }}
                  className="group-hover:opacity-100"
                />

                {/* Button */}
                <div
                  style={{
                    position: "relative",
                    background: "linear-gradient(135deg, #f472b6, #8b5cf6)",
                    padding: "3px",
                    borderRadius: "2rem",
                    transition: "transform 0.3s",
                  }}
                  className="group-hover:scale-105"
                >
                  <div
                    style={{
                      background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
                      color: "white",
                      fontWeight: 700,
                      borderRadius: "calc(2rem - 3px)",
                      padding: "clamp(1rem, 2vw, 1.2rem) clamp(2.5rem, 4vw, 3.5rem)",
                      fontSize: "clamp(1rem, 1.5vw, 1.3rem)",
                      letterSpacing: "0.05em",
                      transition: "background 0.3s",
                    }}
                    className="group-hover:bg-transparent"
                  >
                    <span className="group-hover:text-white transition-colors">EXPLORE NOW</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes glow {
          0%,
          100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1024px) {
          section > div {
            flex-direction: column;
            gap: 2rem;
            padding: 2rem;
          }
        }
      `}</style>
    </section>
  );
}
