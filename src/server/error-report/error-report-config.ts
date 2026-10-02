import "server-only";

/**
 * Destino do relatório automático de erros — o MESMO do legado.
 *
 * No legado o navegador manda o relatório à edge function `error-report-proxy` (Supabase, com o
 * JWT do usuário), que o encaminha ao **EasyGuardian** injetando o segredo `ERROR_REPORT_SECRET`
 * no cabeçalho `x-report-secret` (ver `LEGACY/supabase/functions/error-report-proxy/index.ts`).
 * Aqui o papel do proxy é do servidor do Next: o segredo vive só no ambiente do servidor.
 *
 * Sem `ERROR_REPORT_SECRET` o envio fica DESLIGADO (o EasyGuardian recusaria sem ele): o servidor
 * aceita o relatório e o descarta em silêncio. Nada de segredo inventado nem de valor padrão.
 */
export const EASYGUARDIAN_URL = "https://ohjyqafgcxvrvbtiuvpq.supabase.co/functions/v1/error-report";

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Só o esquema e o host — nada de caminho/consulta, que poderiam carregar credencial. */
function describe(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "URL inválida";
  }
}

const warned = new Set<string>();
function warnOnce(message: string) {
  if (warned.has(message)) return;
  warned.add(message);
  console.warn(message);
}

export type ErrorReportConfig = { enabled: false } | { enabled: true; url: string; secret: string };

export function readErrorReportConfig(env: NodeJS.ProcessEnv = process.env): ErrorReportConfig {
  const secret = env.ERROR_REPORT_SECRET?.trim();
  if (!secret) return { enabled: false };
  const url = env.ERROR_REPORT_URL?.trim() || EASYGUARDIAN_URL;
  // O segredo vai no cabeçalho: sem TLS ele trafegaria em claro. Destino fora de https desliga
  // o envio (o painel segue funcionando; o relatório é descartado) e fica registrado no log.
  if (!isHttps(url)) {
    warnOnce(`[error-report] ERROR_REPORT_URL precisa ser https — envio de relatórios DESLIGADO (recebido: ${describe(url)}).`);
    return { enabled: false };
  }
  return { enabled: true, url, secret };
}
