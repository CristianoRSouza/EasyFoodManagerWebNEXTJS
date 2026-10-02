import { asBoolean, asNumber, asText } from "@/shared/infrastructure/convert";
import type { AgentAuditLog, AgentConfig } from "../domain/agent-config";

type Row = Record<string, unknown>;

/** Traduz uma linha de `GET /service-agents` (`nfce_service_agent`) para o domínio. */
export function toAgentConfig(row: Row): AgentConfig {
  return {
    id: asText(row.id) ?? "",
    agent_name: asText(row.agent_name) ?? "",
    is_active: asBoolean(row.is_active),
    install_path: asText(row.install_path),
    api_rate_limit: asNumber(row.api_rate_limit),
    log_level: asText(row.log_level) ?? "info",
    sefaz_timeout_ms: asNumber(row.sefaz_timeout_ms),
    retry_max_attempts: asNumber(row.retry_max_attempts),
    retry_backoff_ms: asNumber(row.retry_backoff_ms),
    contingency_enabled: asBoolean(row.contingency_enabled),
    contingency_reason: asText(row.contingency_reason),
    contingency_auto_transmit: asBoolean(row.contingency_auto_transmit),
    contingency_worker_enabled: asBoolean(row.contingency_worker_enabled),
    contingency_worker_interval_ms: asNumber(row.contingency_worker_interval_ms),
    contingency_substitution_worker_enabled: asBoolean(row.contingency_substitution_worker_enabled),
    contingency_substitution_worker_interval_ms: asNumber(row.contingency_substitution_worker_interval_ms),
    contingency_substitution_xjust: asText(row.contingency_substitution_xjust),
    contingency_sla_warn_hours: asNumber(row.contingency_sla_warn_hours),
    contingency_sla_block_hours: asNumber(row.contingency_sla_block_hours),
    sync_service_enabled: asBoolean(row.sync_service_enabled),
    sync_service_url: asText(row.sync_service_url),
    created_at: asText(row.created_at) ?? "",
    updated_at: asText(row.updated_at) ?? "",
  };
}

const AUDIT_ACTIONS = new Set<AgentAuditLog["action"]>(["created", "updated", "toggled"]);

function asAuditAction(value: unknown): AgentAuditLog["action"] {
  const text = asText(value);
  return text && AUDIT_ACTIONS.has(text as AgentAuditLog["action"]) ? (text as AgentAuditLog["action"]) : "updated";
}

function asJsonRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

/** Traduz uma linha de `GET /service-agents/:id/audit-logs` (`nfce_service_agent_audit`). */
export function toAgentAuditLog(row: Row): AgentAuditLog {
  return {
    id: asText(row.id) ?? "",
    agent_config_id: asText(row.agent_config_id) ?? "",
    action: asAuditAction(row.action),
    changed_fields: Array.isArray(row.changed_fields) ? row.changed_fields.map((field) => String(field)) : [],
    previous_values: asJsonRecord(row.previous_values),
    new_values: asJsonRecord(row.new_values),
    performed_by: asText(row.performed_by) ?? "admin",
    created_at: asText(row.created_at) ?? "",
  };
}
