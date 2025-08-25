export {};

declare global {
  interface EthereumProvider {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (eventName: string, callback: (...args: any[]) => void) => void;
    removeListener: (eventName: string, callback: (...args: any[]) => void) => void;
  }

  interface Window {
    Wepin?: {
      init: (config: { clientId: string; redirectUri: string }) => void;
    };
    ethereum?: EthereumProvider;
  }
}
