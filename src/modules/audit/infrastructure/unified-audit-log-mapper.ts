import { asJsonObject, asText } from "@/shared/infrastructure/convert";
import type { AuditAction, UnifiedAuditLog } from "../domain/unified-audit-log";

type Row = Record<string, unknown>;

function toAction(value: unknown): AuditAction {
  return value === "created" || value === "toggled" ? value : "updated";
}

/**
 * Linha de `GET /v1/audit-logs` → {@link UnifiedAuditLog}. A API já devolve a forma final (o
 * mesmo contrato de `fetchCloudUnifiedAuditLogs` do legado); isto só protege contra campo
 * ausente/nulo ou `jsonb` serializado em texto.
 *
 * Duas decisões de robustez (documentadas no relatório da Fase 5):
 * - ação fora de `created/updated/toggled` vira `updated` — é como o legado a EXIBE
 *   (`ACTION_CONFIG[log.action] ?? ACTION_CONFIG.updated`);
 * - origem fora de `totem/agent` devolve `null` e o repositório descarta a linha — no legado,
 *   `SOURCE_CONFIG[log.source].icon` lançaria e derrubaria a tela inteira.
 */
export function toUnifiedAuditLog(row: Row): UnifiedAuditLog | null {
  const source = row.source;
  if (source !== "totem" && source !== "agent") return null;
  const fields = Array.isArray(row.changed_fields) ? row.changed_fields.map(String) : [];
  return {
    id: asText(row.id) ?? "",
    source,
    entity_id: asText(row.entity_id) ?? "",
    entity_name: asText(row.entity_name) ?? undefined,
    action: toAction(row.action),
    changed_fields: fields,
    previous_values: asJsonObject<Record<string, unknown>>(row.previous_values) ?? {},
    new_values: asJsonObject<Record<string, unknown>>(row.new_values) ?? {},
    performed_by: asText(row.performed_by) ?? "admin",
    created_at: asText(row.created_at) ?? "",
  };
}
