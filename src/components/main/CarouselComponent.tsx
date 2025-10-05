"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/navigation";
import { EffectCoverflow, Navigation } from "swiper/modules";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
export default function CarouselComponent() {
  const slides = [
    {
      title: "Medieval fantasy",
      image: "/Mainpage/era/era-medieval-fantasy.png",
      video: "/videos/MedievalfantasyVideo.mp4",
      link: "/play",
    },
    {
      title: "CyberPunk",
      image: "/Mainpage/era/era-cyberpnk.png",
      video: "/videos/CyberVideo.mp4",
      link: "/play",
    },
    {
      title: "Medieval oriental",
      image: "/Mainpage/era/era-medieval-oriental.png",
      video: "/videos/MedievalorentalVideo.mp4",
      link: "/play",
    },
    {
      title: "Romance",
      image: "/Mainpage/era/era-romance.png",
      video: "/videos/RomanceVideo.mp4",
      link: "/play",
    },
    {
      title: "Modern Warfare",
      image: "/Mainpage/era/era-modern-warfare.png",
      video: "/videos/ModernWarfareVideo.mp4",
      link: "/play",
    },
    {
      title: "Thriller",
      image: "/Mainpage/era/era-thriller.png",
      video: "/videos/ThrillerVideo.mp4",
      link: "/play",
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="carousel-container">
      <Swiper
        effect="coverflow"
        grabCursor={true}
        loop={true}
        navigation={true}
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 80,
          modifier: 1.2,
          slideShadows: false,
        }}
        modules={[EffectCoverflow, Navigation]}
        onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
        className="mySwiper"
        breakpoints={{
          0: {
            slidesPerView: 1,
            centeredSlides: false,
          },
          862: {
            slidesPerView: 1,
            centeredSlides: false,
          },
          1024: {
            slidesPerView: 3,
            centeredSlides: true,
          },
        }}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <Link href={slide.link} passHref>
              <div className="slide-wrapper" style={{ cursor: "pointer" }}>
                {activeIndex === index ? (
                  <div className="video-frame-wrapper">
                    <video src={slide.video} autoPlay muted loop className="video-content" />
                    <div className="video-frame-overlay" />
                  </div>
                ) : (
                  <div className="slide-image-wrapper">
                    <Image src={slide.image} alt={slide.title} width={250} height={220} className="slide-image" style={{ objectFit: "contain" }} />
                  </div>
                )}
                <div className="slide-title">{slide.title}</div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>

      <style jsx>{`
        .carousel-container {
          position: relative;
          width: 100%;
          max-width: 1300px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 350px;
        }

        .slide-wrapper {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          padding-bottom: 10px;
        }

        .slide-image-wrapper {
          padding: 20px;
        }

        .slide-image {
          max-height: 250px;
          width: auto;
        }

        .swiper-button-next::after,
        .swiper-button-prev::after {
          display: none;
        }

        .slide-title {
          margin-top: 10px;
          color: white;
          font-weight: bold;
          text-align: center;
          font-size: 20px;
        }

        .video-frame-wrapper {
          position: relative;
          display: inline-block;
          max-height: 350px;
          border-radius: 12px;
          overflow: hidden;
        }

        .video-content {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 12px;
        }

        .video-frame-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          border-radius: 12px;
          box-shadow: 0 0 0 4px transparent;
          background: linear-gradient(135deg, rgba(255, 0, 204, 0.8), rgba(51, 51, 255, 0.8));
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: destination-out;
          padding: 4px;
        }

        @media (max-width: 1024px) {
          .carousel-container {
            width: 90%;
            height: 220px;
          }

          .slide-image {
            max-height: 100px;
          }
        }

        @media (max-width: 862px) {
          .carousel-container {
            width: 70%;
            height: 200px;
            padding: 0 0px;
          }

          .slide-image,
          .video-content {
            max-height: 200px;
          }

          .slide-title {
            font-size: 20px;
          }
        }
      `}</style>
    </section>
  );
}
