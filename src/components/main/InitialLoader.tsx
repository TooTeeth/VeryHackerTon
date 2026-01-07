"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface InitialLoaderProps {
  children: React.ReactNode;
}

export default function InitialLoader({ children }: InitialLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 세션 스토리지로 첫 진입 여부 확인
    const hasVisited = sessionStorage.getItem("hasVisited");

    if (hasVisited) {
      setIsLoading(false);
      return;
    }

    // 프로그레스 바 애니메이션
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    // 로딩 완료
    const timer = setTimeout(() => {
      setIsLoading(false);
      sessionStorage.setItem("hasVisited", "true");
    }, 1800);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-8">
          <Image
            src="/VTDNLogo.png"
            alt="VTDN Logo"
            width={200}
            height={200}
            priority
            className="animate-pulse"
          />
          <div className="w-64">
            <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-500 text-sm text-center mt-3">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
