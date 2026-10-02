import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiDashboardRepository } from "./api-dashboard-repository";
import * as apiClient from "@/shared/http/api-client";

vi.mock("@/shared/http/api-client");

const tenant = { companyId: "company-1", storeId: "store-1" };

const STATS_RESPONSE = {
  data: {
    activeProducts: 12,
    openOrders: 3,
    todayTransactions: 40,
    recentErrors: 2,
    lastSuccessSync: { created_at: "2024-01-01T10:00:00Z" },
    serviceHeartbeats: { sync: "2024-01-01T10:05:00Z", sync_pg_sb: "2024-01-01T09:00:00Z" },
  },
};
const TX_BY_DAY_RESPONSE = { data: [{ day: "26/01", total: 3, amount: "150.5" }] };
const ATTENTION_RESPONSE = { data: { manualReview: 2, reconcileFailed: 1, unusable: 0 } };
const SYNC_BY_HOUR_RESPONSE = { data: [{ hour: "26/01 10:00", ok: 5, error: 1 }] };
const SYNC_LOGS_RESPONSE = {
  data: [
    { id: "1", direction: "fb_to_pg", table_name: "orders", status: "error", error_message: "timeout", created_at: "2024-01-01T09:00:00Z" },
    { id: "2", direction: "pg_to_fb", table_name: "products", status: "success", error_message: null, created_at: "2024-01-01T08:00:00Z" },
  ],
};

function mockRoutes() {
  vi.mocked(apiClient.apiRequest).mockImplementation(async (path: string) => {
    if (path === "/dashboard/stats") return STATS_RESPONSE as never;
    if (path === "/dashboard/transactions-by-day") return TX_BY_DAY_RESPONSE as never;
    if (path === "/nfce/attention-counts") return ATTENTION_RESPONSE as never;
    if (path === "/dashboard/sync-by-hour") return SYNC_BY_HOUR_RESPONSE as never;
    if (path.startsWith("/sync/logs")) return SYNC_LOGS_RESPONSE as never;
    throw new Error(`unexpected path: ${path}`);
  });
}

describe("ApiDashboardRepository", () => {
  beforeEach(() => {
    vi.mocked(apiClient.apiRequest).mockReset();
    mockRoutes();
  });

  it("fetches sync-by-hour and recent sync errors on the lan backend", async () => {
    const repository = new ApiDashboardRepository(tenant, "lan");
    const snapshot = await repository.snapshot();

    expect(snapshot.stats).toEqual({
      activeProducts: 12,
      openOrders: 3,
      todayTransactions: 40,
      recentErrors: 2,
      lastSuccessSync: { createdAt: "2024-01-01T10:00:00Z" },
      serviceHeartbeats: {
        sync: "2024-01-01T10:05:00Z",
        nfce: null,
        tef: null,
        syncPgSb: "2024-01-01T09:00:00Z",
        pixPixnopdv: null,
      },
    });
    expect(snapshot.transactionsByDay).toEqual([{ day: "26/01", total: 3, amount: 150.5 }]);
    expect(snapshot.nfceAttention).toEqual({ manualReview: 2, reconcileFailed: 1, unusable: 0 });
    expect(snapshot.syncByHour).toEqual([{ hour: "26/01 10:00", ok: 5, error: 1 }]);
    // A linha "success" foi filtrada — só a de erro sobra.
    expect(snapshot.recentErrors).toEqual([
      { id: "1", direction: "fb_to_pg", tableName: "orders", status: "error", errorMessage: "timeout", createdAt: "2024-01-01T09:00:00Z" },
    ]);

    const calledPaths = vi.mocked(apiClient.apiRequest).mock.calls.map((call) => call[0]);
    expect(calledPaths).toEqual(
      expect.arrayContaining(["/dashboard/stats", "/dashboard/transactions-by-day", "/nfce/attention-counts", "/dashboard/sync-by-hour", "/sync/logs?limit=500"]),
    );
  });

  it("skips sync-by-hour and sync/logs on the cloud backend", async () => {
    const repository = new ApiDashboardRepository(tenant, "cloud");
    const snapshot = await repository.snapshot();

    expect(snapshot.syncByHour).toEqual([]);
    expect(snapshot.recentErrors).toEqual([]);
    // As três chamadas que existem na nuvem ainda acontecem normalmente.
    expect(snapshot.stats.activeProducts).toBe(12);
    expect(snapshot.transactionsByDay).toEqual([{ day: "26/01", total: 3, amount: 150.5 }]);

    const calledPaths = vi.mocked(apiClient.apiRequest).mock.calls.map((call) => call[0]);
    expect(calledPaths).not.toContain("/dashboard/sync-by-hour");
    expect(calledPaths.some((p) => String(p).startsWith("/sync/logs"))).toBe(false);
  });

  it("passes the tenant to every call", async () => {
    const repository = new ApiDashboardRepository(tenant, "lan");
    await repository.snapshot();

    for (const call of vi.mocked(apiClient.apiRequest).mock.calls) {
      expect(call[1]).toMatchObject({ tenant });
    }
  });

  it("uma rota falhando (Promise.allSettled) não derruba as outras partes do snapshot", async () => {
    vi.mocked(apiClient.apiRequest).mockImplementation(async (path: string) => {
      if (path === "/nfce/attention-counts") throw new Error("indisponível nesta loja");
      if (path === "/dashboard/stats") return STATS_RESPONSE as never;
      if (path === "/dashboard/transactions-by-day") return TX_BY_DAY_RESPONSE as never;
      if (path === "/dashboard/sync-by-hour") return SYNC_BY_HOUR_RESPONSE as never;
      if (path.startsWith("/sync/logs")) return SYNC_LOGS_RESPONSE as never;
      throw new Error(`unexpected path: ${path}`);
    });

    const repository = new ApiDashboardRepository(tenant, "lan");
    const snapshot = await repository.snapshot();

    // A parte que falhou fica zerada e listada...
    expect(snapshot.nfceAttention).toEqual({ manualReview: 0, reconcileFailed: 0, unusable: 0 });
    expect(snapshot.failedParts).toEqual(["nfceAttention"]);
    // ...mas as outras continuam preenchidas normalmente.
    expect(snapshot.stats.activeProducts).toBe(12);
    expect(snapshot.transactionsByDay).toEqual([{ day: "26/01", total: 3, amount: 150.5 }]);
    expect(snapshot.syncByHour).toEqual([{ hour: "26/01 10:00", ok: 5, error: 1 }]);
  });

  it("nenhuma falha: failedParts vem vazio", async () => {
    const repository = new ApiDashboardRepository(tenant, "lan");
    const snapshot = await repository.snapshot();
    expect(snapshot.failedParts).toEqual([]);
  });
});
