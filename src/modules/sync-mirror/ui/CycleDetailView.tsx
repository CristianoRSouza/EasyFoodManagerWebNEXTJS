"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import type { MirrorCycle } from "../domain/sync-mirror";
import { SLOW_CYCLE_S, buildCyclePoints, situationColor, type CycleRangeId, type CyclePoint } from "../domain/cycle-rules";
import { formatClock, formatCount } from "../domain/mirror-format";
import { CycleRangeSelect } from "./CycleRangeSelect";
import { CyclesTable } from "./CyclesTable";

/** Visão ciclo a ciclo (~40 min do anel de `sync_heartbeat`) — `DetalhePorCiclo` do legado. */
export function CycleDetailView({
  cycles,
  range,
  onRangeChange,
}: {
  cycles: MirrorCycle[];
  range: CycleRangeId;
  onRangeChange: (r: CycleRangeId) => void;
}) {
  const { points, ceiling, clipped } = useMemo(() => buildCyclePoints(cycles, formatClock), [cycles]);

  return (
    <div className="space-y-4">
      <Card className="glass-panel">
        <CardContent className="space-y-3 pt-5">
          <CycleRangeSelect range={range} onRangeChange={onRangeChange} />
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-sm font-semibold">Duração por ciclo</h3>
            <span className="text-xs text-muted-foreground">
              {points.length} ciclos · escala até {formatCount(ceiling)} ms
              {clipped > 0 && ` · ${clipped} acima do teto, marcados e listados abaixo`}
            </span>
          </div>

          {points.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Sem heartbeats na janela. O serviço de sincronização pode estar parado.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="clock"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  interval="preserveStartEnd"
                  minTickGap={48}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={46}
                  domain={[0, ceiling]}
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
                  formatter={(_v: number, _n: string, entry: { payload?: CyclePoint }) => {
                    const p = entry?.payload;
                    if (!p) return ["—", "Ciclo"];
                    return [
                      `${formatCount(p.realMs)} ms${p.clipped ? " (acima do teto do gráfico)" : ""} · ${p.situation}`,
                      `${formatCount(p.affected)} afetados${p.errors ? ` · ${p.errors} com atenção` : ""}`,
                    ];
                  }}
                  labelFormatter={(l: string) => `Ciclo às ${l}`}
                />
                <Bar dataKey="ms" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  {points.map((p) => (
                    <Cell
                      key={p.key}
                      fill={situationColor(p.situation)}
                      stroke={p.clipped ? "hsl(var(--destructive))" : undefined}
                      strokeWidth={p.clipped ? 1.5 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm bg-primary/60" aria-hidden /> normal
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm bg-warning" aria-hidden /> lento (≥ {SLOW_CYCLE_S} s)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-sm bg-destructive" aria-hidden /> com erro no ciclo
            </span>
          </div>
        </CardContent>
      </Card>

      <CyclesTable cycles={cycles} />
    </div>
  );
}
