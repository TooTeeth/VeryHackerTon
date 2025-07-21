"use client";

import React from "react";

export default function WepinLoginButton() {
  const handleLogin = async () => {
    const { WepinSDK } = await import("@wepin/sdk-js");

    const wepinSDK = new WepinSDK({
      appId: process.env.NEXT_PUBLIC_WEPIN_APP_ID || "",
      appKey: process.env.NEXT_PUBLIC_WEPIN_APP_KEY || "",
    });

    await wepinSDK.init({ defaultLanguage: "ko" });

    // loginWithUI 호출
    const result = await wepinSDK.loginWithUI();

    if ("token" in result) {
      console.log("로그인 성공:", result);
      // 추가 처리
    } else {
      console.warn("로그인 실패:", result);
    }
  };

  const handleLogout = async () => {
    const { WepinSDK } = await import("@wepin/sdk-js");

    const wepinSDK = new WepinSDK({
      appId: process.env.NEXT_PUBLIC_WEPIN_APP_ID || "",
      appKey: process.env.NEXT_PUBLIC_WEPIN_APP_KEY || "",
    });

    await wepinSDK.init({ defaultLanguage: "ko" });

    await wepinSDK.logout();

    console.log("User logged out");
  };

  return (
    <div className="flex flex-col">
      <button onClick={handleLogin} className="cursor-pointer">
        Wepin Login
      </button>
      <button onClick={handleLogout} className="cursor-pointer">
        Wepin Logout
      </button>
    </div>
  );
}
