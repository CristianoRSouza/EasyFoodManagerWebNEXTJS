import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

const sora = Sora({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800"], variable: "--font-sora", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: "EasyFood Manager",
  description: "EasyFood Manager — painel administrativo (totens, sync, NFC-e, PDV).",
  authors: [{ name: "EasySoft Sistemas" }],
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${sora.variable} ${manrope.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
