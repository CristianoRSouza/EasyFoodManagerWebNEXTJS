"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import type { MirrorCycleHistoryResult } from "../domain/sync-mirror";
import type { CycleRangeId } from "../domain/cycle-rules";
import { formatCount } from "../domain/mirror-format";
import { CycleRangeSelect } from "./CycleRangeSelect";

/**
 * Visão longa: média e pico por balde, do rollup de 30 dias (migração 052) — `HistoricoLongo` de
 * `LEGACY/src/components/sync-mirror/CyclesPanel.tsx`. Duas séries de propósito: só a média
 * esconderia o pico; só o pico faria parecer que tudo está sempre ruim.
 */
export function CycleHistoryView({
  history,
  range,
  onRangeChange,
}: {
  history: MirrorCycleHistoryResult | null;
  range: CycleRangeId;
  onRangeChange: (r: CycleRangeId) => void;
}) {
  const rows = history?.rows ?? [];
  const data = rows.map((l) => ({
    quando: new Date(l.bucket).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
    media: l.avgMs,
    pico: l.maxMs,
  }));
  const totalCycles = rows.reduce((a, l) => a + l.cycles, 0);
  const totalSlow = rows.reduce((a, l) => a + l.slow, 0);

  return (
    <Card className="glass-panel">
      <CardContent className="space-y-3 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CycleRangeSelect range={range} onRangeChange={onRangeChange} />
          <span className="text-xs text-muted-foreground">
            {formatCount(totalCycles)} ciclos · {formatCount(totalSlow)} lento(s)
            {history?.bucketMin ? ` · balde de ${history.bucketMin} min` : ""}
          </span>
        </div>

        {history && !history.available ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Historico longo indisponivel: a migracao 052 (<span className="font-mono">sync_cycle_stats</span>) ainda
            nao foi aplicada nesta loja. Use o periodo detalhado, que le o{" "}
            <span className="font-mono">sync_heartbeat</span>.
          </p>
        ) : data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sem dados nesta faixa ainda — o rollup comecou a acumular agora.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="quando"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                interval="preserveStartEnd"
                minTickGap={56}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                width={52}
                label={{
                  value: "ms",
                  position: "insideTopLeft",
                  offset: -2,
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [`${formatCount(v)} ms`, name === "media" ? "Media" : "Pico"]}
              />
              <Bar dataKey="pico" name="pico" fill="hsl(var(--warning) / 0.45)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="media" name="media" fill="hsl(var(--primary) / 0.75)" radius={[2, 2, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm bg-primary/75" aria-hidden /> media do balde
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm bg-warning/45" aria-hidden /> pico do balde
          </span>
          <span>A media vem de soma÷contagem, nunca da media das medias — baldes tem contagens diferentes.</span>
        </div>
      </CardContent>
    </Card>
  );
}
