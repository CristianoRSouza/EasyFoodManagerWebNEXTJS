import "server-only";
import type { ApiErrorBody } from "../backend/error-body";

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
