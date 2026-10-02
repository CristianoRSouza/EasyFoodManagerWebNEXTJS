import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/shared/http/api-client";
import { ApiSyncMirrorRepository } from "./api-sync-mirror-repository";

vi.mock("@/shared/http/api-client");

const tenant = { companyId: "c1", storeId: "s1" };
const request = vi.mocked(apiClient.apiRequest);

function lastPath(): string {
  return String(request.mock.calls.at(-1)?.[0]);
}

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({ data: [] });
});

describe("ApiSyncMirrorRepository — as 10 rotas /v1/sync/fbpg/* como o legado as chama", () => {
  it("envia o tenant e desembrulha o envelope", async () => {
    request.mockResolvedValue({ data: { segundos_desde_ping: 2, heartbeats_retidos: 1, ciclos_5min: 1 } });
    const repo = new ApiSyncMirrorRepository(tenant);
    const health = await repo.health();
    expect(request).toHaveBeenCalledWith("/sync/fbpg/health", { tenant });
    expect(health?.secondsSincePing).toBe(2);
  });

  it("caminhos e parâmetros", async () => {
    const repo = new ApiSyncMirrorRepository(tenant);
    await repo.cycles(120);
    expect(lastPath()).toBe("/sync/fbpg/cycles?limit=120");
    await repo.cycleHistory(24, 15);
    expect(lastPath()).toBe("/sync/fbpg/cycle-history?hours=24&bucket_min=15");
    await repo.jobs(5);
    expect(lastPath()).toBe("/sync/fbpg/jobs?minutes=5");
    await repo.jobStats(60);
    expect(lastPath()).toBe("/sync/fbpg/job-stats?minutes=60");
    await repo.queues();
    expect(lastPath()).toBe("/sync/fbpg/queues");
    await repo.alarms(24);
    expect(lastPath()).toBe("/sync/fbpg/alarms?hours=24");
    await repo.retention();
    expect(lastPath()).toBe("/sync/fbpg/retention");
  });

  it("eventos: filtros vazios não vão na URL; limit/offset têm o padrão do legado", async () => {
    const repo = new ApiSyncMirrorRepository(tenant);
    await repo.events({});
    expect(lastPath()).toBe("/sync/fbpg/events?limit=100&offset=0");
    await repo.events({ limit: 100, offset: 200, direction: "pg_to_fb", table: "orders", status: "error", q: "0001" });
    expect(lastPath()).toBe(
      "/sync/fbpg/events?limit=100&offset=200&direction=pg_to_fb&table=orders&status=error&q=0001",
    );
  });

  it("'all' digitado na busca é termo de busca, não 'sem filtro'", async () => {
    const repo = new ApiSyncMirrorRepository(tenant);
    await repo.events({ limit: 300, q: "all" });
    expect(lastPath()).toBe("/sync/fbpg/events?limit=300&offset=0&q=all");
  });

  it("alterações: termo opcional", async () => {
    const repo = new ApiSyncMirrorRepository(tenant);
    await repo.changes({ limit: 200, q: null });
    expect(lastPath()).toBe("/sync/fbpg/changes?limit=200&offset=0");
    await repo.changes({ limit: 200, q: "789" });
    expect(lastPath()).toBe("/sync/fbpg/changes?limit=200&offset=0&q=789");
  });

  it("data null: saúde/filas/retenção nulas, rollups indisponíveis", async () => {
    request.mockResolvedValue({ data: null });
    const repo = new ApiSyncMirrorRepository(tenant);
    expect(await repo.health()).toBeNull();
    expect(await repo.queues()).toBeNull();
    expect(await repo.retention()).toBeNull();
    expect(await repo.jobStats(5)).toEqual({ available: false, rows: [] });
    expect(await repo.cycleHistory(6, 5)).toEqual({ available: false, bucketMin: 5, rows: [] });
    expect(await repo.changes({})).toEqual({ available: false, rows: [] });
    expect(await repo.jobs(5)).toEqual([]);
  });

  it("erro da API se propaga (a tela decide o que fazer)", async () => {
    request.mockRejectedValue(new Error("HTTP 500"));
    await expect(new ApiSyncMirrorRepository(tenant).alarms(24)).rejects.toThrow("HTTP 500");
  });
});
