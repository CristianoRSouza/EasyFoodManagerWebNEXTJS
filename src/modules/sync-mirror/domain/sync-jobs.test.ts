import { describe, expect, it } from "vitest";
import {
  FB_TO_PG_JOBS,
  PG_TO_FB_JOBS,
  SYNC_JOBS,
  SYNC_JOB_TABLES,
  directionLabel,
  explainCount,
  jobForLogLine,
} from "./sync-jobs";

describe("catálogo de jobs do ciclo", () => {
  it("tem os 10 jobs, na ordem de execução, 7 de entrada e 3 de saída", () => {
    expect(SYNC_JOBS.map((j) => j.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(FB_TO_PG_JOBS).toHaveLength(7);
    expect(PG_TO_FB_JOBS).toHaveLength(3);
    expect(SYNC_JOBS[0]?.label).toBe("Emitente NFC-e");
  });

  it("identifica o job pelo PAR direção/tabela — orders é job diferente em cada direção", () => {
    expect(jobForLogLine("fb_to_pg", "orders")?.order).toBe(6);
    expect(jobForLogLine("fb_to_pg", "order_items")?.order).toBe(6);
    expect(jobForLogLine("pg_to_fb", "orders")?.order).toBe(10);
    expect(jobForLogLine("pg_to_fb", "order_items")?.order).toBe(8);
  });

  it("par desconhecido ou incompleto devolve null, sem lançar", () => {
    expect(jobForLogLine("fb_to_pg", "tabela_nova")).toBeNull();
    expect(jobForLogLine(null, "products")).toBeNull();
    expect(jobForLogLine("fb_to_pg", undefined)).toBeNull();
    expect(jobForLogLine("  ", "  ")).toBeNull();
  });

  it("explica a contagem conforme a semântica do job", () => {
    expect(explainCount(SYNC_JOBS[3]!)).toMatch(/rowCount do upsert/);
    expect(explainCount(SYNC_JOBS[9]!)).toBe("Registros de fato criados no Firebird do PDV.");
  });

  it("rótulo da direção e lista de tabelas do filtro (sem repetição, ordenada)", () => {
    expect(directionLabel("fb_to_pg")).toBe("FB ▸ PG");
    expect(directionLabel("pg_to_fb")).toBe("PG ▸ FB");
    expect(SYNC_JOB_TABLES).toEqual([
      "cancelled_items",
      "nfce_issuer_config",
      "order_items",
      "orders",
      "orders_closed",
      "pixnopdv_store_credentials",
      "product_fiscal",
      "products",
      "units",
    ]);
  });
});
