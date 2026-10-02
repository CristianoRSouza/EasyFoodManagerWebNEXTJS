import { filterAuditLogsByActionAndPeriod, type AuditPeriodFilter } from "@/shared/audit/audit-log";

/**
 * Registro da trilha de auditoria unificada (Totens + Agentes de Serviço) — mesma forma de
 * `LEGACY/src/types/audit.types.ts#UnifiedAuditLog`, que é o contrato de `GET /v1/audit-logs` da
 * EasyFoodAPI (`fetchApiUnifiedAuditLogs` em `LEGACY/src/lib/cloud-api-data.ts`). Nomes em
 * snake_case de propósito: a tela é cópia fiel do legado e referencia estes campos.
 */
export interface UnifiedAuditLog {
  id: string;
  source: AuditSource;
  entity_id: string;
  entity_name?: string;
  action: AuditAction;
  changed_fields: string[];
  previous_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  performed_by: string;
  created_at: string;
}

export type AuditSource = "totem" | "agent";
export type AuditAction = "created" | "updated" | "toggled";
export type AuditSourceFilter = "all" | AuditSource;

export interface AuditFilters {
  source: AuditSourceFilter;
  /** `"all"` ou uma ação — o legado guarda como `string` (valor do `Select`). */
  action: string;
  period: AuditPeriodFilter;
  user: string;
}

/** Estado inicial do legado: últimos 30 dias, sem outros filtros. */
export const DEFAULT_AUDIT_FILTERS: AuditFilters = { source: "all", action: "all", period: "30d", user: "" };

export const PAGE_SIZE_OPTIONS = [15, 30, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 30;

/** Rótulos de campo — `FIELD_LABELS` de `LEGACY/src/pages/AuditLogsPage.tsx`. */
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
  agent_name: "Nome do agente",
  api_rate_limit: "Limite de API",
  log_level: "Nível de log",
  sefaz_timeout_ms: "Timeout SEFAZ (ms)",
  retry_max_attempts: "Tentativas de retry",
  retry_backoff_ms: "Backoff de retry (ms)",
  contingency_enabled: "Contingência habilitada",
  contingency_reason: "Motivo de contingência",
  sync_service_enabled: "Sincronização habilitada",
  sync_service_url: "URL de sincronização",
};

/** `filteredLogs` do legado: origem → ação → período → trecho do usuário. */
export function filterUnifiedAuditLogs(
  logs: UnifiedAuditLog[],
  filters: AuditFilters,
  now: Date = new Date(),
): UnifiedAuditLog[] {
  const bySource = filters.source === "all" ? logs : logs.filter((l) => l.source === filters.source);
  const result = filterAuditLogsByActionAndPeriod(bySource, filters.action, filters.period, now);
  const term = filters.user.trim().toLowerCase();
  return term ? result.filter((l) => l.performed_by.toLowerCase().includes(term)) : result;
}

/** `hasFilters` do legado — o período padrão (30 dias) não conta. */
export function hasActiveAuditFilters(filters: AuditFilters): boolean {
  return (
    filters.action !== "all" ||
    filters.period !== "30d" ||
    filters.source !== "all" ||
    filters.user.trim().length > 0
  );
}

export interface AuditPage {
  totalPages: number;
  safePage: number;
  visible: UnifiedAuditLog[];
}

export function paginateAuditLogs(logs: UnifiedAuditLog[], currentPage: number, pageSize: number): AuditPage {
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  return { totalPages, safePage, visible: logs.slice((safePage - 1) * pageSize, safePage * pageSize) };
}

export type PageItem = number | "ellipsis";

/** Botões de página do legado: 1, última e vizinhas da atual, com "…" onde houver buraco. */
export function buildPageItems(totalPages: number, safePage: number): PageItem[] {
  return Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce<PageItem[]>((acc, p, idx, arr) => {
      const previous = arr[idx - 1];
      if (previous !== undefined && p - previous > 1) acc.push("ellipsis");
      acc.push(p);
      return acc;
    }, []);
}
