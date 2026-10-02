"use client";

import type { ReactNode } from "react";
import { FilterX, User } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import type { AuditPeriodFilter } from "@/shared/audit/audit-log";
import { PAGE_SIZE_OPTIONS, type AuditSourceFilter } from "../domain/unified-audit-log";
import type { AuditLogsPageState } from "./use-audit-logs-page";

type Props = Pick<
  AuditLogsPageState,
  "filters" | "setFilter" | "clearFilters" | "hasFilters" | "pageSize" | "setPageSize" | "filteredLogs" | "logs"
>;

/** Barra de filtros de `LEGACY/src/pages/AuditLogsPage.tsx` (JSX e classes copiados). */
export function AuditLogsFilters({
  filters,
  setFilter,
  clearFilters,
  hasFilters,
  pageSize,
  setPageSize,
  filteredLogs,
  logs,
}: Props): ReactNode {
  return (
    <div className="shrink-0 border-b border-border bg-background px-4 py-2.5 sm:px-6 sm:py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:flex-wrap">
          <Select value={filters.source} onValueChange={(v) => setFilter("source", v as AuditSourceFilter)}>
            <SelectTrigger className="h-9 text-xs sm:h-8 sm:w-[140px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="totem">Totens</SelectItem>
              <SelectItem value="agent">Agentes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.action} onValueChange={(v) => setFilter("action", v)}>
            <SelectTrigger className="h-9 text-xs sm:h-8 sm:w-[160px]">
              <SelectValue placeholder="Tipo de ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="created">Criado</SelectItem>
              <SelectItem value="updated">Editado</SelectItem>
              <SelectItem value="toggled">Status alterado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.period} onValueChange={(v) => setFilter("period", v as AuditPeriodFilter)}>
            <SelectTrigger className="h-9 text-xs sm:h-8 sm:w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>

          <div className="col-span-3 sm:col-auto relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filtrar por usuário"
              value={filters.user}
              onChange={(e) => setFilter("user", e.target.value)}
              className="h-9 pl-8 text-xs sm:h-8 sm:w-[220px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:contents">
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
              <FilterX className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
          <div className="flex items-center gap-1.5 sm:ml-auto">
            <span className="text-[11px] text-muted-foreground sm:text-xs">Exibir</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="h-7 w-[62px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[11px] text-muted-foreground sm:text-xs">
              — {filteredLogs.length} de {logs.length} registro(s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
