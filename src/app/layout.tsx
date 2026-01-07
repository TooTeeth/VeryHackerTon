import { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import Headertop from "../components/HeaderTop";
import { WalletProvider } from "./context/WalletContext";
import { LanguageProvider } from "../context/LanguageContext";

export const metadata: Metadata = {
  title: "VTDN | VTDN | Super Play",
  description: "VTDN - Define Your Legacy",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className="bg-white dark:bg-c89bec h-screen overflow-hidden">
        <LanguageProvider>
          <WalletProvider>
            <div className="flex flex-col h-full">
              <Headertop />
              <main className="flex-1 overflow-y-auto no-scrollbar">{children}</main>
            </div>
          </WalletProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
