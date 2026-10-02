import { syncLogStatusIsError, syncLogStatusIsSuccess } from "@/shared/sync/sync-log-status";

/**
 * Uma linha de `command.sync_log` (pista Firebird ↔ PostgreSQL), lida na aba "Log" do monitor
 * de sincronização da loja. `direction` e `status` ficam como texto cru: o `StatusBadge` mostra o
 * rótulo quando conhece o valor e o próprio valor quando não conhece — igual ao legado.
 */
export interface SyncLog {
  id: string;
  direction: string;
  tableName: string;
  recordsAffected: number;
  recordId: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

/** Os três selects da aba "Log". `"all"` desliga o filtro. */
export interface SyncLogFilters {
  /** `"all"` | `"ok"` | `"error"`. */
  status: string;
  /** `"all"` | `"fb_to_pg"` | `"pg_to_fb"`. */
  direction: string;
  /** `"all"` ou o nome exato da tabela. */
  table: string;
}

/** Linhas por página na aba "Log" (`PAGE_SIZE` do legado). */
export const SYNC_LOG_PAGE_SIZE = 50;

/** Quantas linhas a tela pede ao servidor (`fetchSyncLogs` → `/v1/sync/logs?limit=500`). */
export const SYNC_LOG_FETCH_LIMIT = 500;

/** Mesma regra do `filtered` do `SyncMonitor` legado. */
export function filterSyncLogs(logs: readonly SyncLog[], filters: SyncLogFilters): SyncLog[] {
  return logs.filter((l) => {
    if (filters.status !== "all") {
      if (filters.status === "ok" && !syncLogStatusIsSuccess(l.status)) return false;
      if (filters.status === "error" && !syncLogStatusIsError(l.status)) return false;
    }
    if (filters.direction !== "all" && l.direction !== filters.direction) return false;
    if (filters.table !== "all" && l.tableName !== filters.table) return false;
    return true;
  });
}

/** KPIs "Sucesso (filtrado)" e "Erros (filtrado)". */
export function countSyncLogOutcomes(logs: readonly SyncLog[]): { ok: number; error: number } {
  return {
    ok: logs.filter((l) => syncLogStatusIsSuccess(l.status)).length,
    error: logs.filter((l) => syncLogStatusIsError(l.status)).length,
  };
}

/** Opções do select "Tabela": distintas, na ordem em que aparecem (`new Set(...)` do legado). */
export function distinctSyncLogTables(logs: readonly SyncLog[]): string[] {
  return [...new Set(logs.map((l) => l.tableName))];
}

export function syncLogTotalPages(count: number): number {
  return Math.ceil(count / SYNC_LOG_PAGE_SIZE);
}

export function pageSyncLogs(logs: readonly SyncLog[], page: number): SyncLog[] {
  return logs.slice(page * SYNC_LOG_PAGE_SIZE, (page + 1) * SYNC_LOG_PAGE_SIZE);
}
