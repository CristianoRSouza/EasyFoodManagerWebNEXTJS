"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import {
  DEFAULT_AUDIT_FILTERS,
  DEFAULT_PAGE_SIZE,
  filterUnifiedAuditLogs,
  hasActiveAuditFilters,
  paginateAuditLogs,
  type AuditFilters,
  type UnifiedAuditLog,
} from "../domain/unified-audit-log";
import { useAuditLogRepository } from "./use-audit-log-repository";

/**
 * Estado de `LEGACY/src/pages/AuditLogsPage.tsx`: consulta (`["unified-audit-logs", …]`,
 * `staleTime` 60 s), filtros no cliente e paginação local. Toda troca de filtro ou de tamanho de
 * página volta à página 1, como no legado.
 */
export function useAuditLogsPage() {
  const tenant = useRequiredTenant();
  const repository = useAuditLogRepository();
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_AUDIT_FILTERS);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  const query = useQuery<UnifiedAuditLog[]>({
    queryKey: ["unified-audit-logs", tenant.companyId, tenant.storeId],
    queryFn: () => repository.listUnified(),
    staleTime: 60_000,
  });
  const logs = useMemo(() => query.data ?? [], [query.data]);

  const filteredLogs = useMemo(() => filterUnifiedAuditLogs(logs, filters), [logs, filters]);
  const page = useMemo(() => paginateAuditLogs(filteredLogs, currentPage, pageSize), [filteredLogs, currentPage, pageSize]);

  const setFilter = useCallback(<K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_AUDIT_FILTERS);
    setCurrentPage(1);
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  return {
    logs,
    filteredLogs,
    visibleLogs: page.visible,
    totalPages: page.totalPages,
    safePage: page.safePage,
    setCurrentPage,
    filters,
    setFilter,
    clearFilters,
    hasFilters: hasActiveAuditFilters(filters),
    pageSize,
    setPageSize,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

export type AuditLogsPageState = ReturnType<typeof useAuditLogsPage>;
