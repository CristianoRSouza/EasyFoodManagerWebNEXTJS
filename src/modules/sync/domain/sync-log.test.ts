import { describe, expect, it } from "vitest";
import {
  SYNC_LOG_PAGE_SIZE,
  countSyncLogOutcomes,
  distinctSyncLogTables,
  filterSyncLogs,
  pageSyncLogs,
  syncLogTotalPages,
  type SyncLog,
} from "./sync-log";

function log(partial: Partial<SyncLog> & Pick<SyncLog, "id">): SyncLog {
  return {
    direction: "fb_to_pg",
    tableName: "products",
    recordsAffected: 0,
    recordId: null,
    status: "ok",
    errorMessage: null,
    createdAt: "2024-01-01T08:00:00Z",
    ...partial,
  };
}

const LOGS: SyncLog[] = [
  log({ id: "1", status: "ok", direction: "fb_to_pg", tableName: "products" }),
  log({ id: "2", status: "success", direction: "pg_to_fb", tableName: "orders" }),
  log({ id: "3", status: "error", direction: "fb_to_pg", tableName: "orders" }),
  log({ id: "4", status: "Falha", direction: "pg_to_fb", tableName: "products" }),
  log({ id: "5", status: "Sucesso", direction: "fb_to_pg", tableName: "units" }),
];

const ALL = { status: "all", direction: "all", table: "all" } as const;

describe("filterSyncLogs", () => {
  it("sem filtro devolve tudo, na mesma ordem", () => {
    expect(filterSyncLogs(LOGS, ALL).map((l) => l.id)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("status ok aceita os sinônimos de sucesso do Sync-Service (ok/success/Sucesso)", () => {
    expect(filterSyncLogs(LOGS, { ...ALL, status: "ok" }).map((l) => l.id)).toEqual(["1", "2", "5"]);
  });

  it("status error aceita error e Falha", () => {
    expect(filterSyncLogs(LOGS, { ...ALL, status: "error" }).map((l) => l.id)).toEqual(["3", "4"]);
  });

  it("direção e tabela são comparações exatas e se combinam", () => {
    expect(filterSyncLogs(LOGS, { ...ALL, direction: "pg_to_fb" }).map((l) => l.id)).toEqual(["2", "4"]);
    expect(filterSyncLogs(LOGS, { status: "error", direction: "fb_to_pg", table: "orders" }).map((l) => l.id)).toEqual([
      "3",
    ]);
  });
});

describe("countSyncLogOutcomes", () => {
  it("conta sucesso e erro sobre a lista recebida (a tela passa a filtrada)", () => {
    expect(countSyncLogOutcomes(LOGS)).toEqual({ ok: 3, error: 2 });
    expect(countSyncLogOutcomes([])).toEqual({ ok: 0, error: 0 });
  });
});

describe("distinctSyncLogTables", () => {
  it("tabelas distintas na ordem da primeira aparição, sobre a lista sem filtro", () => {
    expect(distinctSyncLogTables(LOGS)).toEqual(["products", "orders", "units"]);
  });
});

describe("paginação do log", () => {
  it("páginas de 50, como o legado", () => {
    expect(SYNC_LOG_PAGE_SIZE).toBe(50);
    const many = Array.from({ length: 120 }, (_, i) => log({ id: String(i) }));
    expect(syncLogTotalPages(many.length)).toBe(3);
    expect(pageSyncLogs(many, 0).map((l) => l.id)[0]).toBe("0");
    expect(pageSyncLogs(many, 2)).toHaveLength(20);
    expect(pageSyncLogs(many, 2)[0]?.id).toBe("100");
  });

  it("lista vazia tem 0 páginas (a tela mostra 1 / 1)", () => {
    expect(syncLogTotalPages(0)).toBe(0);
  });
});
