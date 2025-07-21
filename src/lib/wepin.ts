export const loginWithWepin = async () => {
  const { WepinSDK } = await import("@wepin/sdk-js");
  const wepinSDK = new WepinSDK({
    appId: process.env.NEXT_PUBLIC_WEPIN_APP_ID || "",
    appKey: process.env.NEXT_PUBLIC_WEPIN_APP_KEY || "",
  });

  await wepinSDK.init({ defaultLanguage: "ko" });

  const result = await wepinSDK.loginWithUI();

  if ("token" in result) {
    console.log("Wepin 로그인 성공:", result);
    return result; // 필요 시 리턴값 넘기기
  } else {
    console.warn("Wepin 로그인 실패:", result);
    return null;
  }
};

export const logoutFromWepin = async () => {
  const { WepinSDK } = await import("@wepin/sdk-js");
  const wepinSDK = new WepinSDK({
    appId: process.env.NEXT_PUBLIC_WEPIN_APP_ID || "",
    appKey: process.env.NEXT_PUBLIC_WEPIN_APP_KEY || "",
  });

  await wepinSDK.init({ defaultLanguage: "ko" });

  await wepinSDK.logout();

  console.log("Wepin 로그아웃 완료");
};
