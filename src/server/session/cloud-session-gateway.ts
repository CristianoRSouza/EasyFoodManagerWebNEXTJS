import "server-only";
import type { ServerConfig } from "../config";
import { backendUrl } from "../backend/backend-url";
import { parseJsonSafely, toErrorBody, type ApiErrorBody } from "../backend/error-body";
import { normalizeRelayedCookie } from "./cookies";
import { jsonResponse, pickHeaders, relayBackendResponse } from "./json-response";
import {
  FORWARDED_REQUEST_HEADERS,
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

const INVALID_RESPONSE: ApiErrorBody = { code: "invalid_response", message: "A API devolveu uma resposta inválida." };

/** Cookies da API com Path/Domain ajustados ao painel — ver `normalizeRelayedCookie`. */
const relayedCookies = (response: Response) => response.headers.getSetCookie().map(normalizeRelayedCookie);

/** `null` quando o valor não tem a forma de um usuário (id em texto). */
function readUser(value: unknown): SessionUser | null {
  if (!value || typeof value !== "object") return null;
  const { id, email } = value as { id?: unknown; email?: unknown };
  if (typeof id !== "string" || !id) return null;
  return { id, email: typeof email === "string" ? email : null };
}

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
    if (!response) return { ok: false, status: 503, error: this.unreachable("Não foi possível entrar agora."), setCookies: [] };
    const parsed = parseJsonSafely(await response.text());
    const setCookies = relayedCookies(response);
    if (!response.ok) {
      const error = toErrorBody(response.status, parsed);
      const message = LOGIN_MESSAGES[response.status] ?? error.message;
      return { ok: false, status: response.status, error: { ...error, message }, setCookies };
    }
    const user = readUser((parsed as { user?: unknown } | null)?.user);
    // Resposta fora do contrato não abre sessão: nem usuário, nem cookie.
    if (!user) return { ok: false, status: 502, error: INVALID_RESPONSE, setCookies: [] };
    return { ok: true, data: user, setCookies };
  }

  async currentUser(cookieHeader: string | null): Promise<SessionUser | null> {
    if (!cookieHeader) return null;
    const response = await this.call("/v1/auth/me", { headers: { cookie: cookieHeader, accept: "application/json" } });
    if (!response || !response.ok) return null;
    return readUser(parseJsonSafely(await response.text()));
  }

  /** Na nuvem o `/auth/me` já é a EasyFoodAPI validando a sessão: exibir e autenticar coincidem. */
  verifiedUser(cookieHeader: string | null): Promise<SessionUser | null> {
    return this.currentUser(cookieHeader);
  }

  async logout(cookieHeader: string | null): Promise<string[]> {
    if (!cookieHeader) return [];
    const response = await this.call("/v1/auth/logout", { method: "POST", headers: { cookie: cookieHeader } });
    return response ? relayedCookies(response) : [];
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
    if (!backend) {
      const message = `Não foi possível contactar ${this.config.apiDisplayOrigin}. Verifique o serviço e tente novamente.`;
      return jsonResponse(503, this.unreachable(message));
    }
    return relayBackendResponse(backend, relayedCookies(backend));
  }

  /** `null` quando a API não respondeu (rede, DNS, recusa). */
  private async call(path: string, init: RequestInit, search = ""): Promise<Response | null> {
    try {
      return await this.fetchFn(backendUrl(this.config, path, search), { ...init, cache: "no-store" });
    } catch {
      return null;
    }
  }

  private unreachable(message: string): ApiErrorBody {
    return { code: UNREACHABLE_CODE, message };
  }
}
