import { filterAuditLogsByActionAndPeriod, type AuditPeriodFilter } from "@/shared/audit/audit-log";
import type { AgentAuditLog } from "./agent-config";

/** Igual ao legado (`AgentAuditDialog.tsx#ACTION_CONFIG`) — o ícone fica na UI. */
export const AGENT_AUDIT_ACTION_LABELS: Record<AgentAuditLog["action"], string> = {
  created: "Criado",
  updated: "Editado",
  toggled: "Status alterado",
};

export const AGENT_AUDIT_ACTION_BADGE_VARIANT: Record<AgentAuditLog["action"], "default" | "secondary" | "outline"> = {
  created: "default",
  updated: "secondary",
  toggled: "outline",
};

/** Igual ao legado (`AgentAuditDialog.tsx#FIELD_LABELS`). */
export const AGENT_AUDIT_FIELD_LABELS: Record<string, string> = {
  agent_name: "Nome",
  is_active: "Ativo",
  api_rate_limit: "Rate Limit",
  log_level: "Nível de Log",
  sefaz_timeout_ms: "Timeout SEFAZ",
  retry_max_attempts: "Tentativas Retry",
  retry_backoff_ms: "Backoff",
  contingency_enabled: "Contingência",
  contingency_reason: "Motivo Contingência",
  contingency_auto_transmit: "Auto-transmitir",
  contingency_worker_enabled: "Worker Contingência",
  contingency_worker_interval_ms: "Intervalo Worker",
  contingency_substitution_worker_enabled: "Worker Substituição",
  contingency_substitution_worker_interval_ms: "Intervalo Substituição",
  contingency_substitution_xjust: "Justificativa Substituição",
  contingency_sla_warn_hours: "SLA Alerta (h)",
  contingency_sla_block_hours: "SLA Bloqueio (h)",
  sync_service_enabled: "Sync Habilitado",
  sync_service_url: "URL Sync",
};

export type AgentAuditActionFilter = "all" | AgentAuditLog["action"];
export type AgentAuditPeriodFilter = AuditPeriodFilter;
export { formatAuditDateTime, formatAuditValue } from "@/shared/audit/audit-log";

/**
 * Porta pura de `AgentAuditDialog.tsx#filteredLogs` (o `useMemo` vira responsabilidade da UI;
 * aqui só o filtro em si, testável com um `now` fixo — implementação comum em `shared/audit`).
 */
export function filterAgentAuditLogs(
  logs: AgentAuditLog[],
  actionFilter: AgentAuditActionFilter,
  periodFilter: AgentAuditPeriodFilter,
  now: Date = new Date(),
): AgentAuditLog[] {
  return filterAuditLogsByActionAndPeriod(logs, actionFilter, periodFilter, now);
}
