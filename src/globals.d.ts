// global.d.ts
export {};

declare global {
  interface Window {
    Wepin?: {
      init: (config: { clientId: string; redirectUri: string }) => void;
      // 필요하면 더 추가
    };
  }
}
