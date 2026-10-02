"use client";

/**
 * Cards "Eventos em retry ativo", "Falhas terminais por erro" e "Últimas falhas (top 30)" do
 * `SyncEventsPanel` legado (JSX/classes/textos idênticos).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { formatDateTime as fmtDate } from "@/shared/format/date-time";
import { SyncOpBadge } from "./SyncBadges";
import { formatRelativeAgo as fmtRelative, nextRetryLabel } from "./sync-events-format";
import type { PanelActiveRetry, PanelFailureGroup, PanelRecentFailure } from "./sync-events-types";

export function SyncActiveRetriesCard({ retries }: { retries: PanelActiveRetry[] }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-sm sm:text-base">Eventos em retry ativo</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="md:hidden divide-y divide-border/50">
          {retries.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">Nenhum evento em retry</p>
          )}
          {retries.map((r) => (
            <div key={r.event_id} className="p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm truncate">{r.entity_name}</span>
                <SyncOpBadge op={r.op} />
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono">{r.event_id.slice(0, 8)}…</span>
                <span>retry {r.retry_count} · {nextRetryLabel(r.next_retry_after)}</span>
              </div>
              {r.ultimo_erro && (
                <p className="text-[11px] text-destructive break-words border-t border-border/40 pt-1.5">{r.ultimo_erro}</p>
              )}
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Op</TableHead>
                <TableHead className="text-right">Retry</TableHead>
                <TableHead>Próxima tentativa</TableHead>
                <TableHead>Último erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retries.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum evento em retry</TableCell></TableRow>
              )}
              {retries.map((r) => (
                <TableRow key={r.event_id}>
                  <TableCell className="font-mono text-xs">{r.event_id.slice(0, 8)}…</TableCell>
                  <TableCell className="font-mono text-sm">{r.entity_name}</TableCell>
                  <TableCell>
                    <SyncOpBadge op={r.op} />
                  </TableCell>
                  <TableCell className="text-right">{r.retry_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{nextRetryLabel(r.next_retry_after)}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-xs text-destructive">{r.ultimo_erro || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function SyncFailureGroupsCard({ failures }: { failures: PanelFailureGroup[] }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-sm sm:text-base">Falhas terminais por erro</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="md:hidden divide-y divide-border/50">
          {failures.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">Sem falhas</p>
          )}
          {failures.map((r, i) => (
            <div key={`${r.entity_name}-${i}`} className="p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm truncate">{r.entity_name}</span>
                <span className="text-xs"><span className="font-bold">{r.qtd}</span> · {r.retries_gastos} retries</span>
              </div>
              <p className="text-[11px] text-destructive break-words">{r.erro_resumido || "—"}</p>
              <p className="text-[11px] text-muted-foreground">Último: {fmtRelative(r.ultimo)}</p>
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entidade</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Retries</TableHead>
                <TableHead>Último</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failures.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem falhas</TableCell></TableRow>
              )}
              {failures.map((r, i) => (
                <TableRow key={`${r.entity_name}-${i}`}>
                  <TableCell className="font-mono text-sm">{r.entity_name}</TableCell>
                  <TableCell className="max-w-[420px] truncate text-xs text-destructive">{r.erro_resumido || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{r.qtd}</TableCell>
                  <TableCell className="text-right">{r.retries_gastos}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtRelative(r.ultimo)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function SyncRecentFailuresCard({ recent }: { recent: PanelRecentFailure[] }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-sm sm:text-base">Últimas falhas (top 30)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="md:hidden divide-y divide-border/50">
          {recent.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">Sem falhas recentes</p>
          )}
          {recent.map((r) => (
            <div key={r.event_id} className="p-3 space-y-1.5 bg-destructive/5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm truncate">{r.entity_name}</span>
                <SyncOpBadge op={r.op} />
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="font-mono">{fmtDate(r.received_at)}</span>
                <span>retry {r.retry_count}</span>
              </div>
              {r.erro && (
                <p className="text-[11px] text-destructive break-words">{r.erro}</p>
              )}
            </div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recebido</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Op</TableHead>
                <TableHead className="text-right">Retry</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sem falhas recentes</TableCell></TableRow>
              )}
              {recent.map((r) => (
                <TableRow key={r.event_id} className="bg-destructive/5">
                  <TableCell className="font-mono text-xs">{fmtDate(r.received_at)}</TableCell>
                  <TableCell className="font-mono text-sm">{r.entity_name}</TableCell>
                  <TableCell>
                    <SyncOpBadge op={r.op} />
                  </TableCell>
                  <TableCell className="text-right">{r.retry_count}</TableCell>
                  <TableCell className="max-w-[420px] truncate text-xs text-destructive">{r.erro || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
