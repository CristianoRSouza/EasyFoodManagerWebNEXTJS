"use client";

import type { ReactNode } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { useAutoHideScroll } from "@/shared/ui/use-auto-hide-scroll";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useTenant } from "@/shared/tenant/tenant-context";
import { AuditLogsFilters } from "./AuditLogsFilters";
import { AuditLogTimelineEntry } from "./AuditLogTimelineEntry";
import { AuditLogsPagination } from "./AuditLogsPagination";
import { useAuditLogsPage } from "./use-audit-logs-page";

/**
 * Porta de `LEGACY/src/pages/AuditLogsPage.tsx` — Logs de Auditoria, só administrador do
 * sistema.
 *
 * - Backend `lan`: "Acesso restrito", exatamente o que o legado mostra no modo loja — lá
 *   `useIsSystemAdmin` devolve `false` fora da nuvem (`!isCloudSupabaseMode()`), sem chamar nada.
 *   A easyfoodmanagerAPI da loja também não tem a rota unificada `/v1/audit-logs`; o menu já esconde
 *   o item (`buildNavGroups`). Nenhuma chamada à API.
 * - Backend `cloud`: `isSystemAdmin` vem do `/me/context` (o mesmo que o `useIsSystemAdmin` do
 *   legado consulta no modo API); sem ele, "Acesso restrito", como no legado.
 */
export function AuditLogsPage(): ReactNode {
  const { backend } = useRuntime();
  const { loading, isSystemAdmin } = useTenant();

  if (backend !== "cloud") return <RestrictedAccess />;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isSystemAdmin) return <RestrictedAccess />;

  return <AuditLogsContent />;
}

function RestrictedAccess(): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-muted-foreground">
      <ShieldAlert className="h-16 w-16" />
      <p className="text-lg font-medium">Acesso restrito</p>
      <p className="text-sm">Esta página está disponível apenas para administradores do sistema.</p>
    </div>
  );
}

function AuditLogsContent(): ReactNode {
  const state = useAuditLogsPage();
  const { filteredLogs, visibleLogs, totalPages, safePage, isLoading, isError, isFetching, hasFilters } = state;
  const scrollRef = useAutoHideScroll<HTMLDivElement>();

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold sm:text-xl">Logs de Auditoria</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Histórico de alterações em Totens e Agentes de Serviço
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void state.refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <AuditLogsFilters {...state} />

      {/* Timeline */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto autohide-scroll">
        <div className="px-4 py-4 sm:px-6">
          {isLoading ? (
            <div className="space-y-4 py-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className="text-destructive text-sm py-8 text-center">Não foi possível carregar os logs de auditoria.</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              {hasFilters ? "Nenhum registro para os filtros selecionados" : "Nenhum registro de auditoria"}
            </p>
          ) : (
            <div className="relative pl-5 sm:pl-6 space-y-0">
              <div className="absolute left-[9px] sm:left-[11px] top-2 bottom-2 w-px bg-border" />
              {visibleLogs.map((log) => (
                <AuditLogTimelineEntry key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredLogs.length > 0 && totalPages > 1 && (
          <AuditLogsPagination safePage={safePage} totalPages={totalPages} setCurrentPage={state.setCurrentPage} />
        )}
      </div>
    </div>
  );
}
