// src/lib/wepin.ts

let cachedWepinSDK: any = null;

// SDK 초기화
export const initWepinSDK = async () => {
  if (typeof window === "undefined") {
    // 서버 환경에서는 SDK 사용 불가
    return null;
  }

  if (cachedWepinSDK) return cachedWepinSDK;

  const { WepinSDK } = await import("@wepin/sdk-js");

  const sdk = new WepinSDK({
    appId: process.env.NEXT_PUBLIC_WEPIN_APP_ID || "",
    appKey: process.env.NEXT_PUBLIC_WEPIN_APP_KEY || "",
  });

  await sdk.init({ defaultLanguage: "ko" });
  cachedWepinSDK = sdk;

  return sdk;
};

// 로그인
export const loginWithWepin = async () => {
  const sdk = await initWepinSDK();
  if (!sdk) return null;

  const result = await sdk.loginWithUI();
  if ("token" in result) {
    console.log("✅ 로그인 성공:", result);
    return result;
  } else {
    console.warn("⚠️ 로그인 실패:", result);
    return null;
  }
};

// 로그아웃
export const logoutFromWepin = async () => {
  const sdk = await initWepinSDK();
  if (!sdk) return;

  await sdk.logout();
  console.log("🚪 로그아웃 완료");
};

// 위젯 열기/닫기
export const openWepinWidget = async () => {
  const sdk = await initWepinSDK();
  if (!sdk) return;

  await sdk.openWidget();
};

export const closeWepinWidget = async () => {
  const sdk = await initWepinSDK();
  if (!sdk) return;

  sdk.closeWidget();
};

// 초기화 상태 확인
export const getWepinStatus = async () => {
  const sdk = await initWepinSDK();
  if (!sdk) return null;

  return await sdk.getStatus();
};

export const isWepinInitialized = async () => {
  const sdk = await initWepinSDK();
  if (!sdk) return false;

  return sdk.isInitialized();
};

// 계정 정보
export const getWepinAccounts = async (options?: { networks?: string[]; withEoa?: boolean }) => {
  const sdk = await initWepinSDK();
  if (!sdk) return null;

  return await sdk.getAccounts(options);
};

// 잔액
export const getWepinBalance = async (
  accounts?: Array<{
    address: string;
    network: string;
    isAA?: boolean;
  }>
) => {
  const sdk = await initWepinSDK();
  if (!sdk) return null;

  return await sdk.getBalance(accounts);
};

// 토큰 전송
export const sendWepinTx = async ({
  account,
  txData,
}: {
  account: {
    address: string;
    network: string;
    contract?: string;
  };
  txData: {
    toAddress: string;
    amount: string;
  };
}) => {
  const sdk = await initWepinSDK();
  if (!sdk) return null;

  return await sdk.send({ account, txData });
};

// 로그인 세션 확인
export const getWepinLoginSession = async (provToken?: any) => {
  const sdk = await initWepinSDK();
  if (!sdk) return null;

  return await sdk.getLoginSession(provToken);
};

// 회원가입
export const registerWepin = async () => {
  const sdk = await initWepinSDK();
  if (!sdk) return null;

  return await sdk.register();
};

// 이메일로 사용자 등록
export const registerUserEmail = async ({ provider, idToken, accessToken }: { provider: string; idToken: string; accessToken?: string }) => {
  const sdk = await initWepinSDK();
  if (!sdk) return null;

  return await sdk.registerUserEmail({ provider, idToken, accessToken });
};

// SDK 사용 종료
export const finalizeWepin = () => {
  if (cachedWepinSDK) {
    cachedWepinSDK.finalize?.();
    cachedWepinSDK = null;
    console.log("🧹 WepinSDK finalized");
  }
};

/*export const loginWithWepin = async () => {
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
};*/
