import "server-only";
import { parseJsonSafely, toErrorBody, type ApiErrorBody } from "../backend/error-body";
import { FORWARDED_RESPONSE_HEADERS } from "./session-gateway";

export const SESSION_EXPIRED: ApiErrorBody = { code: "unauthenticated", message: "Sua sessão expirou. Entre de novo." };

export function jsonResponse(status: number, body: unknown, setCookies: string[] = []): Response {
  const headers = new Headers({ "content-type": "application/json" });
  for (const cookie of setCookies) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

/** Copia só os cabeçalhos de resposta permitidos (nada de autenticação do backend). */
export function pickHeaders(source: Headers, names: readonly string[]): Headers {
  const picked = new Headers();
  for (const name of names) {
    const value = source.get(name);
    if (value) picked.set(name, value);
  }
  return picked;
}

/**
 * Devolve ao navegador a resposta do backend no repasse `/api/v1/*`.
 * Erro vira `{ code, message }` (com `retry-after` preservado no 429); sucesso passa o corpo
 * em fluxo, só com os cabeçalhos permitidos. Cookies do backend não passam sozinhos:
 * quem chama decide quais `Set-Cookie` enviar em `extraSetCookies`.
 */
export async function relayBackendResponse(backend: Response, extraSetCookies: string[]): Promise<Response> {
  if (!backend.ok) {
    const error = toErrorBody(backend.status, parseJsonSafely(await backend.text()));
    const response = jsonResponse(backend.status, error, extraSetCookies);
    const retryAfter = backend.headers.get("retry-after");
    if (backend.status === 429 && retryAfter) response.headers.set("retry-after", retryAfter);
    return response;
  }
  const headers = pickHeaders(backend.headers, FORWARDED_RESPONSE_HEADERS);
  for (const cookie of extraSetCookies) headers.append("set-cookie", cookie);
  return new Response(backend.body, { status: backend.status, headers });
}
