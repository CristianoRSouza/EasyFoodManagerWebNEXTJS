import "server-only";
import type { FirstAccessInput, SessionUser } from "@/shared/contracts/session";
import type { ApiErrorBody } from "../backend/error-body";

export type { FirstAccessInput, SessionUser };

export interface Credentials {
  email: string;
  password: string;
}

export type GatewayResult<T> =
  | { ok: true; data: T; setCookies: string[] }
  | { ok: false; status: number; error: ApiErrorBody; setCookies: string[] };

export interface ForwardRequest {
  method: string;
  /** Sempre começa com `/v1/`. */
  path: string;
  /** `?a=1` ou vazio. */
  search: string;
  headers: Headers;
  body: ArrayBuffer | null;
  cookieHeader: string | null;
}

/** Tudo que muda entre os dois backends, e nada além disso. */
export interface SessionGateway {
  login(credentials: Credentials): Promise<GatewayResult<SessionUser>>;
  currentUser(cookieHeader: string | null): Promise<SessionUser | null>;
  /** Devolve os `Set-Cookie` que encerram a sessão no navegador. */
  logout(cookieHeader: string | null): Promise<string[]>;
  firstAccess(input: FirstAccessInput): Promise<GatewayResult<null>>;
  forward(request: ForwardRequest): Promise<Response>;
}

export const UNREACHABLE_CODE = "backend_unreachable";

/** Cabeçalhos de pedido que atravessam o repasse. Autenticação é posta pelo gateway. */
export const FORWARDED_REQUEST_HEADERS = ["accept", "content-type"] as const;
export const TENANT_HEADERS = ["x-company-id", "x-store-id"] as const;
/** Cabeçalhos de resposta que voltam ao navegador (downloads incluídos). */
export const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-disposition", "cache-control"] as const;
