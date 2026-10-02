import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import type { MirrorAlarm } from "../domain/sync-mirror";
import { formatCount, formatDayTime } from "../domain/mirror-format";
import { DirectionTag, Tag } from "./mirror-ui";

/** Alarmes (24 h) da aba Saúde — tabela de `HealthPanel` do legado, separada por tamanho. */
export function AlarmsCard({ alarms }: { alarms: MirrorAlarm[] }) {
  return (
    <Card className="glass-panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider">Alarmes (24 h)</h3>
        <span className="text-xs text-muted-foreground">
          erros agrupados pelo início da mensagem — a mesma condição repetida vira uma linha
        </span>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-right text-[10px] uppercase tracking-wider">Vezes</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Dir.</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Tabela</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Condição</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider">Último</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alarms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm">
                    <Tag tone="ok">sem alarmes em 24 h</Tag>
                  </TableCell>
                </TableRow>
              )}
              {alarms.map((a, i) => (
                <TableRow key={`${a.direction}-${a.table}-${i}`}>
                  <TableCell className="text-right font-mono text-sm font-semibold tabular-nums text-destructive">
                    {formatCount(a.occurrences)}
                  </TableCell>
                  <TableCell>
                    <DirectionTag direction={a.direction} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs">{a.table}</TableCell>
                  <TableCell className="min-w-[24rem] max-w-[48rem] text-xs leading-snug text-muted-foreground">
                    {a.summary}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {formatDayTime(a.last)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
