import { ApiTotemRepository } from "./api-totem-repository";

const tenant = { companyId: "c1", storeId: "s1" };

function mockFetchOnce(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

afterEach(() => vi.restoreAllMocks());

describe("ApiTotemRepository — leitura (LAN)", () => {
  it("list() busca /totems e mapeia", async () => {
    const fetchSpy = mockFetchOnce({ data: [{ id: "t1", totem_name: "TOTEM-001", is_active: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }] });
    const repo = new ApiTotemRepository(tenant, "lan");
    const totems = await repo.list();
    expect(totems).toHaveLength(1);
    expect(totems[0]?.totem_name).toBe("TOTEM-001");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/totems");
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("x-company-id")).toBe("c1");
    expect(headers.get("x-store-id")).toBe("s1");
  });

  it("availableLicenses(id) inclui ?totemId=", async () => {
    const fetchSpy = mockFetchOnce({ data: [] });
    await new ApiTotemRepository(tenant, "lan").availableLicenses("t1");
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/totem-available-licenses?totemId=t1");
  });

  it("availableLicenses(null) não inclui query", async () => {
    const fetchSpy = mockFetchOnce({ data: [] });
    await new ApiTotemRepository(tenant, "lan").availableLicenses(null);
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/totem-available-licenses");
  });

  it("licensesForLabeling() busca /totem-licenses", async () => {
    const fetchSpy = mockFetchOnce({ data: [{ id: "l1", device_key: "TOTEM-001", license_type: "monthly", plan_slug: null, created_at: "2026-01-01T00:00:00Z" }] });
    const licenses = await new ApiTotemRepository(tenant, "lan").licensesForLabeling();
    expect(licenses).toEqual([{ id: "l1", device_key: "TOTEM-001", license_type: "monthly", plan_slug: null, created_at: "2026-01-01T00:00:00Z" }]);
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/totem-licenses");
  });

  it("seriesStatus() busca /totems/series-status", async () => {
    const fetchSpy = mockFetchOnce({ data: [] });
    await new ApiTotemRepository(tenant, "lan").seriesStatus();
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/totems/series-status");
  });

  it("auditLogs(id) busca /totems/:id/audit-logs", async () => {
    const fetchSpy = mockFetchOnce({ data: [] });
    await new ApiTotemRepository(tenant, "lan").auditLogs("t1");
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/totems/t1/audit-logs");
  });

  it("leitura funciona também no backend cloud (mesma rota)", async () => {
    const fetchSpy = mockFetchOnce({ data: [] });
    await new ApiTotemRepository(tenant, "cloud").list();
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/totems");
  });
});

describe("ApiTotemRepository — escrita (LAN)", () => {
  it("create() no LAN faz POST /totems com o corpo e license_id", async () => {
    const fetchSpy = mockFetchOnce({ id: "t1", sync_hint: "Enfileirado." }, 201);
    const result = await new ApiTotemRepository(tenant, "lan").create(
      { totem_name: "TOTEM-001", is_active: false } as never,
      "lic-1",
    );
    expect(result).toEqual({ id: "t1", syncHint: "Enfileirado." });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/totems");
    const request = init as RequestInit;
    expect(request.method).toBe("POST");
    const body = JSON.parse(String(request.body));
    expect(body.totem_name).toBe("TOTEM-001");
    expect(body.license_id).toBe("lic-1");
  });

  it("update() no LAN faz PATCH /totems/:id", async () => {
    mockFetchOnce({ ok: true });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await new ApiTotemRepository(tenant, "lan").update("t1", { totem_name: "TOTEM-001" } as never, "lic-1");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/totems/t1");
    expect((init as RequestInit).method).toBe("PATCH");
  });

  it("setActive() no LAN faz PATCH /totems/:id/active com is_active e license_id", async () => {
    mockFetchOnce({ ok: true });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await new ApiTotemRepository(tenant, "lan").setActive("t1", true, "lic-1");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/totems/t1/active");
    const request = init as RequestInit;
    expect(JSON.parse(String(request.body))).toEqual({ is_active: true, license_id: "lic-1" });
  });

  it("requeueSync() no LAN faz POST /totems/:id/requeue-cloud-sync", async () => {
    mockFetchOnce({ outbox_inserted: true, licenses_requeued: 1, sync_hint: "Na outbox." });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await new ApiTotemRepository(tenant, "lan").requeueSync("t1");
    expect(result).toEqual({
      outboxInserted: true,
      licensesRequeued: 1,
      syncHint: "Na outbox.",
      // Sem `sync_diagnostics` na resposta: mesmo default de `requeueLocalTotemSyncToCloud`.
      syncDiagnostics: { recommendation: "start_sync_service", syncServiceLikelyRunning: false },
    });
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/totems/t1/requeue-cloud-sync");
  });

});

