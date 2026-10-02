import { describe, expect, it } from "vitest";
import {
  buildCyclePoints,
  chartCeiling,
  cycleRange,
  cycleSituation,
  isCycleRangeId,
  situationTone,
} from "./cycle-rules";
import type { MirrorCycle } from "./sync-mirror";

const cycle = (over: Partial<MirrorCycle>): MirrorCycle => ({
  id: "1",
  lastPing: "2026-09-30T12:00:00Z",
  previousPing: null,
  durationS: 0.5,
  logLines: 0,
  recordsAffected: 0,
  errors: 0,
  ...over,
});

describe("situação do ciclo", () => {
  it("erro vence lentidão, que vence efeito", () => {
    expect(cycleSituation(cycle({ errors: 1, durationS: 5, recordsAffected: 3 }))).toBe("atenção");
    expect(cycleSituation(cycle({ durationS: 2, recordsAffected: 3 }))).toBe("lento");
    expect(cycleSituation(cycle({ recordsAffected: 3 }))).toBe("com efeito");
    expect(cycleSituation(cycle({ durationS: null }))).toBe("quieto");
  });

  it("tom da etiqueta", () => {
    expect(situationTone("atenção")).toBe("falha");
    expect(situationTone("lento")).toBe("atencao");
    expect(situationTone("quieto")).toBe("neutro");
    expect(situationTone("com efeito")).toBe("ok");
  });
});

describe("escala do gráfico", () => {
  it("vazio usa 1000 ms; mínimo de 500 ms", () => {
    expect(chartCeiling([])).toBe(1000);
    expect(chartCeiling([100, 120])).toBe(500);
  });

  it("p90 × 1,25 arredondado para cima em degraus de 250", () => {
    const values = Array.from({ length: 10 }, (_, i) => 600 + i * 10); // p90 = 690
    expect(chartCeiling(values)).toBe(1000);
  });

  it("um pico isolado fica acima do teto e é marcado como cortado", () => {
    const cycles = [
      cycle({ id: "c10", durationS: 10 }),
      ...Array.from({ length: 19 }, (_, i) => cycle({ id: `c${i}`, durationS: 0.6 })),
    ];
    const { points, ceiling, clipped } = buildCyclePoints(cycles, () => "12:00:00");
    expect(ceiling).toBe(750);
    expect(clipped).toBe(1);
    // Ordem cronológica: o mais recente (primeiro da API) vai para o fim.
    const last = points[points.length - 1]!;
    expect(last).toMatchObject({ key: "c10", ms: 750, realMs: 10000, clipped: true });
  });

  it("só os 120 ciclos mais recentes entram no gráfico", () => {
    const cycles = Array.from({ length: 150 }, (_, i) => cycle({ id: String(i) }));
    expect(buildCyclePoints(cycles, () => "").points).toHaveLength(120);
  });
});

describe("faixas", () => {
  it("resolve a faixa e valida o id", () => {
    expect(cycleRange("24h")).toMatchObject({ hours: 24, bucketMin: 15 });
    expect(isCycleRangeId("7d")).toBe(true);
    expect(isCycleRangeId("1y")).toBe(false);
  });
});
