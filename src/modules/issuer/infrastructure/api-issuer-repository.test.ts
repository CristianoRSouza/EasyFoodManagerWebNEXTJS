import { ApiIssuerRepository } from "./api-issuer-repository";

const tenant = { companyId: "c1", storeId: "s1" };

function mockFetchOnce(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

afterEach(() => vi.restoreAllMocks());

describe("ApiIssuerRepository — list()", () => {
  it("busca /nfce/issuer-config e mapeia as linhas", async () => {
    const fetchSpy = mockFetchOnce({
      data: [{ id: "i1", cnpj: "12345678000199", company_name: "Loja Exemplo", state_registration: "123", street: "Rua A", number: "1", neighborhood: "Centro", municipality_code: "3550308", municipality_name: "São Paulo", uf: "SP", zip_code: "01001000", tax_regime_code: 1, environment: 2, nfce_serie: 1, is_active: true, created_at: "2026-01-01T10:00:00Z", updated_at: "2026-01-01T10:00:00Z" }],
    });
    const repo = new ApiIssuerRepository(tenant);

    const configs = await repo.list();

    expect(configs).toHaveLength(1);
    expect(configs[0]).toMatchObject({ id: "i1", companyName: "Loja Exemplo", uf: "SP" });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/nfce/issuer-config");
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("x-company-id")).toBe("c1");
    expect(headers.get("x-store-id")).toBe("s1");
  });

  it("resposta sem `data` vira lista vazia", async () => {
    mockFetchOnce({});
    const configs = await new ApiIssuerRepository(tenant).list();
    expect(configs).toEqual([]);
  });
});

describe("ApiIssuerRepository — acbrConfig()", () => {
  it("no LAN, busca /nfce/acbr-config e mapeia as linhas", async () => {
    const fetchSpy = mockFetchOnce({ data: [{ id: "a1", key: "ChaveCSC", value: "abc", description: null, updated_at: "2026-01-01T10:00:00Z" }] });
    const configs = await new ApiIssuerRepository(tenant).acbrConfig();
    expect(configs).toEqual([{ id: "a1", key: "ChaveCSC", value: "abc", description: null, updatedAt: "2026-01-01T10:00:00Z" }]);
    const [url] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/nfce/acbr-config");
  });

  it("na nuvem também busca a rota — a EasyFood API entrega o espelho da loja (legado 1.3.12, PR #37)", async () => {
    const fetchSpy = mockFetchOnce({ data: [{ id: "x", key: "timeout_sefaz_ms", value: "30000", description: null, updated_at: null }] });
    const configs = await new ApiIssuerRepository(tenant).acbrConfig();
    expect(configs.map((c) => c.key)).toEqual(["timeout_sefaz_ms"]);
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/nfce/acbr-config");
  });
});

describe("ApiIssuerRepository — update()", () => {
  it("faz PATCH em /nfce/issuer-config/:id com o corpo e o tenant", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    await new ApiIssuerRepository(tenant).update("i1", { company_name: "Novo Nome", apikey_easyerp: "nova-chave" });

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/nfce/issuer-config/i1");
    const request = init as RequestInit;
    expect(request.method).toBe("PATCH");
    expect(request.body).toBe('{"company_name":"Novo Nome","apikey_easyerp":"nova-chave"}');
    const headers = new Headers(request.headers);
    expect(headers.get("x-company-id")).toBe("c1");
  });

  it("codifica o id na URL", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    await new ApiIssuerRepository(tenant).update("id/com espaço", {});
    const [url] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/nfce/issuer-config/id%2Fcom%20espa%C3%A7o");
  });

  it("falha do servidor vira erro com mensagem em PT-BR (quem chama decide o toast)", async () => {
    mockFetchOnce({ code: "database_error", message: "Falha ao gravar no banco." }, 500);
    await expect(new ApiIssuerRepository(tenant).update("i1", {})).rejects.toMatchObject({
      status: 500,
      message: "Falha ao gravar no banco.",
    });
  });
});
