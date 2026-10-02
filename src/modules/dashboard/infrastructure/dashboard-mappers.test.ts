import { describe, expect, it } from "vitest";
import {
  mapDashboardStats,
  mapNfceAttentionCounts,
  mapServiceHeartbeats,
  mapSyncHourBucket,
  mapSyncLogEntry,
  mapTransactionDayBucket,
} from "./dashboard-mappers";

describe("mapServiceHeartbeats", () => {
  it("prefers camelCase and falls back to snake_case", () => {
    expect(mapServiceHeartbeats({ sync: "2024-01-01T00:00:00Z", sync_pg_sb: "2024-01-02T00:00:00Z" })).toEqual({
      sync: "2024-01-01T00:00:00Z",
      nfce: null,
      tef: null,
      syncPgSb: "2024-01-02T00:00:00Z",
      pixPixnopdv: null,
    });
  });

  it("prefers camelCase over snake_case when both are present", () => {
    expect(
      mapServiceHeartbeats({ syncPgSb: "2024-01-03T00:00:00Z", sync_pg_sb: "2024-01-02T00:00:00Z" }),
    ).toMatchObject({ syncPgSb: "2024-01-03T00:00:00Z" });
  });

  it("is all-null for a missing payload", () => {
    expect(mapServiceHeartbeats(null)).toEqual({
      sync: null,
      nfce: null,
      tef: null,
      syncPgSb: null,
      pixPixnopdv: null,
    });
  });
});

describe("mapDashboardStats", () => {
  it("maps a full response", () => {
    expect(
      mapDashboardStats({
        activeProducts: 12,
        openOrders: 3,
        todayTransactions: 40,
        recentErrors: 2,
        lastSuccessSync: { created_at: "2024-01-01T10:00:00Z" },
        serviceHeartbeats: { sync: "2024-01-01T10:05:00Z" },
      }),
    ).toEqual({
      activeProducts: 12,
      openOrders: 3,
      todayTransactions: 40,
      recentErrors: 2,
      lastSuccessSync: { createdAt: "2024-01-01T10:00:00Z" },
      serviceHeartbeats: { sync: "2024-01-01T10:05:00Z", nfce: null, tef: null, syncPgSb: null, pixPixnopdv: null },
    });
  });

  it("defaults to zero/null for a missing payload", () => {
    expect(mapDashboardStats(null)).toEqual({
      activeProducts: 0,
      openOrders: 0,
      todayTransactions: 0,
      recentErrors: 0,
      lastSuccessSync: null,
      serviceHeartbeats: { sync: null, nfce: null, tef: null, syncPgSb: null, pixPixnopdv: null },
    });
  });

  it("treats a missing created_at as no last successful sync", () => {
    expect(mapDashboardStats({ lastSuccessSync: {} }).lastSuccessSync).toBeNull();
  });
});

describe("mapSyncHourBucket", () => {
  it("coerces numeric strings", () => {
    expect(mapSyncHourBucket({ hour: "26/01 10:00", ok: "5", error: "1" })).toEqual({
      hour: "26/01 10:00",
      ok: 5,
      error: 1,
    });
  });
});

describe("mapTransactionDayBucket", () => {
  it("coerces numeric strings", () => {
    expect(mapTransactionDayBucket({ day: "26/01", total: "3", amount: "150.5" })).toEqual({
      day: "26/01",
      total: 3,
      amount: 150.5,
    });
  });
});

describe("mapNfceAttentionCounts", () => {
  it("maps a full response", () => {
    expect(mapNfceAttentionCounts({ manualReview: 2, reconcileFailed: 1, unusable: 3 })).toEqual({
      manualReview: 2,
      reconcileFailed: 1,
      unusable: 3,
    });
  });

  it("defaults to zero for a missing payload", () => {
    expect(mapNfceAttentionCounts(null)).toEqual({ manualReview: 0, reconcileFailed: 0, unusable: 0 });
  });
});

describe("mapSyncLogEntry", () => {
  it("maps snake_case fields to the domain shape", () => {
    expect(
      mapSyncLogEntry({
        id: "log-1",
        direction: "fb_to_pg",
        table_name: "orders",
        status: "error",
        error_message: "timeout",
        created_at: "2024-01-01T00:00:00Z",
      }),
    ).toEqual({
      id: "log-1",
      direction: "fb_to_pg",
      tableName: "orders",
      status: "error",
      errorMessage: "timeout",
      createdAt: "2024-01-01T00:00:00Z",
    });
  });

  it("handles missing fields", () => {
    expect(mapSyncLogEntry({})).toEqual({
      id: "",
      direction: "",
      tableName: "",
      status: "",
      errorMessage: null,
      createdAt: "",
    });
  });
});
