import { ApiAgentRepository } from "./api-agent-repository";
import type { AgentConfigFormData } from "../domain/agent-config";
import { createAgentFormDefaults } from "../domain/agent-config";

const tenant = { companyId: "c1", storeId: "s1" };

function mockFetchOnce(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

afterEach(() => vi.restoreAllMocks());

describe("ApiAgentRepository — list()", () => {
  it("busca /service-agents e mapeia as linhas", async () => {
    const fetchSpy = mockFetchOnce({
      data: [{ id: "a1", agent_name: "NFCe-SRV-MATRIZ", is_active: true, api_rate_limit: 100, log_level: "info", sefaz_timeout_ms: 30000, retry_max_attempts: 3, retry_backoff_ms: 1000, contingency_enabled: false, contingency_auto_transmit: true, contingency_worker_enabled: true, contingency_worker_interval_ms: 0, contingency_substitution_worker_enabled: true, contingency_substitution_worker_interval_ms: 0, contingency_sla_warn_hours: 0, contingency_sla_block_hours: 0, sync_service_enabled: true, created_at: "2026-01-01T10:00:00Z", updated_at: "2026-01-01T10:00:00Z" }],
    });

    const agents = await new ApiAgentRepository(tenant, "lan").list();

    expect(agents).toHaveLength(1);
    expect(agents[0]).toMatchObject({ id: "a1", agent_name: "NFCe-SRV-MATRIZ", is_active: true });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/service-agents");
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("x-company-id")).toBe("c1");
    expect(headers.get("x-store-id")).toBe("s1");
  });

  it("resposta sem `data` vira lista vazia", async () => {
    mockFetchOnce({});
    const agents = await new ApiAgentRepository(tenant, "lan").list();
    expect(agents).toEqual([]);
  });
});

describe("ApiAgentRepository — create()", () => {
  it("faz POST em /service-agents com install_path forçado a null", async () => {
    const fetchSpy = mockFetchOnce({ ok: true, id: "novo" });
    const data: AgentConfigFormData = { ...createAgentFormDefaults(), agent_name: "NFCe-SRV-02" };

    await new ApiAgentRepository(tenant, "lan").create(data);

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/service-agents");
    const request = init as RequestInit;
    expect(request.method).toBe("POST");
    const body = JSON.parse(String(request.body));
    expect(body.agent_name).toBe("NFCe-SRV-02");
    expect(body.install_path).toBeNull();
  });
});

describe("ApiAgentRepository — update()", () => {
  it("faz PATCH em /service-agents/:id SEM agent_name e com install_path: null", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    const data: AgentConfigFormData = { ...createAgentFormDefaults(), agent_name: "NÃO-DEVE-IR", sefaz_timeout_ms: 45000 };

    await new ApiAgentRepository(tenant, "lan").update("a1", data);

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/service-agents/a1");
    const request = init as RequestInit;
    expect(request.method).toBe("PATCH");
    const body = JSON.parse(String(request.body));
    expect(body.agent_name).toBeUndefined();
    expect(body.install_path).toBeNull();
    expect(body.sefaz_timeout_ms).toBe(45000);
  });

  it("codifica o id na URL", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    await new ApiAgentRepository(tenant, "lan").update("id/com espaço", createAgentFormDefaults());
    const [url] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/service-agents/id%2Fcom%20espa%C3%A7o");
  });

  it("falha do servidor vira erro com mensagem em PT-BR", async () => {
    mockFetchOnce({ code: "database_error", message: "Falha ao gravar no banco." }, 500);
    await expect(new ApiAgentRepository(tenant, "lan").update("a1", createAgentFormDefaults())).rejects.toMatchObject({
      status: 500,
      message: "Falha ao gravar no banco.",
    });
  });
});

