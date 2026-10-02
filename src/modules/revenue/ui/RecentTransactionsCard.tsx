"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { rawMethodLabel } from "../domain/revenue";
import type { RevenuePageState } from "./use-revenue-page";
import { formatBrl } from "@/shared/format/money";
import { formatDateTime } from "@/shared/format/date-time";

interface RecentTransactionsCardProps {
  screen: RevenuePageState;
}

/** Card "Detalhe e exportação": tabela com scroll infinito + CSV — igual ao legado. */
export function RecentTransactionsCard({ screen }: RecentTransactionsCardProps) {
  const loadMoreAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const anchor = loadMoreAnchorRef.current;
    if (!anchor) return;
    if (!screen.recentHasMore || screen.loading || screen.refreshing || screen.loadingMoreRecent) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) screen.loadMoreRecent();
      },
      { root: null, rootMargin: "220px 0px", threshold: 0 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `screen` é um objeto novo a cada render (retorno de hook); os campos abaixo já cobrem tudo que deve reativar o observer
  }, [screen.recentHasMore, screen.loading, screen.refreshing, screen.loadingMoreRecent, screen.loadMoreRecent]);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Detalhe e exportação</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={screen.exportCsv} disabled={!screen.recentRows.length}>
            <FileDown className="h-4 w-4 mr-1.5" aria-hidden />
            Exportar CSV
          </Button>
          <Button type="button" variant="secondary" size="sm" asChild>
            <Link href="/transactions">Ver todas as transações</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transações aprovadas no período</CardTitle>
          <CardDescription>
            {screen.from} — {screen.to} · Scroll infinito (crédito, débito, PIX e voucher).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {screen.recentRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma transação neste intervalo.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / hora</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="font-mono text-xs">ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screen.recentRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(r.created_at)}</TableCell>
                    <TableCell>{rawMethodLabel(r.payment_method)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatBrl(r.amount)}</TableCell>
                    <TableCell className="font-mono text-[11px] max-w-[140px] truncate" title={r.id}>
                      {r.id}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div ref={loadMoreAnchorRef} className="h-1 w-full" />
          {screen.loadingMoreRecent && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Carregando mais registros...
            </div>
          )}
          {!screen.loadingMoreRecent && screen.recentHasMore && screen.recentRows.length > 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">Role para baixo para carregar mais...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
