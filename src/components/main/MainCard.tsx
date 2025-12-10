"use client";
import CarouselComponent from "./CarouselComponent";

export default function MainCard() {
  return (
    <section
      id="MainCard-section"
      style={{
        position: "relative",
        minHeight: "100vh",
        scrollSnapAlign: "start",
        backgroundImage: "url('/Mainpage/era/era-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        display: "flex",
        justifyContent: "flex-start",
        alignItems: "center",
        flexDirection: "column",
        paddingTop: "12vh",
        overflow: "hidden",
      }}
    >
      {/* Dark overlay for better text readability */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(10, 10, 20, 0.85) 50%, rgba(0, 0, 0, 0.9) 100%)",
          zIndex: 1,
        }}
      />

      {/* Animated gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(244, 114, 182, 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "float 8s ease-in-out infinite",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          right: "10%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "float 10s ease-in-out infinite reverse",
          zIndex: 1,
        }}
      />

      {/* Content container */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "1600px",
          padding: "0 2rem",
        }}
      >
        {/* Header section */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "4rem",
          }}
        >
          {/* Main title */}
          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 5rem)",
              fontWeight: 900,
              background: "linear-gradient(135deg, #f472b6 0%, #c084fc 50%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: "1.5rem",
              letterSpacing: "0.05em",
              textShadow: "0 0 80px rgba(244, 114, 182, 0.5)",
              animation: "fadeInDown 1s ease-out",
            }}
          >
            DEFINE YOUR LEGACY
          </h1>

          {/* Subtitle */}
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
                inset: "-10px",
                background: "linear-gradient(90deg, transparent, rgba(244, 114, 182, 0.3), transparent)",
                filter: "blur(20px)",
              }}
            />

            <p
              style={{
                position: "relative",
                fontSize: "clamp(1rem, 2vw, 1.5rem)",
                color: "rgba(255, 255, 255, 0.9)",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "1rem 2rem",
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(10px)",
                borderRadius: "2rem",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                animation: "fadeInUp 1s ease-out 0.3s both",
              }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg, #f472b6, #8b5cf6)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                THE ERA · GENRE
              </span>{" "}
              YOU CHOOSE SHAPES YOUR PATH
            </p>
          </div>
        </div>

        {/* Carousel section */}
        <div
          style={{
            animation: "fadeInUp 1s ease-out 0.6s both",
          }}
        >
          <CarouselComponent />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.1);
          }
        }

        @keyframes shimmer {
          0%,
          100% {
            opacity: 0.3;
            transform: translateX(-100%);
          }
          50% {
            opacity: 0.8;
            transform: translateX(100%);
          }
        }

        @media (max-width: 768px) {
          section {
            padding-top: 8vh;
          }
        }
      `}</style>
    </section>
  );
}
