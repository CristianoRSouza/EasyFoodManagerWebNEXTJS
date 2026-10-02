import { isAfter, startOfDay, subDays } from "date-fns";

/**
 * Lógica pura comum aos diálogos de histórico de alterações do legado
 * (`components/totem/TotemAuditDialog.tsx` e `components/agent/AgentAuditDialog.tsx` — o mesmo
 * código copiado nos dois). Rótulos de ação/campo continuam em cada módulo.
 */

export type AuditPeriodFilter = "all" | "today" | "7d" | "30d";

const PERIOD_DAYS: Record<Exclude<AuditPeriodFilter, "all">, number> = { today: 0, "7d": 7, "30d": 30 };

/** Filtra por ação e período (início do dia de `now − N dias`) — `filteredLogs` do legado. */
export function filterAuditLogsByActionAndPeriod<T extends { action: string; created_at: string }>(
  logs: T[],
  actionFilter: string,
  periodFilter: AuditPeriodFilter,
  now: Date = new Date(),
): T[] {
  let result = logs;
  if (actionFilter !== "all") {
    result = result.filter((log) => log.action === actionFilter);
  }
  if (periodFilter !== "all") {
    const cutoff = startOfDay(subDays(now, PERIOD_DAYS[periodFilter]));
    result = result.filter((log) => isAfter(new Date(log.created_at), cutoff));
  }
  return result;
}

/** `Sim`/`Não`/`—`/`String(value)` — `formatValue` do legado. */
export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return String(value);
}

/** `15/01/2026 07:20:00` — `formatDateTime` dos diálogos do legado (sem vírgula, com segundos). */
export function formatAuditDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}
