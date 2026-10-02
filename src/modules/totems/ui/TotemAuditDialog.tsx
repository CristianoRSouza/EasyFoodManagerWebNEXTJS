"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAutoHideScroll } from "@/shared/ui/use-auto-hide-scroll";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useTotemRepository } from "./use-totem-repository";
import { AUDIT_ACTION_LABELS, AUDIT_FIELD_LABELS, filterAuditLogs, formatAuditDateTime, formatAuditValue, type AuditPeriodFilter } from "../domain/totem-audit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/ui/primitives/dialog";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { PlusCircle, Pencil, ToggleRight, FilterX } from "lucide-react";

interface TotemAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totemId: string | null;
  totemName: string;
}

const ACTION_ICON = { created: PlusCircle, updated: Pencil, toggled: ToggleRight } as const;

const PAGE_SIZE = 20;

/** Cópia fiel de `LEGACY/src/components/totem/TotemAuditDialog.tsx` (filtros/rótulos em `domain/totem-audit.ts`). */
export function TotemAuditDialog({ open, onOpenChange, totemId, totemName }: TotemAuditDialogProps) {
  const tenant = useRequiredTenant();
  const repository = useTotemRepository();
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<AuditPeriodFilter>("all");
  const scrollRef = useAutoHideScroll<HTMLDivElement>();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["totem-audit", totemId, tenant.companyId, tenant.storeId],
    queryFn: () => repository.auditLogs(totemId!),
    enabled: open && !!totemId,
  });

  const filteredLogs = useMemo(() => filterAuditLogs(logs, actionFilter, periodFilter), [logs, actionFilter, periodFilter]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- volta à 1ª página ao trocar de filtro, mesmo comportamento do legado
    setVisibleCount(PAGE_SIZE);
  }, [actionFilter, periodFilter]);

  const visibleLogs = useMemo(() => filteredLogs.slice(0, visibleCount), [filteredLogs, visibleCount]);
  const hasMore = visibleCount < filteredLogs.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredLogs.length));
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, filteredLogs.length]);

  const hasFilters = actionFilter !== "all" || periodFilter !== "all";
  const clearFilters = () => {
    setActionFilter("all");
    setPeriodFilter("all");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:rounded-lg sm:border">
        <DialogHeader className="shrink-0 border-b border-border bg-muted/30 px-4 py-3 text-left sm:px-6 sm:py-4">
          <DialogTitle className="text-base sm:text-lg">Histórico de Alterações</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm break-all">{totemName}</DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b border-border bg-background px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Select value={actionFilter} onValueChange={setActionFilter}>
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

              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as AuditPeriodFilter)}>
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
            </div>

            <div className="flex items-center justify-between gap-2 sm:contents">
              {hasFilters && (
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
                  <FilterX className="h-3.5 w-3.5" /> Limpar
                </Button>
              )}
              <span className="text-[11px] text-muted-foreground sm:ml-auto sm:text-xs">
                {filteredLogs.length} de {logs.length} registro(s)
              </span>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto autohide-scroll">
          <div className="px-4 py-4 sm:px-6">
            {isLoading ? (
              <div className="space-y-4 py-2" aria-busy="true" aria-label="Carregando histórico">
                {Array.from({ length: 4 }).map((_, i) => (
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
            ) : filteredLogs.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                {hasFilters ? "Nenhum registro para os filtros selecionados" : "Nenhum registro de alteração"}
              </p>
            ) : (
              <div className="relative pl-5 sm:pl-6 space-y-0">
                <div className="absolute left-[9px] sm:left-[11px] top-2 bottom-2 w-px bg-border" />

                {visibleLogs.map((log) => {
                  const config = AUDIT_ACTION_LABELS[log.action] ?? AUDIT_ACTION_LABELS.updated!;
                  const Icon = ACTION_ICON[log.action] ?? Pencil;

                  return (
                    <div key={log.id} className="relative pb-5 sm:pb-6 last:pb-0">
                      <div className="absolute -left-5 sm:-left-6 top-1 flex items-center justify-center w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] rounded-full bg-background border-2 border-border">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 gap-y-1 flex-wrap">
                          <Badge variant={config.variant} className="text-[10px]">
                            {config.label}
                          </Badge>
                          <span className="text-[11px] sm:text-xs text-muted-foreground">{formatAuditDateTime(log.created_at)}</span>
                          <span className="text-[11px] sm:text-xs text-muted-foreground break-all">
                            por <span className="font-medium text-foreground">{log.performed_by}</span>
                          </span>
                        </div>

                        {log.changed_fields.length > 0 && (
                          <div className="bg-muted/50 rounded-md p-2.5 sm:p-3 space-y-2 text-xs">
                            {log.changed_fields.map((field) => {
                              const label = AUDIT_FIELD_LABELS[field] ?? field;
                              const prev = log.previous_values[field];
                              const next = log.new_values[field];
                              return (
                                <div key={field} className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-1.5">
                                  <span className="font-medium text-muted-foreground sm:min-w-[120px] shrink-0">{label}:</span>
                                  {log.action === "created" ? (
                                    <span className="text-foreground break-all">{formatAuditValue(next)}</span>
                                  ) : (
                                    <span className="break-all">
                                      <span className="text-destructive line-through">{formatAuditValue(prev)}</span>
                                      <span className="mx-1 text-muted-foreground">→</span>
                                      <span className="text-primary font-medium">{formatAuditValue(next)}</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {hasMore && (
                  <div ref={sentinelRef} className="py-4 text-center">
                    <span className="text-xs text-muted-foreground animate-pulse">Carregando mais…</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
