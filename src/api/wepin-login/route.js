// pages/api/wepin-login.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { provider } = req.body;

  if (provider !== "google") {
    return res.status(400).json({ success: false, message: "지원하지 않는 로그인 방식입니다." });
  }

  try {
    // Wepin 구글 로그인 API 호출 (여기에 실제 Wepin API URL과 필요한 데이터 넣기)
    const response = await fetch("https://sdk.wepin.io/v1/user/oauth/callback?uri=wepin.5ad1aa1e5636b5b7820b2450d5bb1000%3A%2Foauth2redirect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // 필요시 인증 헤더도 넣기
      },
      body: JSON.stringify({
        // Wepin API 요구하는 파라미터 작성
        // 예: client_id, redirect_uri 등
      }),
    });

    const result = await response.json();

    if (response.ok) {
      return res.status(200).json({ success: true, token: result.token });
    } else {
      return res.status(400).json({ success: false, message: result.message || "로그인 실패" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "서버 에러" });
  }
}