describe("ApiTotemRepository — escrita (cloud/EasyFoodAPI)", () => {
  it("create() no cloud faz POST /totems com o corpo por lista explícita (sem 2ª chamada quando precisa_ativar é omitido)", async () => {
    const fetchSpy = mockFetchOnce({ id: "t1", sync_hint: "Criado." }, 201);
    const result = await new ApiTotemRepository(tenant, "cloud").create(
      {
        totem_name: "TOTEM-001",
        is_active: true,
        nfce_service_api_key: "chave-nova",
        nfce_service_api_key_set: true,
      } as never,
      "lic-1",
    );
    expect(result).toEqual({ id: "t1", syncHint: "Criado." });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/totems");
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.totem_name).toBe("TOTEM-001");
    expect(body.is_active).toBe(true);
    expect(body.license_id).toBe("lic-1");
    // Campo digitado (mesmo com `_set: true`) vai no corpo — só o BRANCO é omitido.
    expect(body.nfce_service_api_key).toBe("chave-nova");
    // Campo não listado em `TotemConfigFormData` (derivado/só-leitura) não vaza no corpo cloud.
    expect(body).not.toHaveProperty("aditum_partner_token_encrypted");
  });

  it("create() no cloud omite chave de API em branco quando já gravada (_set: true)", async () => {
    const fetchSpy = mockFetchOnce({ id: "t1" }, 201);
    await new ApiTotemRepository(tenant, "cloud").create(
      { totem_name: "TOTEM-001", is_active: false, tef_http_api_key: "", tef_http_api_key_set: true } as never,
    );
    const body = JSON.parse(String((fetchSpy.mock.calls[0]![1] as RequestInit).body));
    expect(body).not.toHaveProperty("tef_http_api_key");
  });

  it("create() no cloud dispara PATCH .../active quando a API responde precisa_ativar", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "t1", precisa_ativar: true }), { status: 201 }),
    );
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const result = await new ApiTotemRepository(tenant, "cloud").create(
      { totem_name: "TOTEM-001", is_active: true } as never,
      "lic-1",
    );
    expect(result.id).toBe("t1");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [url2, init2] = fetchSpy.mock.calls[1]!;
    expect(String(url2)).toBe("/api/v1/totems/t1/active");
    expect((init2 as RequestInit).method).toBe("PATCH");
    expect(JSON.parse(String((init2 as RequestInit).body))).toEqual({ is_active: true, license_id: "lic-1" });
  });

  it("update() no cloud faz PATCH /totems/:id com o corpo por lista explícita", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    await new ApiTotemRepository(tenant, "cloud").update("t1", { totem_name: "TOTEM-001", is_active: true } as never, "lic-1");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/totems/t1");
    expect((init as RequestInit).method).toBe("PATCH");
    expect(JSON.parse(String((init as RequestInit).body)).license_id).toBe("lic-1");
  });

  it("update() no cloud dispara PATCH .../active quando a API responde precisa_ativar", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ precisa_ativar: true }), { status: 200 }));
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await new ApiTotemRepository(tenant, "cloud").update("t1", { totem_name: "TOTEM-001", is_active: true } as never);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[1]![0])).toBe("/api/v1/totems/t1/active");
  });

  it("setActive() funciona igual nos dois backends (mesma rota/corpo)", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    await new ApiTotemRepository(tenant, "cloud").setActive("t1", true, "lic-1");
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/totems/t1/active");
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ is_active: true, license_id: "lic-1" });
  });

  it("requeueSync() no cloud faz POST /totems/:id/requeue-cloud-sync e lê só licenses_requeued", async () => {
    mockFetchOnce({ licenses_requeued: 2 });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await new ApiTotemRepository(tenant, "cloud").requeueSync("t1");
    expect(result).toEqual({ outboxInserted: true, licensesRequeued: 2, syncHint: "", syncDiagnostics: null });
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/totems/t1/requeue-cloud-sync");
  });
});

