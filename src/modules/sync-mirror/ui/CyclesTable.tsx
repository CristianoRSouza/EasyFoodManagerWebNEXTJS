import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import type { MirrorCycle } from "../domain/sync-mirror";
import { SLOW_CYCLE_S, cycleSituation, situationTone } from "../domain/cycle-rules";
import { formatCount, formatDayTime, formatDuration } from "../domain/mirror-format";
import { Tag } from "./mirror-ui";

/** Tabela ciclo a ciclo da aba Ciclos (parte de `DetalhePorCiclo` do legado). */
export function CyclesTable({ cycles }: { cycles: MirrorCycle[] }) {
  return (
    <Card className="glass-panel overflow-hidden">
      <CardContent className="p-0">
        <div className="max-h-[26rem] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] uppercase tracking-wider">Fim do ciclo</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider">Duração</TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider">Linhas de log</TableHead>
                <TableHead
                  className="text-right text-[10px] uppercase tracking-wider"
                  title="Soma de records_affected dos jobs deste ciclo. Agrega semânticas diferentes (gravados nos jobs 1-5, percorridos nos 6-7), por isso o rótulo é neutro."
                >
                  Efeito
                </TableHead>
                <TableHead className="text-right text-[10px] uppercase tracking-wider">Atenção</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum ciclo registado.
                  </TableCell>
                </TableRow>
              )}
              {cycles.map((c) => {
                const s = cycleSituation(c);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {formatDayTime(c.lastPing)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono text-xs tabular-nums ${
                        (c.durationS ?? 0) >= SLOW_CYCLE_S ? "font-semibold text-warning" : ""
                      }`}
                    >
                      {formatDuration(c.durationS)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {formatCount(c.logLines)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {c.recordsAffected > 0 ? (
                        <span className="text-success">{formatCount(c.recordsAffected)}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">
                      {c.errors > 0 ? (
                        <span className="font-semibold text-destructive">{formatCount(c.errors)}</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tag tone={situationTone(s)}>{s}</Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
