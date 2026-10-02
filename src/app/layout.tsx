import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import type { ReactNode } from "react";
import { getServerConfig } from "@/server/gateway";
import { RuntimeProvider } from "@/shared/runtime/runtime-context";
import { titleForAmbiente } from "@/shared/runtime/ambiente";
import { AmbienteBanner } from "@/shared/layout/AmbienteBanner";
import { Providers } from "./providers";
import "./globals.css";

const sora = Sora({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800"], variable: "--font-sora", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });

// O ambiente (faixa de homologação, título da aba, Supabase da redefinição de senha) é lido em
// EXECUÇÃO, no servidor — a mesma build serve produção e homologação (legado 1.3.12, PR #48).
export const dynamic = "force-dynamic";

const TITLE = "EasyFood Manager";

export function generateMetadata(): Metadata {
  const { ambiente } = getServerConfig();
  return {
    title: titleForAmbiente(TITLE, ambiente),
    description: "EasyFood Manager — painel administrativo (totens, sync, NFC-e, PDV).",
    authors: [{ name: "EasySoft Sistemas" }],
    icons: { icon: "/favicon.ico" },
  };
}

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({ children }: { children: ReactNode }) {
  const { backend, apiDisplayOrigin, adminPlatformUrl, ambiente, supabase } = getServerConfig();
  return (
    <html lang="pt-BR" className={`dark ${sora.variable} ${manrope.variable}`}>
      <body>
        <Providers>
          {/* Só informação não secreta do servidor: a chave do Supabase é a PUBLICÁVEL. */}
          <RuntimeProvider value={{ backend, apiDisplayOrigin, adminPlatformUrl, ambiente, supabase }}>
            <AmbienteBanner ambiente={ambiente} />
            {children}
          </RuntimeProvider>
        </Providers>
      </body>
    </html>
  );
}
