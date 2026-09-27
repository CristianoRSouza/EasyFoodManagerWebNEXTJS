import type { FirstAccessInput, SessionUser } from "@/shared/contracts/session";
import { ApiError } from "@/shared/http/api-error";
import { readBody, request, toResult } from "@/shared/http/api-client";

export type { FirstAccessInput, SessionUser };

const SESSION_BASE = "/api/session";

/**
 * Login, logout e primeiro acesso NÃO disparam o aviso de sessão expirada:
 * um 401 aqui é credencial errada, não sessão vencida.
 */
async function postSession<T>(path: string, body: unknown): Promise<T> {
  const response = await request(path, { method: "POST", body }, SESSION_BASE);
  if (response.status === 401) {
    const payload = ((await readBody(response)) ?? {}) as { code?: string; message?: string };
    throw new ApiError(401, payload.code ?? "http_401", payload.message ?? "Email ou senha incorretos.");
  }
  return toResult<T>(response);
}

export const sessionClient = {
  async login(email: string, password: string): Promise<SessionUser> {
    const { user } = await postSession<{ user: SessionUser }>("/login", { email, password });
    return user;
  },
  async logout(): Promise<void> {
    await postSession<void>("/logout", {});
  },
  /** `null` quando não há sessão — ausência de sessão não é erro aqui. */
  async currentUser(): Promise<SessionUser | null> {
    const response = await request("", {}, SESSION_BASE);
    if (response.status === 401) return null;
    const { user } = await toResult<{ user: SessionUser }>(response);
    return user;
  },
  async firstAccess(input: FirstAccessInput): Promise<void> {
    await postSession<void>("/first-access", input);
  },
  /** A API responde igual exista a conta ou não. */
  async requestPasswordReset(email: string): Promise<void> {
    const response = await request("/auth/recovery-email", { method: "POST", body: { email: email.trim(), app: "manager" } });
    await toResult<void>(response);
  },
};
