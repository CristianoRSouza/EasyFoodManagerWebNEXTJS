import "server-only";
import type { SessionUser } from "../session/session-gateway";
import type { ErrorReportConfig } from "./error-report-config";
import { MAX_REPORT_BYTES, buildErrorReport } from "./error-report-payload";
import { createRateLimiter, type RateLimiter } from "./rate-limiter";
import { readCappedText } from "./read-capped-body";

export interface ErrorReportRequest {
  /** URL pedida (o host dela é o do painel, para a conferência do `Origin`). */
  url: string;
  headers: Headers;
  /** Corpo em fluxo — só é lido depois da autenticação, e com teto. */
  body: ReadableStream<Uint8Array> | null;
  /** IP de quem chamou, para o limite por origem de rede. */
  clientIp: string;
}

export interface ErrorReportDeps {
  config: ErrorReportConfig;
  /** Sessão CONFIRMADA pelo backend (`SessionGateway.verifiedUser`), nunca só decodificada. */
  verifiedUser(cookieHeader: string | null): Promise<SessionUser | null>;
  limits: { byIp: RateLimiter; byUser: RateLimiter };
  fetchFn?: typeof fetch;
}

/**
 * Limites do processo: 5 relatórios/min por usuário (o mesmo teto do anti-inundação do navegador,
 * `error-reporter.ts`) e 20/min por IP (vários operadores atrás do mesmo NAT da loja).
 */
export const ERROR_REPORT_LIMITS = {
  byIp: createRateLimiter({ limit: 20, windowMs: 60_000 }),
  byUser: createRateLimiter({ limit: 5, windowMs: 60_000 }),
};

type ErrorBody = { code: string; message: string };

const reply = (status: number, body?: ErrorBody, headers?: Record<string, string>) =>
  body ? Response.json(body, { status, headers }) : new Response(null, { status, headers });

const TOO_LARGE: ErrorBody = { code: "payload_too_large", message: "Relatório grande demais." };
const INVALID: ErrorBody = { code: "invalid_body", message: "Relatório inválido." };

const tooMany = (retryAfterSec: number) =>
  reply(429, { code: "rate_limited", message: "Muitos relatórios. Aguarde um momento." }, { "retry-after": String(retryAfterSec) });

const isJson = (headers: Headers) => (headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase() === "application/json";

/** O `Origin` precisa ser o próprio painel (direto ou atrás do proxy reverso). */
function isSameOrigin(request: ErrorReportRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim(),
    request.headers.get("host"),
    new URL(request.url).host,
  ];
  return hosts.some((host) => host && host.toLowerCase() === originHost.toLowerCase());
}

/**
 * `POST /api/error-report` — o papel do `error-report-proxy` do legado, no servidor do Next.
 *
 * Ordem (o barato e o que não exige sessão primeiro; o corpo por último):
 * 1. `content-type` JSON (415) e `Origin` do próprio painel (403).
 * 2. `content-length` declarado acima do teto: 413 sem ler nada.
 * 3. Limite por IP (429) — antes da verificação, que custa uma chamada ao backend.
 * 4. Sessão CONFIRMADA pelo backend (401). Token forjado não passa daqui.
 * 5. Limite por usuário (429).
 * 6. Corpo lido em fluxo com teto (413, vale para *chunked*), JSON + esquema (400).
 * 7. Envio desligado: 204. Encaminhado: 202; o destino recusou ou não respondeu: 502. A resposta
 *    do destino nunca volta ao navegador.
 */
export async function handleErrorReport(request: ErrorReportRequest, deps: ErrorReportDeps): Promise<Response> {
  if (!isJson(request.headers)) return reply(415, { code: "unsupported_media_type", message: "Envie JSON." });
  if (!isSameOrigin(request)) return reply(403, { code: "forbidden_origin", message: "Origem não permitida." });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_REPORT_BYTES) return reply(413, TOO_LARGE);

  const byIp = deps.limits.byIp.consume(request.clientIp);
  if (!byIp.ok) return tooMany(byIp.retryAfterSec);

  const user = await deps.verifiedUser(request.headers.get("cookie")).catch(() => null);
  if (!user) return reply(401, { code: "unauthenticated", message: "Sessão ausente ou expirada." });

  const byUser = deps.limits.byUser.consume(user.id);
  if (!byUser.ok) return tooMany(byUser.retryAfterSec);

  const read = await readCappedText(request.body, MAX_REPORT_BYTES);
  if (!read.ok) return reply(413, TOO_LARGE);

  let body: unknown;
  try {
    body = JSON.parse(read.text);
  } catch {
    return reply(400, INVALID);
  }
  const payload = buildErrorReport(body, user);
  if (!payload) return reply(400, INVALID);

  if (!deps.config.enabled) return reply(204);

  try {
    const upstream = await (deps.fetchFn ?? fetch)(deps.config.url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-report-secret": deps.config.secret },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    await upstream.body?.cancel().catch(() => undefined);
    if (!upstream.ok) return reply(502, { code: "report_rejected", message: "O relatório não foi aceito." });
    return reply(202);
  } catch {
    return reply(502, { code: "report_unreachable", message: "Não foi possível enviar o relatório." });
  }
}
