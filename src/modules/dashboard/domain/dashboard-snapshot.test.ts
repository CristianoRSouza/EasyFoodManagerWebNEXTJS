import { describe, expect, it } from "vitest";
import { filterRecentSyncErrors, totalNeedingAttention, type SyncLogEntry } from "./dashboard-snapshot";

const log = (overrides: Partial<SyncLogEntry>): SyncLogEntry => ({
  id: "1",
  direction: "fb_to_pg",
  tableName: "orders",
  status: "error",
  errorMessage: null,
  createdAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("totalNeedingAttention", () => {
  it("sums the three attention buckets", () => {
    expect(totalNeedingAttention({ manualReview: 2, reconcileFailed: 1, unusable: 3 })).toBe(6);
  });

  it("is zero when nothing needs attention", () => {
    expect(totalNeedingAttention({ manualReview: 0, reconcileFailed: 0, unusable: 0 })).toBe(0);
  });
});

describe("filterRecentSyncErrors", () => {
  it("drops rows with status success or ok", () => {
    const logs = [log({ id: "1", status: "success" }), log({ id: "2", status: "error" }), log({ id: "3", status: "ok" })];
    expect(filterRecentSyncErrors(logs).map((l) => l.id)).toEqual(["2"]);
  });

  it("keeps the incoming order (already sorted by the API)", () => {
    const logs = [log({ id: "a", status: "error" }), log({ id: "b", status: "error" })];
    expect(filterRecentSyncErrors(logs).map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("caps the result at the given limit", () => {
    const logs = Array.from({ length: 15 }, (_, i) => log({ id: String(i), status: "error" }));
    expect(filterRecentSyncErrors(logs, 10)).toHaveLength(10);
  });

  it("returns an empty array when there are no errors", () => {
    const logs = [log({ status: "success" }), log({ status: "ok" })];
    expect(filterRecentSyncErrors(logs)).toEqual([]);
  });
});
