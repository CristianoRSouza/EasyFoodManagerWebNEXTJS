import { ApiAuditLogRepository } from "./api-audit-log-repository";

afterEach(() => vi.restoreAllMocks());

describe("ApiAuditLogRepository", () => {
  it("GET /audit-logs?limit=500 com o tenant no cabeçalho; descarta origem desconhecida", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: "1", source: "totem", entity_id: "t1", action: "created", performed_by: "a", created_at: "2026-01-01T00:00:00Z" },
            { id: "2", source: "outro", entity_id: "x", action: "created", performed_by: "a", created_at: "2026-01-01T00:00:00Z" },
          ],
        }),
        { status: 200 },
      ),
    );

    const logs = await new ApiAuditLogRepository({ companyId: "c1", storeId: "s1" }).listUnified();

    expect(logs.map((l) => l.id)).toEqual(["1"]);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe("/api/v1/audit-logs?limit=500");
    const headers = new Headers(init?.headers);
    expect(headers.get("x-company-id")).toBe("c1");
    expect(headers.get("x-store-id")).toBe("s1");
  });

  it("envelope sem `data` vira lista vazia; erro HTTP sobe", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    await expect(new ApiAuditLogRepository({ companyId: "c1", storeId: "s1" }).listUnified()).resolves.toEqual([]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "forbidden", message: "Proibido." }), { status: 403 }),
    );
    await expect(new ApiAuditLogRepository({ companyId: "c1", storeId: "s1" }).listUnified()).rejects.toThrow("Proibido.");
  });
});