describe("ApiTotemRepository — seriesStatus() no cloud (C2)", () => {
  // Legado: `data-service.ts#fetchTotemSeriesStatuses` só chama a rota com Admin API (LAN) e
  // devolve `[]` em qualquer modo de nuvem; `cloud-api-data.ts` não tem a rota.
  it("devolve [] sem nenhuma chamada de rede", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await new ApiTotemRepository(tenant, "cloud").seriesStatus();
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("ApiTotemRepository — cloud: `ok: false` no corpo 2xx é falha (C3)", () => {
  it("create() lança com o `error` da API", async () => {
    const fetchSpy = mockFetchOnce({ ok: false, error: "Nome já usado." }, 200);
    await expect(
      new ApiTotemRepository(tenant, "cloud").create({ totem_name: "T", is_active: false } as never),
    ).rejects.toThrow("Nome já usado.");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("create() sem `error` lança com o texto padrão", async () => {
    mockFetchOnce({ ok: false }, 200);
    await expect(
      new ApiTotemRepository(tenant, "cloud").create({ totem_name: "T", is_active: false } as never),
    ).rejects.toThrow("Falha ao gravar.");
  });

  it("update() lança com o `error` da API", async () => {
    mockFetchOnce({ ok: false, error: "Licença indisponível." }, 200);
    await expect(
      new ApiTotemRepository(tenant, "cloud").update("t1", { totem_name: "T", is_active: true } as never, "lic-1"),
    ).rejects.toThrow("Licença indisponível.");
  });

  it("LAN não olha `ok` no corpo (o legado usa só o status HTTP no ramo Admin API)", async () => {
    mockFetchOnce({ ok: false, id: "t9" }, 201);
    const result = await new ApiTotemRepository(tenant, "lan").create({ totem_name: "T", is_active: false } as never);
    expect(result.id).toBe("t9");
  });
});

describe("ApiTotemRepository — sync_hint no cadastro LAN (Menor 5)", () => {
  it("hint vazio ou só espaços vira null (legado: `sync_hint?.trim() || undefined`)", async () => {
    mockFetchOnce({ id: "t1", sync_hint: "   " }, 201);
    const result = await new ApiTotemRepository(tenant, "lan").create({ totem_name: "T", is_active: false } as never);
    expect(result.syncHint).toBeNull();
  });

  it("hint com texto é aparado", async () => {
    mockFetchOnce({ id: "t1", sync_hint: "  Na outbox.  " }, 201);
    const result = await new ApiTotemRepository(tenant, "lan").create({ totem_name: "T", is_active: false } as never);
    expect(result.syncHint).toBe("Na outbox.");
  });
});

describe("ApiTotemRepository — requeueSync() no LAN: fallbacks do legado (I1)", () => {
  it("usa `sync_diagnostics` da resposta e `outbox_inserted` ausente vira true", async () => {
    mockFetchOnce({
      licenses_requeued: 0,
      sync_hint: "",
      sync_diagnostics: { recommendation: "ok", sync_service_likely_running: true, hint_pt: "Tudo certo." },
    });
    const result = await new ApiTotemRepository(tenant, "lan").requeueSync("t1");
    expect(result.outboxInserted).toBe(true);
    // `sync_hint` vazio → `hint_pt` do diagnóstico.
    expect(result.syncHint).toBe("Tudo certo.");
    expect(result.syncDiagnostics).toEqual({ recommendation: "ok", syncServiceLikelyRunning: true });
  });

  it("sem hint nem diagnóstico cai no texto padrão do legado; outbox_inserted: false é preservado", async () => {
    mockFetchOnce({ outbox_inserted: false, licenses_requeued: 1 });
    const result = await new ApiTotemRepository(tenant, "lan").requeueSync("t1");
    expect(result.outboxInserted).toBe(false);
    expect(result.syncHint).toBe("Aguarde o Sync PG-SB e vincule a licença no portal web.");
  });
});

// Legado 1.3.13 (PR #56): `fetchTotemSeriesOwner` + `withTransferSeries` (`data-service.ts`).
describe("ApiTotemRepository — dono da série NFC-e (legado 1.3.13, PR #56)", () => {
  const OWNER_ROW = {
    series_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    serie: 1,
    environment: 2,
    current_number: "41",
    owner_totem_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    owner_totem_name: "TOTEM-01",
    owner_active: false,
  };

  it("seriesOwner() no LAN busca /totems/series-owner com serie, environment e totemId", async () => {
    const fetchSpy = mockFetchOnce({ data: OWNER_ROW });
    const owner = await new ApiTotemRepository(tenant, "lan").seriesOwner(1, 2, "t1");
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/totems/series-owner?serie=1&environment=2&totemId=t1");
    expect(owner).toEqual({ ...OWNER_ROW, current_number: 41 });
  });

  it("seriesOwner() sem totem (cadastro novo) não manda totemId", async () => {
    const fetchSpy = mockFetchOnce({ data: null });
    const owner = await new ApiTotemRepository(tenant, "lan").seriesOwner(3, 1, null);
    expect(String(fetchSpy.mock.calls[0]![0])).toBe("/api/v1/totems/series-owner?serie=3&environment=1");
    expect(owner).toBeNull();
  });

  it("seriesOwner() com linha antiga sem totem mantém dono/ativo nulos", async () => {
    mockFetchOnce({ data: { ...OWNER_ROW, owner_totem_id: null, owner_totem_name: null, owner_active: null } });
    const owner = await new ApiTotemRepository(tenant, "lan").seriesOwner(1, 2, "t1");
    expect(owner).toMatchObject({ owner_totem_id: null, owner_totem_name: null, owner_active: null });
  });

  it("seriesOwner() na nuvem devolve null sem rede (a série é só local, como no legado)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await new ApiTotemRepository(tenant, "cloud").seriesOwner(1, 2, "t1")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("update() no LAN com transferSeriesId manda transfer_series_id no corpo", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    await new ApiTotemRepository(tenant, "lan").update("t1", { totem_name: "TOTEM-001" } as never, "lic-1", {
      transferSeriesId: OWNER_ROW.series_id,
    });
    const body = JSON.parse(String((fetchSpy.mock.calls[0]![1] as RequestInit).body));
    expect(body.transfer_series_id).toBe(OWNER_ROW.series_id);
  });

  it("create() no LAN com transferSeriesId manda transfer_series_id no corpo", async () => {
    const fetchSpy = mockFetchOnce({ id: "t9" }, 201);
    await new ApiTotemRepository(tenant, "lan").create({ totem_name: "TOTEM-009" } as never, null, {
      transferSeriesId: OWNER_ROW.series_id,
    });
    const body = JSON.parse(String((fetchSpy.mock.calls[0]![1] as RequestInit).body));
    expect(body.transfer_series_id).toBe(OWNER_ROW.series_id);
  });

  it("sem transferência, o corpo LAN não tem transfer_series_id", async () => {
    const fetchSpy = mockFetchOnce({ ok: true });
    await new ApiTotemRepository(tenant, "lan").update("t1", { totem_name: "TOTEM-001" } as never, "lic-1", {});
    const body = JSON.parse(String((fetchSpy.mock.calls[0]![1] as RequestInit).body));
    expect(body).not.toHaveProperty("transfer_series_id");
  });

  it("na nuvem transfer_series_id nunca vai no corpo (só a Admin API local o conhece)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({ ok: true, id: "t1" }), { status: 200 }));
    const repo = new ApiTotemRepository(tenant, "cloud");
    await repo.update("t1", { totem_name: "TOTEM-001" } as never, "lic-1", { transferSeriesId: OWNER_ROW.series_id });
    await repo.create({ totem_name: "TOTEM-002" } as never, "lic-1", { transferSeriesId: OWNER_ROW.series_id });
    for (const call of fetchSpy.mock.calls) {
      expect(JSON.parse(String((call[1] as RequestInit).body))).not.toHaveProperty("transfer_series_id");
    }
  });
});
