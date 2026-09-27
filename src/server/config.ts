import "server-only";
import { z } from "zod";

export type Backend = "cloud" | "lan";

export interface ServerConfig {
  backend: Backend;
  /** Sem barra final. */
  apiUrl: string;
  /** `host:porta`, exibido no badge de modo do cabeçalho. */
  apiDisplayOrigin: string;
  /** Base do EasyBilling (Planos e Créditos IA). */
  adminPlatformUrl: string;
  secureCookies: boolean;
}

const DEFAULT_ADMIN_PLATFORM_URL = "https://billing.easysoftcloud.com.br";

const schema = z.object({
  BACKEND: z.enum(["cloud", "lan"], {
    errorMap: () => ({ message: 'BACKEND deve ser "cloud" ou "lan".' }),
  }),
  EASYFOOD_API_URL: z.string().url({ message: "EASYFOOD_API_URL deve ser uma URL (ex.: http://127.0.0.1:4080)." }),
  // Lido só no servidor: o endereço chega ao navegador pelo RuntimeProvider.
  ADMIN_PLATFORM_URL: z.string().url().optional(),
  SESSION_COOKIE_SECURE: z
    .enum(["true", "false"], { errorMap: () => ({ message: 'SESSION_COOKIE_SECURE deve ser "true" ou "false".' }) })
    .optional(),
  NODE_ENV: z.string().optional(),
});

const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, "");

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Configuração inválida do servidor — ${problems.join("; ")}`);
  }
  const apiUrl = withoutTrailingSlash(parsed.data.EASYFOOD_API_URL);
  return {
    backend: parsed.data.BACKEND,
    apiUrl,
    apiDisplayOrigin: new URL(apiUrl).host,
    adminPlatformUrl: withoutTrailingSlash(parsed.data.ADMIN_PLATFORM_URL ?? DEFAULT_ADMIN_PLATFORM_URL),
    // Loja servida em HTTP puro na LAN precisa de "false": navegador descarta cookie Secure fora de HTTPS.
    secureCookies: parsed.data.SESSION_COOKIE_SECURE
      ? parsed.data.SESSION_COOKIE_SECURE === "true"
      : parsed.data.NODE_ENV === "production",
  };
}
