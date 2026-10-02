import { asBoolean, asText } from "@/shared/infrastructure/convert";
import type { PixnopdvStoreCredentials, PixnopdvStoreCredentialsInput } from "../domain/pixnopdv-store-credentials";

/** Formato de fio da resposta de `GET`/`PUT /v1/pixnopdv-store-credentials` (`mapRowToClient`). */
export interface PixnopdvCredentialsApiView {
  store_id: string;
  environment: "producao";
  api_base_url: string | null;
  basic_user: string | null;
  basic_token_set: boolean;
  secret_key_set: boolean;
  insecure_tls: boolean;
  enabled: boolean;
  updated_at: string | null;
}

/** Formato de fio do corpo de `PUT /v1/pixnopdv-store-credentials`: ausente mantém, `null` apaga. */
export interface PixnopdvCredentialsApiPutBody {
  api_base_url?: string | null;
  basic_user?: string | null;
  basic_token?: string | null;
  secret_key?: string | null;
  insecure_tls?: boolean;
  enabled?: boolean;
}

/**
 * Resposta da API → domínio. `null` quando a API não devolve objeto (o legado trata `data == null`
 * como "sem credenciais cadastradas" no modo nuvem). Os flags de segredo só são `true` quando a API
 * diz `true` — nenhum valor de segredo é lido daqui.
 */
export function toPixnopdvStoreCredentials(row: unknown): PixnopdvStoreCredentials | null {
  if (row == null || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  return {
    storeId: asText(r.store_id) ?? "",
    environment: "producao",
    apiBaseUrl: asText(r.api_base_url),
    basicUser: asText(r.basic_user),
    basicTokenSet: r.basic_token_set === true,
    secretKeySet: r.secret_key_set === true,
    insecureTls: asBoolean(r.insecure_tls),
    enabled: r.enabled === undefined || r.enabled === null ? true : asBoolean(r.enabled),
    updatedAt: asText(r.updated_at),
  };
}

const PUT_FIELDS = [
  ["apiBaseUrl", "api_base_url"],
  ["basicUser", "basic_user"],
  ["basicToken", "basic_token"],
  ["secretKey", "secret_key"],
  ["insecureTls", "insecure_tls"],
  ["enabled", "enabled"],
] as const satisfies readonly (readonly [keyof PixnopdvStoreCredentialsInput, keyof PixnopdvCredentialsApiPutBody])[];

/**
 * Domínio → corpo do `PUT`. Preserva a semântica de AUSÊNCIA: campo `undefined` no domínio NÃO
 * vira chave no corpo (do outro lado, ausente = "mantém o gravado"); `null` vai como `null`
 * (apaga).
 */
export function toPixnopdvPutBody(input: PixnopdvStoreCredentialsInput): PixnopdvCredentialsApiPutBody {
  const body: Record<string, unknown> = {};
  for (const [domainField, apiField] of PUT_FIELDS) {
    const value = input[domainField];
    if (value !== undefined) body[apiField] = value;
  }
  return body as PixnopdvCredentialsApiPutBody;
}
