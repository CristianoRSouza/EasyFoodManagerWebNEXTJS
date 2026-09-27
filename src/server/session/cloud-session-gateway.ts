import "server-only";
import type { ServerConfig } from "../config";
import { backendUrl } from "../backend/backend-url";
import { parseJsonSafely, toErrorBody, type ApiErrorBody } from "../backend/error-body";
import { jsonResponse, pickHeaders } from "./json-response";
import {
  FORWARDED_REQUEST_HEADERS,
  FORWARDED_RESPONSE_HEADERS,
  TENANT_HEADERS,
  UNREACHABLE_CODE,
  type Credentials,
  type FirstAccessInput,
  type ForwardRequest,
  type GatewayResult,
  type SessionGateway,
  type SessionUser,
} from "./session-gateway";

const LOGIN_MESSAGES: Partial<Record<number, string>> = {
  401: "Email ou senha incorretos.",
  429: "Muitas tentativas. Aguarde um momento e tente novamente.",
};

/** EasyFoodAPI: a sessão é um cookie httpOnly da própria API; o Next só retransmite. */
export class CloudSessionGateway implements SessionGateway {
  constructor(
    private readonly config: ServerConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async login({ email, password }: Credentials): Promise<GatewayResult<SessionUser>> {
    const response = await this.call("/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!response) return this.unreachableResult();
    const parsed = parseJsonSafely(await response.text());
    const setCookies = response.headers.getSetCookie();
    if (!response.ok) {
      const error = toErrorBody(response.status, parsed);
      const message = LOGIN_MESSAGES[response.status] ?? error.message;
      return { ok: false, status: response.status, error: { ...error, message }, setCookies };
    }
    const user = (parsed as { user: SessionUser }).user;
    return { ok: true, data: { id: user.id, email: user.email ?? null }, setCookies };
  }

  async currentUser(cookieHeader: string | null): Promise<SessionUser | null> {
    if (!cookieHeader) return null;
    const response = await this.call("/v1/auth/me", { headers: { cookie: cookieHeader, accept: "application/json" } });
    if (!response || !response.ok) return null;
    const user = parseJsonSafely(await response.text()) as SessionUser | null;
    return user ? { id: user.id, email: user.email ?? null } : null;
  }

  async logout(cookieHeader: string | null): Promise<string[]> {
    if (!cookieHeader) return [];
    const response = await this.call("/v1/auth/logout", { method: "POST", headers: { cookie: cookieHeader } });
    return response ? response.headers.getSetCookie() : [];
  }

  async firstAccess(_input: FirstAccessInput): Promise<GatewayResult<null>> {
    void _input;
    return {
      ok: false,
      status: 404,
      error: { code: "feature_unavailable", message: "Indisponível nesta instalação." },
      setCookies: [],
    };
  }

  async forward(request: ForwardRequest): Promise<Response> {
    const headers = pickHeaders(request.headers, [...FORWARDED_REQUEST_HEADERS, ...TENANT_HEADERS]);
    if (request.cookieHeader) headers.set("cookie", request.cookieHeader);

    const backend = await this.call(request.path, { method: request.method, headers, body: request.body }, request.search);
    if (!backend) return jsonResponse(503, this.unreachable());

    const setCookies = backend.headers.getSetCookie();
    if (!backend.ok) {
      return jsonResponse(backend.status, toErrorBody(backend.status, parseJsonSafely(await backend.text())), setCookies);
    }
    const responseHeaders = pickHeaders(backend.headers, FORWARDED_RESPONSE_HEADERS);
    for (const cookie of setCookies) responseHeaders.append("set-cookie", cookie);
    return new Response(backend.body, { status: backend.status, headers: responseHeaders });
  }

  /** `null` quando a API não respondeu (rede, DNS, recusa). */
  private async call(path: string, init: RequestInit, search = ""): Promise<Response | null> {
    try {
      return await this.fetchFn(backendUrl(this.config, path, search), { ...init, cache: "no-store" });
    } catch {
      return null;
    }
  }

  private unreachable(): ApiErrorBody {
    return { code: UNREACHABLE_CODE, message: "Não foi possível entrar agora." };
  }

  private unreachableResult(): GatewayResult<SessionUser> {
    return { ok: false, status: 503, error: this.unreachable(), setCookies: [] };
  }
}
