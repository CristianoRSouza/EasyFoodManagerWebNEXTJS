import { apiRequest } from "@/shared/http/api-client";
import type { Envelope } from "@/shared/http/envelope";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import type { AuditLogRepository } from "../application/audit-log-repository";
import type { UnifiedAuditLog } from "../domain/unified-audit-log";
import { toUnifiedAuditLog } from "./unified-audit-log-mapper";

/** Mesmo limite que `AuditLogsPage` do legado passa a `fetchApiUnifiedAuditLogs(500)`. */
const UNIFIED_AUDIT_LIMIT = 500;

/**
 * Auditoria unificada pela EasyFoodAPI, via repasse do Next: `GET /v1/audit-logs?limit=500` —
 * a rota que o cliente `LEGACY/src/lib/cloud-api-data.ts#fetchApiUnifiedAuditLogs` define. A
 * empresa NÃO vai como parâmetro (igual ao legado): o recorte vem da sessão e do cabeçalho de
 * tenant, que o servidor confere. A API devolve a lista já ordenada (mais recente primeiro).
 *
 * Não existe rota equivalente na easyfoodmanagerAPI da loja — por isso a tela só monta este
 * repositório no backend `cloud`.
 */
export class ApiAuditLogRepository implements AuditLogRepository {
  constructor(private readonly tenant: Tenant) {}

  async listUnified(): Promise<UnifiedAuditLog[]> {
    const response = await apiRequest<Partial<Envelope<Record<string, unknown>[]>>>(
      `/audit-logs?limit=${UNIFIED_AUDIT_LIMIT}`,
      { tenant: this.tenant },
    );
    return (response?.data ?? []).map(toUnifiedAuditLog).filter((log): log is UnifiedAuditLog => log !== null);
  }
}
