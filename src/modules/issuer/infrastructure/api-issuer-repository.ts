import { apiRequest } from "@/shared/http/api-client";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import type { IssuerRepository } from "../application/issuer-repository";
import type { NfceAcbrConfig, NfceIssuerConfig } from "../domain/nfce-issuer-config";
import { toNfceAcbrConfig, toNfceIssuerConfig } from "./issuer-config-mapper";

type Row = Record<string, unknown>;

/**
 * Emitente NFC-e pelas rotas `/v1/nfce/issuer-config` e `/v1/nfce/acbr-config`
 * (`easyfoodmanagerAPI/src/routes/v1/nfce-issuer-config.ts` e `nfce.ts`) — modo LAN.
 *
 * A API já remove os segredos em claro da resposta (ver `nfce-issuer-config.ts#mapIssuerRowToClient`
 * no repo da API); este repositório só busca e mapeia tipos, nunca decifra nem reconstrói segredo.
 */
export class ApiIssuerRepository implements IssuerRepository {
  constructor(private readonly tenant: Tenant) {}

  async list(): Promise<NfceIssuerConfig[]> {
    const response = await apiRequest<{ data: Row[] }>("/nfce/issuer-config", { tenant: this.tenant });
    return (response.data ?? []).map(toNfceIssuerConfig);
  }

  async acbrConfig(): Promise<NfceAcbrConfig[]> {
    // Legado 1.3.12 (PR #37, `fetchNfceAcbrConfig`): a loja lê o `nfce_acbr_config` local e a nuvem
    // (EasyFood API) entrega o espelho sincronizado pela loja — a mesma rota nos dois backends.
    const response = await apiRequest<{ data: Row[] }>("/nfce/acbr-config", { tenant: this.tenant });
    return (response.data ?? []).map(toNfceAcbrConfig);
  }

  async update(id: string, payload: Record<string, unknown>): Promise<void> {
    await apiRequest(`/nfce/issuer-config/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
      tenant: this.tenant,
    });
  }
}
