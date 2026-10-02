import { describe, expect, it } from "vitest";
import { buildJobRows, unmappedAggregates } from "./job-rows";
import { FB_TO_PG_JOBS, PG_TO_FB_JOBS } from "./sync-jobs";
import type { MirrorJobAggregate, MirrorJobStats } from "./sync-mirror";

const agg = (over: Partial<MirrorJobAggregate>): MirrorJobAggregate => ({
  direction: "fb_to_pg",
  table: "products",
  lines: 1,
  recordsAffected: 0,
  errors: 0,
  last: null,
  ...over,
});

const stat = (over: Partial<MirrorJobStats>): MirrorJobStats => ({
  direction: "fb_to_pg",
  table: "products",
  cycles: 0,
  read: 0,
  written: 0,
  unchanged: 0,
  errors: 0,
  lastMinute: null,
  ...over,
});

describe("linhas da aba Ao vivo", () => {
  it("soma as duas tabelas do job 6 e pega o último registro mais recente", () => {
    const rows = buildJobRows(
      FB_TO_PG_JOBS,
      [
        agg({ table: "orders", lines: 2, recordsAffected: 3, last: "2026-09-30T11:59:00Z" }),
        agg({ table: "order_items", lines: 1, recordsAffected: 5, errors: 1, last: "2026-09-30T11:59:30Z" }),
      ],
      { available: false, rows: [] },
    );
    const job6 = rows.find((r) => r.job.order === 6)!;
    expect(job6).toMatchObject({ present: true, lines: 3, affected: 8, errors: 1, last: "2026-09-30T11:59:30Z" });
    expect(job6.unchanged).toBeNull();
    expect(job6.cycles).toBeNull();
  });

  it("sem linha no log mas com ciclos no rollup: presente, zerado, com inalterados", () => {
    const rows = buildJobRows(FB_TO_PG_JOBS, [], {
      available: true,
      rows: [stat({ cycles: 60, read: 6900, unchanged: 6900, lastMinute: "2026-09-30T11:59:00Z" })],
    });
    const products = rows.find((r) => r.job.order === 4)!;
    expect(products).toMatchObject({
      present: true,
      affected: 0,
      cycles: 60,
      read: 6900,
      unchanged: 6900,
      last: "2026-09-30T11:59:00Z",
    });
    expect(rows.find((r) => r.job.order === 3)).toMatchObject({ present: false, cycles: null, last: null });
  });

  it("job de saída não tem inalterados nem lidos, mesmo com rollup", () => {
    const rows = buildJobRows(PG_TO_FB_JOBS, [], {
      available: true,
      rows: [stat({ direction: "pg_to_fb", table: "orders", cycles: 12, read: 4, unchanged: 4 })],
    });
    const job10 = rows.find((r) => r.job.order === 10)!;
    expect(job10).toMatchObject({ cycles: 12, unchanged: null, read: null, present: true });
  });

  it("rollup indisponível é ignorado", () => {
    const rows = buildJobRows(FB_TO_PG_JOBS, [], { available: false, rows: [stat({ cycles: 9 })] });
    expect(rows.every((r) => r.cycles === null && !r.present)).toBe(true);
  });

  it("pares fora do catálogo aparecem à parte", () => {
    expect(
      unmappedAggregates([agg({}), agg({ table: "tabela_nova" }), agg({ direction: "pg_to_fb", table: "units" })]),
    ).toEqual([agg({ table: "tabela_nova" }), agg({ direction: "pg_to_fb", table: "units" })]);
  });
});
