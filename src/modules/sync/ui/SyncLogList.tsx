"use client";

import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { formatDateTime } from "@/shared/format/date-time";
import { syncLogStatusIsError } from "@/shared/sync/sync-log-status";
import type { SyncLog } from "../domain/sync-log";

/**
 * Página atual do log: cartões no celular e tabela a partir de `md` (as duas renderizadas, uma
 * escondida por CSS) — JSX e classes de `LEGACY/src/pages/SyncMonitor.tsx`.
 */
export function SyncLogList({ logs }: { logs: readonly SyncLog[] }) {
  return (
    <>
      <div className="md:hidden space-y-2">
        {logs.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhum registro</p>}
        {logs.map((log) => (
          <Card
            key={log.id}
            className={`glass-panel ${syncLogStatusIsError(log.status) ? "border-l-4 border-l-destructive" : ""}`}
          >
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                <StatusBadge status={log.status} />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono break-all">{log.tableName}</span>
                <StatusBadge status={log.direction} />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">Registros</span>
                <span className="font-medium">{log.recordsAffected}</span>
              </div>
              {log.errorMessage && (
                <p className="text-[11px] text-destructive break-words border-t border-border/40 pt-2">{log.errorMessage}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-panel hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead className="text-right">Registros</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mensagem de Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className={syncLogStatusIsError(log.status) ? "bg-destructive/5" : ""}>
                  <TableCell className="font-mono text-xs">{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={log.direction} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.tableName}</TableCell>
                  <TableCell className="text-right">{log.recordsAffected}</TableCell>
                  <TableCell>
                    <StatusBadge status={log.status} />
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-xs text-destructive">{log.errorMessage || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
