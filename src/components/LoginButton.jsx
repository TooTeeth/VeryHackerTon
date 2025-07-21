/*
"use client"

// components/LoginButton.jsx
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../lib/firebase";

const LoginButton = () => {
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      console.log("✅ Firebase ID Token:", idToken);

      const response = await fetch("https://sdk.wepin.io/v1/user/oauth/callback?uri=wepin.5ad1aa1e5636b5b7820b2450d5bb1000%3A%2Foauth2redirect", {
        method: "POST",
        headers: {
          "X-API-KEY": "YOUR_APP_KEY",
          "X-API-DOMAIN": "YOUR_APP_DOMAIN",
          "X-SDK-TYPE": "web_rest_api",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();
      console.log("✅ Wepin 응답:", data);
    } catch (error) {
      console.error("❌ 로그인 오류:", error);
    }
  };

  return <button onClick={handleLogin} className="cursor-pointer">지갑 로그인</button>;
};

export default LoginButton;*/
