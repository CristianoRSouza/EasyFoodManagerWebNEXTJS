import { apiRequest } from "@/shared/http/api-client";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import type { RuntimeInfo } from "@/shared/runtime/runtime-context";
import type { AgentRepository } from "../application/agent-repository";
import { agentCloudBody, agentConfigFormDataWithoutName } from "../domain/agent-config";
import type { AgentAuditLog, AgentConfig, AgentConfigFormData } from "../domain/agent-config";
import { toAgentAuditLog, toAgentConfig } from "./agent-config-mapper";

type Row = Record<string, unknown>;

/**
 * No backend `cloud`, um 2xx com `ok: false` no corpo é falha — como no legado, onde
 * `createAgentConfig`/`updateAgentConfig`/`toggleAgentActive` (ramo `isCloudApiMode()`) devolvem
 * `{ ok: false }` e a página mostra "Erro ao cadastrar/salvar/alterar status". Desde o legado 1.3.12
 * (PR #52) criar/editar repassam o `error` da resposta à tela ("o erro TEM de chegar à tela");
 * ativar/desativar continua sem descrição. No LAN (ramo Admin API) o legado só olha o status HTTP.
 * Ver fase-4-revisao-final.md, C3.
 */
type CloudWrite = { ok?: boolean; error?: string };

/**
 * Agentes de serviço pelas rotas `/v1/service-agents*`
 * (`easyfoodmanagerAPI/src/routes/v1/service-agents.ts`).
 *
 * O mesmo caminho relativo atende os dois backends do Next (confirmado em
 * `easyfoodmanagerWEB/src/lib/data-service.ts` e `cloud-api-data.ts`: `fetchApiAgentConfigs`/
 * `criarAgenteApi`/`editarAgenteApi`/`ativarAgenteApi` chamam exatamente `/v1/service-agents*`,
 * igual ao ramo Admin API). Só o CORPO da escrita difere por backend, como no legado:
 *
 * - `lan` (ramo Admin API de `createAgentConfig`/`updateAgentConfig`): `install_path: null`
 *   sempre reenviado.
 * - `cloud` (ramo `isCloudApiMode()`, `criarAgenteApi(data)`/`editarAgenteApi(id, resto)`): o
 *   formulário cru, SEM `install_path` — o schema da EasyFoodAPI é estrito e o legado nunca o
 *   manda por lá.
 */
export class ApiAgentRepository implements AgentRepository {
  constructor(
    private readonly tenant: Tenant,
    private readonly backend: RuntimeInfo["backend"],
  ) {}

  /** Campos extras que só o ramo Admin API (LAN) do legado acrescenta ao formulário. */
  private lanExtras(): { install_path?: null } {
    return this.backend === "lan" ? { install_path: null } : {};
  }

  async list(): Promise<AgentConfig[]> {
    const response = await apiRequest<{ data: Row[] }>("/service-agents", { tenant: this.tenant });
    return (response.data ?? []).map(toAgentConfig);
  }

  /**
   * No LAN, `install_path: null` explícito — igual ao legado (`data-service.ts#createAgentConfig`,
   * ramo Admin API: `row = { ...data, install_path: null }`). No cloud, o formulário cru, como
   * `criarAgenteApi(data)`.
   */
  async create(data: AgentConfigFormData): Promise<void> {
    const body = this.backend === "cloud" ? agentCloudBody({ ...data }, { withName: true }) : { ...data, ...this.lanExtras() };
    const response = await apiRequest<CloudWrite>("/service-agents", { method: "POST", body, tenant: this.tenant });
    this.assertCloudWriteOk(response, { withMessage: true });
  }

  /**
   * `agent_name` nunca vai no PATCH — é chave de identificação do agente, não editável (igual ao
   * legado nos dois ramos, Admin API e Cloud API). `install_path: null` só no LAN, mesma razão
   * de `create`.
   */
  async update(id: string, data: AgentConfigFormData): Promise<void> {
    // Nuvem: lista branca (legado 1.3.12, PR #52 — schema `.strict()` da EasyFood API).
    const body =
      this.backend === "cloud"
        ? agentCloudBody({ ...data }, { withName: false })
        : { ...this.lanExtras(), ...agentConfigFormDataWithoutName(data) };
    const response = await apiRequest<CloudWrite>(`/service-agents/${encodeURIComponent(id)}`, { method: "PATCH", body, tenant: this.tenant });
    this.assertCloudWriteOk(response, { withMessage: true });
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const response = await apiRequest<CloudWrite>(`/service-agents/${encodeURIComponent(id)}/active`, {
      method: "PATCH",
      body: { is_active: isActive },
      tenant: this.tenant,
    });
    this.assertCloudWriteOk(response);
  }

  /** Ver `CloudWrite`. `withMessage`: criar/editar repassam o `error` da nuvem (legado 1.3.12). */
  private assertCloudWriteOk(response: CloudWrite | undefined, { withMessage = false } = {}): void {
    if (this.backend === "cloud" && response?.ok === false) throw new Error(withMessage ? (response.error ?? "") : "");
  }

  async auditLogs(agentId: string): Promise<AgentAuditLog[]> {
    const response = await apiRequest<{ data: Row[] }>(`/service-agents/${encodeURIComponent(agentId)}/audit-logs`, {
      tenant: this.tenant,
    });
    return (response.data ?? []).map(toAgentAuditLog);
  }
}
