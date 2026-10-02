import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/shared/http/api-client";
import { ApiSyncRepository } from "./api-sync-repository";

vi.mock("@/shared/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/shared/http/api-client")>("@/shared/http/api-client");
  return { ...actual, apiRequest: vi.fn() };
});

const tenant = { companyId: "c1", storeId: "s1" };
const request = vi.mocked(apiClient.apiRequest);

beforeEach(() => {
  request.mockReset();
});

function calls(): Array<[string, unknown]> {
  return request.mock.calls.map(([path, options]) => [path, options]);
}

describe("ApiSyncRepository.listLogs", () => {
  it("pede /sync/logs?limit=500 com o tenant e converte as linhas", async () => {
    request.mockResolvedValue({
      data: [{ id: "l1", direction: "fb_to_pg", table_name: "orders", records_affected: 2, status: "ok", created_at: "2024-01-01T08:00:00Z" }],
    });

    const logs = await new ApiSyncRepository(tenant).listLogs();

    expect(calls()).toEqual([["/sync/logs?limit=500", { tenant }]]);
    expect(logs[0]).toMatchObject({ id: "l1", tableName: "orders", recordsAffected: 2 });
  });

  it("resposta sem `data` vira lista vazia", async () => {
    request.mockResolvedValue({});
    await expect(new ApiSyncRepository(tenant).listLogs()).resolves.toEqual([]);
  });
});

describe("ApiSyncRepository.queueFetchers", () => {
  it("inbox: rotas /sync/inbox/* com limit/offset na query e o tenant em todas", async () => {
    request.mockResolvedValue({ data: [] });
    const f = new ApiSyncRepository(tenant).queueFetchers("inbox");

    await f.byEntity();
    await f.failures();
    await f.activeRetries(100);
    await f.backlog();
    await f.recentFailures(30);
    await f.rate();
    await f.recentAll(50, 100);

    expect(calls()).toEqual([
      ["/sync/inbox/by-entity", { tenant }],
      ["/sync/inbox/failures-by-error", { tenant }],
      ["/sync/inbox/active-retries?limit=100", { tenant }],
      ["/sync/inbox/backlog", { tenant }],
      ["/sync/inbox/recent-failures?limit=30", { tenant }],
      ["/sync/inbox/apply-rate", { tenant }],
      ["/sync/inbox/recent-all?limit=50&offset=100", { tenant }],
    ]);
  });

  it("outbox: taxa em /dispatch-rate e resumo com dispatched_total", async () => {
    request.mockImplementation(async (path: string) => {
      if (path === "/sync/outbox/summary") {
        return { data: { pending_novos: 1, pending_em_retry: 2, dispatched_total: 30, failed_terminal: 4, total: 37 } };
      }
      return { data: [{ minuto: "2024-01-01T10:00:00Z", despachados_por_minuto: 6 }] };
    });
    const f = new ApiSyncRepository(tenant).queueFetchers("outbox");

    await expect(f.summary()).resolves.toEqual({
      pending_novos: 1,
      pending_em_retry: 2,
      success_total: 30,
      failed_terminal: 4,
      total: 37,
    });
    await expect(f.rate()).resolves.toEqual([{ minuto: "2024-01-01T10:00:00Z", por_minuto: 6 }]);
    expect(calls().map(([path]) => path)).toEqual(["/sync/outbox/summary", "/sync/outbox/dispatch-rate"]);
  });

  it("offset 0 também vai na query (o painel pede a primeira página com offset=0)", async () => {
    request.mockResolvedValue({ data: [] });
    await new ApiSyncRepository(tenant).queueFetchers("outbox").recentAll(50, 0);
    expect(calls()[0]?.[0]).toBe("/sync/outbox/recent-all?limit=50&offset=0");
  });

  it("erro da API sobe (o painel mostra o card de erro)", async () => {
    request.mockRejectedValue(new Error("site_not_provisioned"));
    await expect(new ApiSyncRepository(tenant).queueFetchers("inbox").summary()).rejects.toThrow("site_not_provisioned");
  });
});

describe("ApiSyncRepository.resetInboxToPending", () => {
  it("POST /sync/inbox/reset-to-pending com o event_id aparado", async () => {
    request.mockResolvedValue({ data: { updated: 1, event_id: "e1" } });

    await new ApiSyncRepository(tenant).resetInboxToPending("  e1 ");

    expect(calls()).toEqual([["/sync/inbox/reset-to-pending", { method: "POST", body: { event_id: "e1" }, tenant }]]);
  });

  it("event_id vazio falha antes de chamar a API, com a mensagem do legado", async () => {
    await expect(new ApiSyncRepository(tenant).resetInboxToPending("  ")).rejects.toThrow("event_id em falta.");
    expect(request).not.toHaveBeenCalled();
  });
});
