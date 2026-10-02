import type { PixnopdvStoreCredentials, PixnopdvStoreCredentialsInput } from "../domain/pixnopdv-store-credentials";

/**
 * Porta de acesso às credenciais PIXnoPDV da loja (ambiente produção, único editável na UI).
 *
 * A UI depende deste contrato, nunca de uma implementação. `use-pixnopdv-repository.ts` decide qual
 * implementação usar a partir do backend ativo (`useRuntime().backend`) — hoje só existe
 * `ApiPixnopdvRepository`, porque tanto o backend `lan` (easyfoodmanagerAPI) quanto `cloud`
 * (EasyFoodAPI) expõem a MESMA rota `GET`/`PUT /v1/pixnopdv-store-credentials` com o mesmo contrato
 * (ver `api-pixnopdv-repository.ts`).
 */
export interface PixnopdvRepository {
  /**
   * Credenciais de produção da loja do tenant atual. A API do LAN sempre devolve um objeto
   * completo — mesmo sem nenhuma linha gravada, `mapRowToClient(null, storeId)` preenche os
   * defaults (`enabled: true`, `*_set: false`, resto `null`); `null` só quando a API não devolve
   * objeto (caso "sem cadastro" que o legado trata no modo nuvem). Lança `ApiError` só em falha
   * real (rede, `site_not_provisioned`, etc.).
   */
  get(): Promise<PixnopdvStoreCredentials | null>;

  /**
   * Grava (upsert) as credenciais — `PUT /v1/pixnopdv-store-credentials`. Campo omitido em
   * `input` mantém o valor gravado; `null` apaga. Quem chama nunca deve preencher `basicToken`/
   * `secretKey` com string vazia "só para não deixar undefined" — isso apagaria o segredo (mesma
   * invariante do legado). Devolve a view já atualizada.
   */
  save(input: PixnopdvStoreCredentialsInput): Promise<PixnopdvStoreCredentials | null>;
}
