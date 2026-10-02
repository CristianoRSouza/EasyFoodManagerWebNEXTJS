import { filterAuditLogsByActionAndPeriod, type AuditPeriodFilter } from "@/shared/audit/audit-log";
import type { TotemAuditLog } from "./totem-config";

/**
 * Lógica pura de `LEGACY/src/components/totem/TotemAuditDialog.tsx` (rótulos, filtros e
 * formatação de valor) — os ícones (`lucide-react`) ficam no componente, que é o único lugar
 * deste arquivo com JSX/React.
 */

export const AUDIT_ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  created: { label: "Criado", variant: "default" },
  updated: { label: "Editado", variant: "secondary" },
  toggled: { label: "Status alterado", variant: "outline" },
};

export const AUDIT_FIELD_LABELS: Record<string, string> = {
  totem_name: "Nome",
  is_active: "Ativo",
  nfce_service_url: "URL nfce-service",
  nfce_service_api_key: "API Key NFC-e",
  nfce_emit_timeout_ms: "Timeout emissão NFC-e (ms)",
  tef_http_base_url: "URL base TEF (HTTP)",
  tef_http_api_key: "API Key TEF (X-Api-Key)",
  printer_enabled: "Impressora ativa",
  printer_model: "Modelo impressora",
  printer_port: "Porta impressora",
  printer_code_page: "Code page",
  printer_cols_normal: "Colunas (normal)",
  printer_cut_paper: "Cortar papel",
  printer_cut_type: "Tipo de corte",
  printer_translate_tags: "Traduzir tags",
  printer_ignore_tags: "Ignorar tags",
  printer_verify: "Verificar impressora",
  printer_line_feed_after: "Line feeds após",
  printer_copies: "Cópias",
  printer_timeout_ms: "Timeout impressora (ms)",
  last_heartbeat_at: "Último heartbeat",
  heartbeat_machine_id: "Machine ID",
};

export type { AuditPeriodFilter };
export { formatAuditDateTime, formatAuditValue } from "@/shared/audit/audit-log";

/** Filtra por ação e período — mesma lógica de `TotemAuditDialog#filteredLogs` (ver `shared/audit`). */
export function filterAuditLogs(
  logs: TotemAuditLog[],
  actionFilter: string,
  periodFilter: AuditPeriodFilter,
  now: Date = new Date(),
): TotemAuditLog[] {
  return filterAuditLogsByActionAndPeriod(logs, actionFilter, periodFilter, now);
}
