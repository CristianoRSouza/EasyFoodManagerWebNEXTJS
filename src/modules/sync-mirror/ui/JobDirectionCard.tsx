import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import type { MirrorQueues } from "../domain/sync-mirror";
import type { JobRow } from "../domain/job-rows";
import { directionLabel, explainCount, type SyncDirection } from "../domain/sync-jobs";
import { formatCount, formatDayTime, formatRelative } from "../domain/mirror-format";
import { QueuesCard } from "./QueuesCard";

/**
 * Uma das duas colunas da aba "Ao vivo" (uma por DIREÇÃO) — `ColunaDirecao` de
 * `LEGACY/src/components/sync-mirror/LiveMirrorPanel.tsx`.
 */
export function JobDirectionCard({
  direction,
  rows,
  queues,
}: {
  direction: SyncDirection;
  rows: JobRow[];
  queues?: MirrorQueues | null;
}) {
  const inbound = direction === "fb_to_pg";
  const totalAffected = rows.reduce((a, l) => a + l.affected, 0);
  const totalRead = rows.reduce((a, l) => a + (l.read ?? 0), 0);
  const totalErrors = rows.reduce((a, l) => a + l.errors, 0);

  return (
    <Card className="glass-panel min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <span className="font-mono text-xs font-semibold text-primary">{directionLabel(direction)}</span>
        <h3 className="text-xs font-semibold uppercase tracking-wider">
          {inbound ? "Firebird lido, Postgres escrito" : "Postgres na fila, Firebird escrito"}
        </h3>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
          {inbound && totalRead > 0 && <>{formatCount(totalRead)} lidos · </>}
          {formatCount(totalAffected)} {inbound ? "gravados" : "escritos"}
          {totalErrors > 0 && <span className="ml-2 text-destructive">{formatCount(totalErrors)} com atenção</span>}
        </span>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="[&_td]:px-2.5 [&_td]:py-2 [&_th]:px-2.5">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 text-[10px] uppercase tracking-wider">#</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Job</TableHead>
                <TableHead
                  className="text-right text-[10px] uppercase tracking-wider"
                  title="Quantas vezes o job rodou na janela. É o que separa «rodou e nada mudou» de «não rodou»."
                >
                  Ciclos
                </TableHead>
                {inbound && (
                  <TableHead
                    className="text-right text-[10px] uppercase tracking-wider"
                    title="Registros lidos do Firebird e comparados. Lidos = gravados + inalterados."
                  >
                    Lidos
                  </TableHead>
                )}
                <TableHead className="text-right text-[10px] uppercase tracking-wider">
                  {inbound ? "Gravados" : "Escritos"}
                </TableHead>
                {inbound && (
                  <TableHead
                    className="text-right text-[10px] uppercase tracking-wider"
                    title="Registros lidos do Firebird e descartados por não terem mudado. Vem do rollup sync_job_stats (migração 050)."
                  >
                    Inalterados
                  </TableHead>
                )}
                <TableHead className="text-right text-[10px] uppercase tracking-wider">Atenção</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider">Visto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.job.order} className={l.present ? undefined : "opacity-60"}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{l.job.order}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium" title={l.job.description}>
                    {l.job.label}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {l.cycles != null ? (
                      formatCount(l.cycles)
                    ) : l.present ? (
                      formatCount(l.lines)
                    ) : (
                      <span
                        className="text-muted-foreground"
                        title="Sem rollup e sem linha na sync_log no período: o job rodou sem nada a fazer."
                      >
                        quieto
                      </span>
                    )}
                  </TableCell>
                  {inbound && (
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {l.read == null ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : (
                        <span className="text-foreground/80">{formatCount(l.read)}</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono text-xs tabular-nums" title={explainCount(l.job)}>
                    {l.affected > 0 ? (
                      <span className="font-semibold text-success">{formatCount(l.affected)}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  {inbound && (
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {l.unchanged == null ? (
                        <span className="text-muted-foreground/40" title="Este job ainda não distingue gravado de inalterado.">
                          —
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{formatCount(l.unchanged)}</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {l.errors > 0 ? (
                      <span className="font-semibold text-destructive">{formatCount(l.errors)}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className="whitespace-nowrap text-right font-mono text-xs tabular-nums text-muted-foreground"
                    title={l.last ? formatDayTime(l.last) : undefined}
                  >
                    {l.last ? formatRelative(l.last) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {direction === "pg_to_fb" && <QueuesCard queues={queues ?? null} compact />}
    </Card>
  );
}
