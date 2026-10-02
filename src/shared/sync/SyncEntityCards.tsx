"use client";

/**
 * Cards "Por entidade × status" e "Backlog (pendentes nunca tentados)" do `SyncEventsPanel`
 * legado (JSX/classes/textos idênticos).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { SyncStatusBadge } from "./SyncBadges";
import { formatRelativeAgo as fmtRelative } from "./sync-events-format";
import type { PanelBacklogItem, PanelByEntity } from "./sync-events-types";

export function SyncByEntityCard({ byEntity, successKey }: { byEntity: PanelByEntity[]; successKey: string }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-sm sm:text-base">Por entidade × status</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-border/50">
          {byEntity.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">Sem registros</p>
          )}
          {byEntity.map((r, i) => (
            <div key={`${r.entity_name}-${r.status}-${i}`} className="p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm truncate">{r.entity_name}</span>
                <SyncStatusBadge status={r.status} successKey={successKey} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div><span className="text-muted-foreground">Qtd</span><p className="font-medium">{r.qtd}</p></div>
                <div><span className="text-muted-foreground">Em retry</span><p>{r.em_retry}</p></div>
                <div><span className="text-muted-foreground">Max retry</span><p>{r.max_retry}</p></div>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Antigo: {fmtRelative(r.mais_antigo)}</span>
                <span>Recente: {fmtRelative(r.mais_recente)}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Em retry</TableHead>
                <TableHead className="text-right">Max retry</TableHead>
                <TableHead>Mais antigo</TableHead>
                <TableHead>Mais recente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byEntity.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sem registros</TableCell></TableRow>
              )}
              {byEntity.map((r, i) => (
                <TableRow key={`${r.entity_name}-${r.status}-${i}`}>
                  <TableCell className="font-mono text-sm">{r.entity_name}</TableCell>
                  <TableCell><SyncStatusBadge status={r.status} successKey={successKey} /></TableCell>
                  <TableCell className="text-right font-medium">{r.qtd}</TableCell>
                  <TableCell className="text-right">{r.em_retry}</TableCell>
                  <TableCell className="text-right">{r.max_retry}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(r.mais_antigo)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(r.mais_recente)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function SyncBacklogCard({ backlog }: { backlog: PanelBacklogItem[] }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-sm sm:text-base">Backlog (pendentes nunca tentados)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="md:hidden divide-y divide-border/50">
          {backlog.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">Sem backlog 🎉</p>
          )}
          {backlog.map((r) => (
            <div key={r.entity_name} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-sm truncate">{r.entity_name}</p>
                <p className="text-[11px] text-muted-foreground">Antigo: {fmtRelative(r.mais_antigo)}</p>
              </div>
              <span className="font-bold text-base">{r.pendentes_nunca_tentados}</span>
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidade</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead>Mais antigo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backlog.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sem backlog 🎉</TableCell></TableRow>
              )}
              {backlog.map((r) => (
                <TableRow key={r.entity_name}>
                  <TableCell className="font-mono text-sm">{r.entity_name}</TableCell>
                  <TableCell className="text-right font-medium">{r.pendentes_nunca_tentados}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(r.mais_antigo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
