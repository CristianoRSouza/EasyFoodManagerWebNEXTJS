import { ApiError } from "./api-error";
import { notifySessionExpired } from "./session-events";

export interface TenantHeaders {
  companyId: string;
  storeId?: string | null;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Empresa/loja em nome de quem a tela age. A API confere o vínculo. */
  tenant?: TenantHeaders | null;
  signal?: AbortSignal;
}

/** Lê o corpo como JSON sem quebrar quando ele não é JSON. */
async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Mesmo cliente para os dois backends: o navegador só conhece o repasse do Next. */
export async function request(path: string, options: RequestOptions = {}, base = "/api/v1"): Promise<Response> {
  const headers = new Headers({ accept: "application/json" });
  if (options.body !== undefined) headers.set("content-type", "application/json");
  if (options.tenant) {
    headers.set("x-company-id", options.tenant.companyId);
    if (options.tenant.storeId) headers.set("x-store-id", options.tenant.storeId);
  }
  try {
    return await fetch(`${base}${path}`, {
      method: options.method ?? "GET",
      headers,
      credentials: "same-origin",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "network", "Não foi possível contactar o servidor.");
  }
}

export async function toResult<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await readBody(response);
  if (!response.ok) {
    if (response.status === 401) notifySessionExpired();
    const { code, message } = (body ?? {}) as { code?: string; message?: string };
    throw new ApiError(response.status, code ?? `http_${response.status}`, message ?? `Falha na requisição (HTTP ${response.status}).`);
  }
  return body as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return toResult<T>(await request(path, options));
}
