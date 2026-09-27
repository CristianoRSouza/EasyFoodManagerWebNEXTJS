import "server-only";

/**
 * Lê as claims SEM validar a assinatura — serve só para exibir quem está logado.
 * Quem valida o token é a API, em toda chamada repassada.
 */
export function readClaims(token: string, nowSec: number): { sub: string; email: string } | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof claims.sub !== "string" || typeof claims.email !== "string") return null;
    if (typeof claims.exp === "number" && claims.exp <= nowSec) return null;
    return { sub: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}
