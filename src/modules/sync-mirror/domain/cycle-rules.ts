import type { MirrorCycle } from "./sync-mirror";

/**
 * Regras da aba Ciclos — porta de `LEGACY/src/components/sync-mirror/CyclesPanel.tsx`.
 */

/** Acima disto o ciclo é "lento" — 2 s é ~3× o normal medido (380-900 ms). */
export const SLOW_CYCLE_S = 2;

/** Janela do gráfico ciclo a ciclo. */
export const DETAIL_CHART_CYCLES = 120;

export type CycleSituation = "quieto" | "com efeito" | "lento" | "atenção";

/** Rótulo exibido na etiqueta da tabela (texto do legado). */
export function cycleSituation(c: MirrorCycle): CycleSituation {
  if (c.errors > 0) return "atenção";
  if ((c.durationS ?? 0) >= SLOW_CYCLE_S) return "lento";
  if (c.recordsAffected > 0) return "com efeito";
  return "quieto";
}

export function situationColor(s: CycleSituation): string {
  if (s === "atenção") return "hsl(var(--destructive))";
  if (s === "lento") return "hsl(var(--warning))";
  return "hsl(var(--primary) / 0.55)";
}

export type SituationTone = "falha" | "atencao" | "neutro" | "ok";

export function situationTone(s: CycleSituation): SituationTone {
  return s === "atenção" ? "falha" : s === "lento" ? "atencao" : s === "quieto" ? "neutro" : "ok";
}

/**
 * Escala até o p90, com estouro marcado. Sem isto um único ciclo de 10 s achata os outros contra
 * o eixo; as barras cortadas ficam no teto e a tabela mostra o valor verdadeiro.
 */
export function chartCeiling(values: number[]): number {
  if (values.length === 0) return 1000;
  const sorted = [...values].sort((a, b) => a - b);
  const p90 = sorted[Math.floor(sorted.length * 0.9)] ?? sorted[sorted.length - 1] ?? 0;
  return Math.max(500, Math.ceil((p90 * 1.25) / 250) * 250);
}

export interface CyclePoint {
  key: string;
  clock: string;
  ms: number;
  realMs: number;
  clipped: boolean;
  situation: CycleSituation;
  affected: number;
  errors: number;
}

/** Os últimos 120 ciclos em ordem cronológica, cortados no teto. */
export function buildCyclePoints(
  cycles: MirrorCycle[],
  clockOf: (iso: string) => string,
): { points: CyclePoint[]; ceiling: number; clipped: number } {
  const window = cycles.slice(0, DETAIL_CHART_CYCLES).slice().reverse();
  const ms = window.map((c) => Math.round((c.durationS ?? 0) * 1000));
  const ceiling = chartCeiling(ms);
  const points = window.map<CyclePoint>((c, i) => {
    const real = ms[i] ?? 0;
    return {
      key: c.id,
      clock: clockOf(c.lastPing),
      ms: Math.min(real, ceiling),
      realMs: real,
      clipped: real > ceiling,
      situation: cycleSituation(c),
      affected: c.recordsAffected,
      errors: c.errors,
    };
  });
  return { points, ceiling, clipped: points.filter((p) => p.clipped).length };
}

/**
 * Faixas de tempo. "Detalhado" é a única que mostra ciclo a ciclo — as outras são agregados por
 * balde (texto sem acento, como no legado).
 */
export const CYCLE_RANGES = [
  { id: "detalhe", label: "ultimos ~40 min (ciclo a ciclo)", hours: 0, bucketMin: 0 },
  { id: "6h", label: "ultimas 6 horas", hours: 6, bucketMin: 5 },
  { id: "24h", label: "ultimas 24 horas", hours: 24, bucketMin: 15 },
  { id: "7d", label: "ultimos 7 dias", hours: 168, bucketMin: 60 },
  { id: "30d", label: "ultimos 30 dias", hours: 720, bucketMin: 360 },
] as const;

export type CycleRangeId = (typeof CYCLE_RANGES)[number]["id"];
export type CycleRange = (typeof CYCLE_RANGES)[number];

export function cycleRange(id: CycleRangeId): CycleRange {
  return CYCLE_RANGES.find((r) => r.id === id) ?? CYCLE_RANGES[0];
}

export function isCycleRangeId(value: string): value is CycleRangeId {
  return CYCLE_RANGES.some((r) => r.id === value);
}
