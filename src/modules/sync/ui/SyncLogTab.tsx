"use client";

import Link from "next/link";
import { ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { SyncLogList } from "./SyncLogList";
import type { SyncLogView } from "./use-sync-log-view";

/**
 * Conteúdo da aba "Log" (FB → PG) do monitor da loja — JSX, classes e textos de
 * `LEGACY/src/pages/SyncMonitor.tsx` (`TabsContent value="log"`).
 *
 * O botão "Ver espelho FB↔PG" aparece sempre: no legado ele dependia de
 * `isSyncMirrorAvailable()`, verdadeiro no Modo 2 (navegador + Admin API), que é exatamente o
 * modo loja do Next. O Electron (onde era falso) não existe no Next.
 */
export function SyncLogTab({ view }: { view: SyncLogView }) {
  const { filters, setFilter } = view;
  return (
    <>
      <div className="-mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Histórico do serviço de sincronização <span className="text-foreground/90 font-medium">Firebird → PostgreSQL</span> —{" "}
          <code className="font-mono bg-muted/70 px-1 rounded">command.sync_log</code>.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/sync/espelho">
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Ver espelho FB↔PG
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4 sm:flex-wrap">
        <Card className="glass-panel sm:flex-1 sm:min-w-[140px]">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-success">{view.okCount}</p>
            <p className="text-xs text-muted-foreground">Sucesso (filtrado)</p>
          </CardContent>
        </Card>
        <Card className="glass-panel sm:flex-1 sm:min-w-[140px]">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-destructive">{view.errorCount}</p>
            <p className="text-xs text-muted-foreground">Erros (filtrado)</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Tabela <code className="font-mono bg-muted/70 px-1 rounded">command.sync_log</code> — últimas operações FB ↔ PG.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:flex sm:gap-3 sm:flex-wrap">
        <Select value={filters.status} onValueChange={(v) => setFilter("status", v)}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ok">OK / sucesso</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.direction} onValueChange={(v) => setFilter("direction", v)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Direção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="fb_to_pg">FB → PG</SelectItem>
            <SelectItem value="pg_to_fb">PG → FB</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.table} onValueChange={(v) => setFilter("table", v)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Tabela" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {view.tables.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SyncLogList logs={view.pageLogs} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs sm:text-sm text-muted-foreground">{view.filteredCount} registros (após filtros)</p>
        <div className="flex gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={view.previousPage} disabled={view.page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm self-center">
            {view.page + 1} / {Math.max(view.totalPages, 1)}
          </span>
          <Button variant="outline" size="sm" onClick={view.nextPage} disabled={view.page >= view.totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
