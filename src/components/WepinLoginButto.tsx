'use client';

import React from 'react';

export default function WepinLoginButton() {
  const handleLogin = async () => {
    const { WepinLogin }: any = await import('@wepin/login-js');

    const wepinLogin = new WepinLogin({
      appId: process.env.NEXT_PUBLIC_WEPIN_APP_ID || '',
      appKey: process.env.NEXT_PUBLIC_WEPIN_APP_KEY || '',
    });

    await wepinLogin.init({ defaultLanguage: 'ko' });

    const result = await wepinLogin.loginWithOauthProvider({
      provider: 'google',
    });

    if ('token' in result) {
      const { idToken, refreshToken } = result.token;

      const user = await wepinLogin.loginWepin({
        provider: result.provider,
        token: { idToken, refreshToken },
      });

      console.log(user);
    } else {
      console.warn('Login failed:', result);
    }
  };

  return <button onClick={handleLogin}>Wepin Login</button>;
}
