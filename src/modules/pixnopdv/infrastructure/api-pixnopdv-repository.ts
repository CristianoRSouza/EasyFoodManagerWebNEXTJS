import { apiRequest } from "@/shared/http/api-client";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import type { PixnopdvRepository } from "../application/pixnopdv-repository";
import type { PixnopdvStoreCredentials, PixnopdvStoreCredentialsInput } from "../domain/pixnopdv-store-credentials";
import { toPixnopdvPutBody, toPixnopdvStoreCredentials } from "./pixnopdv-mapper";

/**
 * Credenciais PIXnoPDV pela rota `/v1/pixnopdv-store-credentials`
 * (`easyfoodmanagerAPI/src/routes/v1/pixnopdv-store-credentials.ts`) — mesma rota nos dois
 * backends (`lan` e `cloud`; ver `PixnopdvRepository`). A API resolve a loja do lado servidor
 * (`resolveSiteIdentity()`), então o `tenant` aqui serve para o cabeçalho `x-company-id`/
 * `x-store-id` que a API confere, igual a qualquer outro repositório do projeto.
 *
 * A API já remove os segredos em claro da resposta (`mapRowToClient`: só `basic_token_set`/
 * `secret_key_set`); este repositório só traduz o formato de fio (`pixnopdv-mapper.ts`), nunca
 * decifra nem reconstrói segredo.
 */
export class ApiPixnopdvRepository implements PixnopdvRepository {
  constructor(private readonly tenant: Tenant) {}

  async get(): Promise<PixnopdvStoreCredentials | null> {
    const response = await apiRequest<{ data?: unknown }>("/pixnopdv-store-credentials", {
      tenant: this.tenant,
    });
    return toPixnopdvStoreCredentials(response.data);
  }

  async save(input: PixnopdvStoreCredentialsInput): Promise<PixnopdvStoreCredentials | null> {
    // Campo ausente continua ausente no JSON (`toPixnopdvPutBody`), e do outro lado ausente
    // significa "mantém o gravado" (mesmo comentário do legado, `data-service.ts`). Preencher com
    // vazio aqui apagaria o segredo.
    const response = await apiRequest<{ ok?: boolean; data?: unknown }>("/pixnopdv-store-credentials", {
      method: "PUT",
      body: toPixnopdvPutBody(input),
      tenant: this.tenant,
    });
    return toPixnopdvStoreCredentials(response.data);
  }
}
