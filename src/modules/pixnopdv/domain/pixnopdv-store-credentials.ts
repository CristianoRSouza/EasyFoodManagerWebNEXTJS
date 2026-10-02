/**
 * Credenciais PIXnoPDV da loja (ambiente produção) — porta de
 * `LEGACY/src/types/pixnopdv-store.types.ts`, em camelCase (convenção de domínio do projeto).
 *
 * O formato de fio (snake_case) de `GET`/`PUT /v1/pixnopdv-store-credentials`
 * (`easyfoodmanagerAPI/src/routes/v1/pixnopdv-store-credentials.ts`, `mapRowToClient`) vive só em
 * `infrastructure/pixnopdv-mapper.ts`, que traduz nos dois sentidos.
 *
 * Os segredos (`basic_token`/`secret_key`) nunca chegam ao domínio: a API devolve só os flags
 * `*_set` (aqui `basicTokenSet`/`secretKeySet`).
 */
export interface PixnopdvStoreCredentials {
  storeId: string;
  environment: "producao";
  apiBaseUrl: string | null;
  basicUser: string | null;
  basicTokenSet: boolean;
  secretKeySet: boolean;
  insecureTls: boolean;
  enabled: boolean;
  updatedAt: string | null;
}

/**
 * Corpo de gravação: campo AUSENTE (`undefined`/omitido) = manter o valor atual; `null` = apagar.
 * Nunca preencher `basicToken`/`secretKey` com string vazia "só para não deixar undefined" — isso
 * apagaria o segredo (mesma invariante do legado).
 */
export interface PixnopdvStoreCredentialsInput {
  apiBaseUrl?: string | null;
  basicUser?: string | null;
  basicToken?: string | null;
  secretKey?: string | null;
  insecureTls?: boolean;
  enabled?: boolean;
}
