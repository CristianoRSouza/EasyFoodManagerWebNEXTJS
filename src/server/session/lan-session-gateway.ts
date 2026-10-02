import "server-only";
import type { ServerConfig } from "../config";
import { backendUrl } from "../backend/backend-url";
import { parseJsonSafely, toErrorBody, type ApiErrorBody } from "../backend/error-body";
import { LAN_SESSION_COOKIE, expiredSessionCookie, readCookie, sessionCookie } from "./cookies";
import { SESSION_EXPIRED, jsonResponse, pickHeaders, relayBackendResponse } from "./json-response";
import { readClaims } from "./jwt-claims";
import {
  FORWARDED_REQUEST_HEADERS,
  UNREACHABLE_CODE,
  type Credentials,
  type FirstAccessInput,
  type ForwardRequest,
  type GatewayResult,
  type SessionGateway,
  type SessionUser,
} from "./session-gateway";

interface LoginResponse {
  access_token: string;
  expires_in: number;
}

const nowSec = () => Math.floor(Date.now() / 1000);

/** Rota protegida (`requireAuth`) e só de leitura da easyfoodmanagerAPI — ver `verifiedUser`. */
const VERIFY_PATH = "/v1/meta/app-info";

/** easyfoodmanagerAPI: JWT Bearer de 8h, sem /auth/me e sem logout. O Next guarda o token. */
export class LanSessionGateway implements SessionGateway {
  constructor(
    private readonly config: ServerConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async login({ email, password }: Credentials): Promise<GatewayResult<SessionUser>> {
    const result = await this.postJson<LoginResponse>("/v1/auth/login", { email: email.trim(), password });
    if (!result.ok) return result;
    const claims = readClaims(result.data.access_token, nowSec());
    if (!claims) {
      return { ok: false, status: 502, error: { code: "invalid_token", message: "A API devolveu um token inválido." }, setCookies: [] };
    }
    return {
      ok: true,
      data: { id: claims.sub, email: claims.email },
      setCookies: [sessionCookie(result.data.access_token, result.data.expires_in, this.config.secureCookies)],
    };
  }

  async currentUser(cookieHeader: string | null): Promise<SessionUser | null> {
    const token = readCookie(cookieHeader, LAN_SESSION_COOKIE);
    const claims = token ? readClaims(token, nowSec()) : null;
    return claims ? { id: claims.sub, email: claims.email } : null;
  }

  /**
   * A easyfoodmanagerAPI não tem `/auth/me`. A confirmação é uma chamada autenticada barata e sem
   * efeito colateral: `GET /v1/meta/app-info` passa pelo `requireAuth` da API, que valida
   * assinatura e validade do JWT. 200 = token legítimo; qualquer outra coisa (401 de token
   * forjado, erro, API fora do ar) = sem usuário.
   */
  async verifiedUser(cookieHeader: string | null): Promise<SessionUser | null> {
    const token = readCookie(cookieHeader, LAN_SESSION_COOKIE);
    const claims = token ? readClaims(token, nowSec()) : null;
    if (!token || !claims) return null;
    try {
      const response = await this.fetchFn(backendUrl(this.config, VERIFY_PATH), {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      await response.body?.cancel().catch(() => undefined);
      return response.ok ? { id: claims.sub, email: claims.email } : null;
    } catch {
      return null;
    }
  }

  async logout(_cookieHeader: string | null): Promise<string[]> {
    void _cookieHeader;
    return [this.expiredCookie()];
  }

  async firstAccess({ email, newPassword, provisioningCode }: FirstAccessInput): Promise<GatewayResult<null>> {
    const result = await this.postJson<unknown>("/v1/auth/bootstrap-local-password", {
      email: email.trim(),
      new_password: newPassword,
      ...(provisioningCode?.trim() ? { provisioning_code: provisioningCode.trim() } : {}),
    });
    return result.ok ? { ok: true, data: null, setCookies: [] } : result;
  }

  async forward(request: ForwardRequest): Promise<Response> {
    const token = readCookie(request.cookieHeader, LAN_SESSION_COOKIE);
    if (!token || !readClaims(token, nowSec())) {
      // Token vencido/inválido: apaga o cookie para o proxy parar de liberar as páginas.
      return jsonResponse(401, SESSION_EXPIRED, token ? [this.expiredCookie()] : []);
    }

    const headers = pickHeaders(request.headers, FORWARDED_REQUEST_HEADERS);
    headers.set("authorization", `Bearer ${token}`);

    let backend: Response;
    try {
      backend = await this.fetchFn(backendUrl(this.config, request.path, request.search), {
        method: request.method,
        headers,
        body: request.body,
        cache: "no-store",
      });
    } catch {
      return jsonResponse(503, this.unreachable());
    }

    return relayBackendResponse(backend, backend.status === 401 ? [this.expiredCookie()] : []);
  }

  private expiredCookie(): string {
    return expiredSessionCookie(this.config.secureCookies);
  }

  private unreachable(): ApiErrorBody {
    return {
      code: UNREACHABLE_CODE,
      message: `Não foi possível contactar ${this.config.apiDisplayOrigin}. Verifique o serviço e tente novamente.`,
    };
  }

  private async postJson<T>(path: string, body: unknown): Promise<GatewayResult<T>> {
    let response: Response;
    try {
      response = await this.fetchFn(backendUrl(this.config, path), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch {
      return { ok: false, status: 503, error: this.unreachable(), setCookies: [] };
    }
    const parsed = parseJsonSafely(await response.text());
    if (!response.ok) return { ok: false, status: response.status, error: toErrorBody(response.status, parsed), setCookies: [] };
    return { ok: true, data: parsed as T, setCookies: [] };
  }
}
