import { ApiPixnopdvRepository } from "./api-pixnopdv-repository";

const tenant = { companyId: "c1", storeId: "s1" };

const view = {
  store_id: "s1",
  environment: "producao" as const,
  api_base_url: "https://api.example.com",
  basic_user: "user",
  basic_token_set: true,
  secret_key_set: false,
  insecure_tls: false,
  enabled: true,
  updated_at: "2026-01-01T10:00:00Z",
};

function mockFetchOnce(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

afterEach(() => vi.restoreAllMocks());

describe("ApiPixnopdvRepository — get()", () => {
  it("busca /pixnopdv-store-credentials e devolve o domínio (camelCase)", async () => {
    const fetchSpy = mockFetchOnce({ data: view });
    const repo = new ApiPixnopdvRepository(tenant);

    const result = await repo.get();

    expect(result).toEqual({
      storeId: "s1",
      environment: "producao",
      apiBaseUrl: "https://api.example.com",
      basicUser: "user",
      basicTokenSet: true,
      secretKeySet: false,
      insecureTls: false,
      enabled: true,
      updatedAt: "2026-01-01T10:00:00Z",
    });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/pixnopdv-store-credentials");
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("x-company-id")).toBe("c1");
    expect(headers.get("x-store-id")).toBe("s1");
    expect((init as RequestInit).method ?? "GET").toBe("GET");
  });

  it("falha do servidor vira erro com mensagem em PT-BR", async () => {
    mockFetchOnce({ code: "site_not_provisioned", message: "Loja ainda não provisionada." }, 409);
    await expect(new ApiPixnopdvRepository(tenant).get()).rejects.toMatchObject({
      status: 409,
      message: "Loja ainda não provisionada.",
    });
  });
});

describe("ApiPixnopdvRepository — save()", () => {
  it("faz PUT em /pixnopdv-store-credentials com o corpo e o tenant, e devolve a view atualizada", async () => {
    const fetchSpy = mockFetchOnce({ ok: true, data: { ...view, basic_user: "novo" } });
    const repo = new ApiPixnopdvRepository(tenant);

    const result = await repo.save({ basicUser: "novo", enabled: true });

    expect(result?.basicUser).toBe("novo");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/pixnopdv-store-credentials");
    const request = init as RequestInit;
    expect(request.method).toBe("PUT");
    expect(request.body).toBe('{"basic_user":"novo","enabled":true}');
    const headers = new Headers(request.headers);
    expect(headers.get("x-company-id")).toBe("c1");
  });

  it("não envia campo omitido — omitir preserva o valor gravado do lado da API", async () => {
    const fetchSpy = mockFetchOnce({ ok: true, data: view });
    await new ApiPixnopdvRepository(tenant).save({ enabled: false });

    const [, init] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(Object.keys(body)).toEqual(["enabled"]);
  });

  it("null explícito apaga segredo — vai no corpo, não é omitido", async () => {
    const fetchSpy = mockFetchOnce({ ok: true, data: view });
    await new ApiPixnopdvRepository(tenant).save({ basicToken: null });

    const [, init] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body).toEqual({ basic_token: null });
  });
});
