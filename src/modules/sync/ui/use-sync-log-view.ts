"use client";

import { useMemo, useState } from "react";
import {
  countSyncLogOutcomes,
  distinctSyncLogTables,
  filterSyncLogs,
  pageSyncLogs,
  syncLogTotalPages,
  type SyncLog,
  type SyncLogFilters,
} from "../domain/sync-log";

/**
 * Filtros e paginação da aba "Log". Fica no nível da página (e não dentro da aba) porque o
 * `Tabs` desmonta a aba inativa: no legado, filtros e página sobreviviam à troca de aba.
 * Mudar qualquer filtro volta para a primeira página, como `setLogPage(0)` do legado.
 */
export function useSyncLogView(logs: readonly SyncLog[]) {
  const [filters, setFilters] = useState<SyncLogFilters>({ status: "all", direction: "all", table: "all" });
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => filterSyncLogs(logs, filters), [logs, filters]);
  const counts = useMemo(() => countSyncLogOutcomes(filtered), [filtered]);
  const tables = useMemo(() => distinctSyncLogTables(logs), [logs]);

  const setFilter = (key: keyof SyncLogFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  };

  return {
    filters,
    setFilter,
    filteredCount: filtered.length,
    okCount: counts.ok,
    errorCount: counts.error,
    tables,
    page,
    totalPages: syncLogTotalPages(filtered.length),
    pageLogs: pageSyncLogs(filtered, page),
    previousPage: () => setPage((p) => p - 1),
    nextPage: () => setPage((p) => p + 1),
  };
}

export type SyncLogView = ReturnType<typeof useSyncLogView>;