describe("ApiAgentRepository — escrita no backend cloud (ramo isCloudApiMode() do legado)", () => {
  it("create() manda o formulário cru, SEM install_path (criarAgenteApi(data))", async () => {
    const fetchSpy = mockFetchOnce({ ok: true, id: "novo" });
    const data: AgentConfigFormData = { ...createAgentFormDefaults(), agent_name: "NFCe-SRV-02" };

    await new ApiAgentRepository(tenant, "cloud").create(data);

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/service-agents");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual(data);
  });

  it("update() manda o formulário sem agent_name e SEM install_path (editarAgenteApi(id, resto))", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    const data: AgentConfigFormData = { ...createAgentFormDefaults(), agent_name: "NÃO-DEVE-IR" };

    await new ApiAgentRepository(tenant, "cloud").update("a1", data);

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/service-agents/a1");
    expect((init as RequestInit).method).toBe("PATCH");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).not.toHaveProperty("agent_name");
    expect(body).not.toHaveProperty("install_path");
  });

  it("setActive() usa a mesma rota/corpo do LAN", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    await new ApiAgentRepository(tenant, "cloud").setActive("a1", true);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/service-agents/a1/active");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ is_active: true });
  });
});

describe("ApiAgentRepository — setActive()", () => {
  it("faz PATCH em /service-agents/:id/active com { is_active }", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    await new ApiAgentRepository(tenant, "lan").setActive("a1", false);

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/service-agents/a1/active");
    const request = init as RequestInit;
    expect(request.method).toBe("PATCH");
    expect(JSON.parse(String(request.body))).toEqual({ is_active: false });
  });
});

describe("ApiAgentRepository — auditLogs()", () => {
  it("busca /service-agents/:id/audit-logs e mapeia as linhas", async () => {
    const fetchSpy = mockFetchOnce({
      data: [{ id: "log-1", agent_config_id: "a1", action: "toggled", changed_fields: ["is_active"], previous_values: { is_active: true }, new_values: { is_active: false }, performed_by: "admin@local.dev", created_at: "2026-01-20T10:00:00Z" }],
    });

    const logs = await new ApiAgentRepository(tenant, "lan").auditLogs("a1");

    expect(logs).toEqual([
      { id: "log-1", agent_config_id: "a1", action: "toggled", changed_fields: ["is_active"], previous_values: { is_active: true }, new_values: { is_active: false }, performed_by: "admin@local.dev", created_at: "2026-01-20T10:00:00Z" },
    ]);
    const [url] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/service-agents/a1/audit-logs");
  });
});

describe("ApiAgentRepository — cloud: `ok: false` no corpo 2xx é falha (C3)", () => {
  // Legado 1.3.12 (PR #52): criar/editar devolvem `{ ok, error }` no ramo `isCloudApiMode()` — o
  // erro chega à tela. Ativar/desativar continua `{ ok: r.ok }`, sem descrição.
  it("create() lança com a mensagem da nuvem", async () => {
    mockFetchOnce({ ok: false, error: "agent_name já existe" });
    const error = await new ApiAgentRepository(tenant, "cloud").create(createAgentFormDefaults()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("agent_name já existe");
  });

  it("update() lança com a mensagem da nuvem", async () => {
    mockFetchOnce({ ok: false, error: "campo inválido" });
    await expect(new ApiAgentRepository(tenant, "cloud").update("a1", createAgentFormDefaults())).rejects.toThrow("campo inválido");
  });

  it("setActive() lança sem mensagem", async () => {
    mockFetchOnce({ ok: false, error: "ignorado pelo legado" });
    const error = await new ApiAgentRepository(tenant, "cloud").setActive("a1", true).catch((e: unknown) => e);
    expect((error as Error).message).toBe("");
  });

  it("update() na nuvem só manda campos da lista branca — nada de tenant, id ou nome (legado 1.3.12, PR #52)", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    const linhaDaListagem = { ...createAgentFormDefaults(), agent_name: "NFCe-SRV-MATRIZ", company_id: "c1", store_id: "s1", id: "a1" };
    await new ApiAgentRepository(tenant, "cloud").update("a1", linhaDaListagem as unknown as ReturnType<typeof createAgentFormDefaults>);
    const body = JSON.parse(String((fetchSpy.mock.calls[0]![1] as RequestInit).body)) as Record<string, unknown>;
    for (const proibido of ["company_id", "store_id", "id", "agent_name", "created_at", "updated_at"]) expect(body).not.toHaveProperty(proibido);
    expect(body.sefaz_timeout_ms).toBe(30000);
  });

  it("LAN não olha `ok` no corpo", async () => {
    mockFetchOnce({ ok: false });
    await expect(new ApiAgentRepository(tenant, "lan").create(createAgentFormDefaults())).resolves.toBeUndefined();
  });
});
