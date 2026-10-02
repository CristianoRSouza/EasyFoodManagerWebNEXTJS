import { APP_VERSION } from "@/shared/version";
import { KEEPALIVE_MAX_BYTES, MAX_REPORT_BYTES } from "./report-limits";
import { INTERNAL_TAG, REPORT_PATH, consoleBuffer, installTelemetry, networkBuffer, stepsBuffer } from "./telemetry";

/**
 * Relatório automático de erros — `LEGACY/src/lib/error-reporter.ts`, mas enviado ao PRÓPRIO
 * servidor do Next (`POST /api/error-report`), que conhece o usuário pela sessão e guarda o
 * segredo do EasyGuardian. O navegador não carrega token nem segredo.
 *
 * A captura de tela é a do legado (`html2canvas`, carregado sob demanda, 1280 px, JPEG 0,6).
 * Diferenças:
 * - se o corpo passar de `MAX_REPORT_BYTES` (página muito longa), o relatório segue SEM a
 *   captura — no legado ele iria inteiro ao proxy; aqui a rota do Next tem teto e recusaria tudo;
 * - **bug do legado corrigido:** o legado mandava sempre com `keepalive: true`, que o navegador
 *   recusa acima de 64 KiB — e a captura quase sempre passa disso, então todo relatório com
 *   captura se perdia em silêncio. Aqui `keepalive` só vale até `KEEPALIVE_MAX_BYTES`.
 */
const MAX_REPORTS_PER_SESSION = 5;
const DEDUP_WINDOW_MS = 60_000;
const SCREENSHOT_MAX_WIDTH = 1280;
const SCREENSHOT_QUALITY = 0.6;

/** Cópia de `captureScreenshot` do legado. Nunca lança: falha vira `null`. */
async function captureScreenshot(): Promise<string | null> {
  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(document.body, {
      scale: Math.min(1, SCREENSHOT_MAX_WIDTH / window.innerWidth),
      logging: false,
      useCORS: true,
      allowTaint: true,
    });
    const shot = canvas.toDataURL("image/jpeg", SCREENSHOT_QUALITY);
    // Canvas vazio devolve `data:,`; o servidor só aceita JPEG — sem captura é melhor que recusado.
    return shot.startsWith("data:image/jpeg;base64,") ? shot : null;
  } catch {
    return null;
  }
}

/** Corpo do envio; sem a captura quando ela sozinha estouraria o teto da rota. */
function serializeReport(payload: Record<string, unknown>): string {
  const body = JSON.stringify(payload);
  if (new TextEncoder().encode(body).byteLength <= MAX_REPORT_BYTES) return body;
  return JSON.stringify({ ...payload, screenshot: null });
}

let reportCount = 0;
const recentHashes = new Map<string, number>();

function simpleHash(msg: string): string {
  let h = 0;
  for (let i = 0; i < msg.length; i++) h = ((h << 5) - h + msg.charCodeAt(i)) | 0;
  return String(h);
}

function shouldThrottle(errorMessage: string): boolean {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return true;
  const last = recentHashes.get(simpleHash(errorMessage));
  return last !== undefined && Date.now() - last < DEDUP_WINDOW_MS;
}

/** Só produção relata — mesmos hosts ignorados pelo legado. */
function isLocalHost(host: string): boolean {
  return host.endsWith(".lovableproject.com") || host.endsWith(".lovable.app") || host === "localhost" || host === "127.0.0.1";
}

/**
 * Nunca lança nem espera a entrega: o relatório de erro não pode virar um segundo erro dentro do
 * tratador do primeiro. Se a entrega falhar, o relatório se perde em silêncio.
 */
export async function reportError(error: unknown, extra?: { component_stack?: string }): Promise<void> {
  try {
    const errObj = error instanceof Error ? error : new Error(String(error));
    const errorMessage = errObj.message || String(error);
    if (isLocalHost(location.hostname)) return;
    if (shouldThrottle(errorMessage)) return;
    recentHashes.set(simpleHash(errorMessage), Date.now());
    reportCount++;

    const screenshot = await captureScreenshot();

    const payload = {
      // Origem e usuário são postos pelo servidor (sessão); vão aqui só para manter o formato.
      user_id: null,
      user_email: null,
      company_id: null,
      url: location.href,
      user_agent: navigator.userAgent,
      error_message: errorMessage,
      error_stack: errObj.stack ?? null,
      component_stack: extra?.component_stack ?? null,
      console_logs: consoleBuffer.snapshot(),
      steps: stepsBuffer.snapshot(),
      screenshot,
      metadata: {
        viewport: { w: window.innerWidth, h: window.innerHeight },
        network: networkBuffer.snapshot(),
        release: APP_VERSION,
        route: location.hash ? location.hash.replace("#", "") : location.pathname,
      },
    };

    const body = serializeReport(payload);
    // `keepalive` deixa o envio sobreviver ao fechamento da aba, mas só até 64 KiB (ver
    // `KEEPALIVE_MAX_BYTES`); acima disso vai por fetch normal.
    fetch(REPORT_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body,
      keepalive: new TextEncoder().encode(body).byteLength <= KEEPALIVE_MAX_BYTES,
    }).catch(() => {
      /* nunca recursa */
    });
  } catch {
    /* ver o comentário da função */
  }
}

/** Liga os registros e passa a relatar erros não tratados. Idempotente. */
export function installErrorReporter(): void {
  if (typeof window === "undefined") return;
  if (!installTelemetry()) return;
  window.addEventListener("error", (event) => void reportError(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => void reportError(event.reason ?? "Unhandled Promise rejection"));
  console.log(INTERNAL_TAG, "[ErrorReporter] Installed");
}
