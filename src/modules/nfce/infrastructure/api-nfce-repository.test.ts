import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/shared/http/api-client";
import { ApiError } from "@/shared/http/api-error";
import type { NfceDetail, NfceDocuments } from "../domain/nfce-detail";
import { ApiNfceRepository } from "./api-nfce-repository";

function detailWithDocuments(documents: NfceDocuments): NfceDetail {
  return { documents } as unknown as NfceDetail;
}

vi.mock("@/shared/http/api-client");

const tenant = { companyId: "company-1", storeId: "store-1" };

beforeEach(() => {
  vi.mocked(apiClient.apiRequest).mockReset();
  vi.mocked(apiClient.request).mockReset();
  vi.mocked(apiClient.toResult).mockReset();
});

describe("ApiNfceRepository.list", () => {
  it("monta a query com os mesmos filtros da tela e mapeia as linhas", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [{ id: "n1", numero: 1, serie: 1, status: "authorized", valor_total: "10.00" }],
      total: 1,
      page: 1,
      limit: 50,
    });

    const repository = new ApiNfceRepository(tenant);
    const page = await repository.list({ status: "authorized", reconcileStatus: "failed", from: "2026-09-01", to: "2026-09-30", search: "123", page: 2, limit: 20 });

    expect(apiClient.apiRequest).toHaveBeenCalledWith(
      "/nfce/notes?status=authorized&reconcileStatus=failed&from=2026-09-01&to=2026-09-30&search=123&page=2&limit=20",
      { tenant },
    );
    expect(page.data).toEqual([expect.objectContaining({ id: "n1", status: "authorized", totalValue: 10 })]);
    expect(page).toMatchObject({ total: 1, page: 1, limit: 50 });
  });

  it("status 'all' não vira filtro real (mesma regra da API)", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [], total: 0, page: 1, limit: 50 });
    const repository = new ApiNfceRepository(tenant);
    await repository.list({ status: "all" });
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/nfce/notes?page=1&limit=50", { tenant });
  });
});

describe("ApiNfceRepository.totals", () => {
  it("traduz porStatus/valorAutorizado para byStatus/authorizedAmount", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: { total: 3, porStatus: { authorized: 2, rejected: 1 }, valorAutorizado: "25130.45" },
    });
    const repository = new ApiNfceRepository(tenant);
    const totals = await repository.totals({});
    expect(totals).toEqual({ total: 3, byStatus: { authorized: 2, rejected: 1 }, authorizedAmount: 25130.45 });
  });
});

describe("ApiNfceRepository.attentionCounts", () => {
  it("devolve zeros quando a API não traz dado", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({});
    const repository = new ApiNfceRepository(tenant);
    expect(await repository.attentionCounts()).toEqual({ manualReview: 0, reconcileFailed: 0, unusable: 0 });
  });
});

describe("ApiNfceRepository.detail", () => {
  it("devolve null quando a API responde 404 (nota não encontrada)", async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValue(new ApiError(404, "not_found", "not found"));
    const repository = new ApiNfceRepository(tenant);
    expect(await repository.detail("missing")).toBeNull();
  });

  it("Menor 13 — devolve null quando a API responde 400 invalid_note_id (id que não é UUID)", async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValue(new ApiError(400, "invalid_note_id", "id inválido"));
    const repository = new ApiNfceRepository(tenant);
    expect(await repository.detail("not-a-uuid")).toBeNull();
  });

  it("Menor 13 — propaga 400 com outro código (não é o caso invalid_note_id)", async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValue(new ApiError(400, "bad_request", "corpo inválido"));
    const repository = new ApiNfceRepository(tenant);
    await expect(repository.detail("n1")).rejects.toThrow("corpo inválido");
  });

  it("propaga outros erros (não engole 500)", async () => {
    vi.mocked(apiClient.apiRequest).mockRejectedValue(new ApiError(500, "database_error", "boom"));
    const repository = new ApiNfceRepository(tenant);
    await expect(repository.detail("n1")).rejects.toThrow("boom");
  });

  it("mapeia a linha do detalhe (lê total_nota, não valor_total)", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: { id: "n1", numero: 1, serie: 1, status: "manual_review", total_nota: "50.00", emitente_cnpj: "1", emitente_razao: "x", emitente_uf: "SP" },
    });
    const repository = new ApiNfceRepository(tenant);
    const detail = await repository.detail("n1");
    expect(detail?.note.totalValue).toBe(50);
  });
});

describe("ApiNfceRepository.items / payments / logs / events", () => {
  it("mapeiam a lista de cada sub-recurso", async () => {
    const repository = new ApiNfceRepository(tenant);

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({ data: [{ item: 1, descricao: "x", ncm: "1", cfop: "5102" }] });
    expect(await repository.items("n1")).toHaveLength(1);
    expect(apiClient.apiRequest).toHaveBeenLastCalledWith("/nfce/notes/n1/items", { tenant });

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({ data: [{ seq: 1, forma_pagamento: "17", valor: "10" }] });
    expect(await repository.payments("n1")).toHaveLength(1);
    expect(apiClient.apiRequest).toHaveBeenLastCalledWith("/nfce/notes/n1/payments", { tenant });

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({ data: [{ id: "l1", level: "INFO", message: "x" }] });
    expect(await repository.logs("n1")).toHaveLength(1);
    expect(apiClient.apiRequest).toHaveBeenLastCalledWith("/nfce/notes/n1/logs", { tenant });

    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({ data: [{ id: "e1", event_type: "cancellation" }] });
    expect(await repository.events("n1")).toHaveLength(1);
    expect(apiClient.apiRequest).toHaveBeenLastCalledWith("/nfce/notes/n1/events", { tenant });
  });
});

describe("ApiNfceRepository.xml", () => {
  it("devolve o XML inline do detalhe já carregado, sem chamar a rede", async () => {
    const repository = new ApiNfceRepository(tenant);
    const detail = detailWithDocuments({
      authorizedXml: "<a/>",
      cancellationXml: null,
      signedXml: null,
      generatedXml: null,
      qrCode: null,
      cancellationProtocol: null,
      cancelledAt: null,
    });
    expect(await repository.xml("n1", "authorized", detail)).toBe("<a/>");
    expect(apiClient.apiRequest).not.toHaveBeenCalled();
  });

  it("devolve null quando o XML pedido não veio inline — não existe rota avulsa no modo LAN", async () => {
    const repository = new ApiNfceRepository(tenant);
    const detail = detailWithDocuments({
      authorizedXml: null,
      cancellationXml: null,
      signedXml: null,
      generatedXml: null,
      qrCode: null,
      cancellationProtocol: null,
      cancelledAt: null,
    });
    expect(await repository.xml("n1", "cancellation", detail)).toBeNull();
  });

  it("sem detalhe carregado, devolve null", async () => {
    const repository = new ApiNfceRepository(tenant);
    expect(await repository.xml("n1", "authorized", null)).toBeNull();
  });

  // Nuvem (homologação, 2026-10-01): o XML vem sob demanda de `/nfce/notes/:id/xml/:kind`, como no
  // legado (`fetchNfceXml` → `fetchApiNfceXml`).
  const noInline = detailWithDocuments({
    authorizedXml: null, cancellationXml: null, signedXml: null, generatedXml: null,
    qrCode: null, cancellationProtocol: null, cancelledAt: null,
  });

  it("nuvem: sem XML inline, busca na rota própria e devolve o `xml` do envelope", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: { xml: "<NFe/>", nomeArquivo: "n.xml" } });
    const repository = new ApiNfceRepository(tenant, "cloud");
    expect(await repository.xml("n 1", "authorized", noInline)).toBe("<NFe/>");
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/nfce/notes/n%201/xml/authorized", { tenant });
  });

  it("nuvem: XML inline continua valendo, sem chamar a rede", async () => {
    const repository = new ApiNfceRepository(tenant, "cloud");
    const detail = detailWithDocuments({ ...noInline.documents, cancellationXml: "<c/>" });
    expect(await repository.xml("n1", "cancellation", detail)).toBe("<c/>");
    expect(apiClient.apiRequest).not.toHaveBeenCalled();
  });

  it("nuvem: envelope sem dado devolve null", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: null });
    const repository = new ApiNfceRepository(tenant, "cloud");
    expect(await repository.xml("n1", "signed", noInline)).toBeNull();
  });
});

describe("ApiNfceRepository.downloadXmlArchive", () => {
  it("pagina por afterId até o lote vir vazio, e monta um ZIP de verdade", async () => {
    vi.mocked(apiClient.apiRequest)
      .mockResolvedValueOnce({
        data: [{ id: "1", number: 1, serie: 1, access_key: "1".repeat(44), status: "authorized", issued_at: null, authorized_xml: "<a/>", cancellation_xml: null, signed_xml: null, generated_xml: null }],
      })
      .mockResolvedValueOnce({ data: [] });

    const repository = new ApiNfceRepository(tenant);
    const result = await repository.downloadXmlArchive({ from: "2026-09-01", to: "2026-09-30" });

    expect(result.blob.type).toBe("application/zip");
    expect(result.filename).toBe("nfce-xml-2026-09-01-a-2026-09-30.zip");
    expect(result.stats).toMatchObject({ notes: 1, files: 1, authorized: 1 });
    expect(apiClient.apiRequest).toHaveBeenNthCalledWith(
      1,
      "/nfce/notes-xml?from=2026-09-01&to=2026-09-30&limit=200",
      { tenant },
    );
    expect(apiClient.apiRequest).toHaveBeenNthCalledWith(
      2,
      "/nfce/notes-xml?from=2026-09-01&to=2026-09-30&afterId=1&limit=200",
      { tenant },
    );
  });
});

describe("ApiNfceRepository.downloadXmlArchive — nuvem", () => {
  it("baixa o ZIP pronto de /nfce/xml-archive (a EasyFoodAPI não tem /nfce/notes-xml — homologação, 2026-10-01)", async () => {
    vi.mocked(apiClient.request).mockResolvedValue(
      new Response("PK", { status: 200, headers: { "content-type": "application/zip" } }),
    );
    const repository = new ApiNfceRepository(tenant, "cloud");
    const result = await repository.downloadXmlArchive({ from: "2026-09-01", to: "2026-09-30", status: "authorized" });

    expect(apiClient.request).toHaveBeenCalledWith("/nfce/xml-archive?status=authorized&from=2026-09-01&to=2026-09-30", { tenant });
    expect(apiClient.apiRequest).not.toHaveBeenCalled();
    expect(await result.blob.text()).toBe("PK");
    expect(result.filename).toBe("nfce-xml-2026-09-01-a-2026-09-30.zip");
    // Quem monta (e conta) o pacote é a API: sem contagem inventada, como no legado.
    expect(result.stats).toBeUndefined();
  });

  it("erro da API sobe como erro (a tela mostra \"Falha ao baixar os XML\")", async () => {
    vi.mocked(apiClient.request).mockResolvedValue(new Response("{}", { status: 503 }));
    vi.mocked(apiClient.toResult).mockRejectedValue(new ApiError(503, "x", "indisponível"));
    const repository = new ApiNfceRepository(tenant, "cloud");
    await expect(repository.downloadXmlArchive({})).rejects.toThrow("indisponível");
  });
});

describe("ApiNfceRepository — correção manual e reprocessamento", () => {
  const payload = {
    recipient: { cpf: "", cnpj: "", name: "", email: "" },
    infoComplementar: "",
    items: [{ item: 1, ncm: "12345678", cfop: "5102", cest: "", icmsCstCsosn: "00" }],
    payments: [{ seq: 1, paymentMethod: "17", paymentValue: "100.00" }],
  };
  const validContext = {
    status: "manual_review" as const,
    taxRegimeCode: 3,
    issuerUf: "SP",
    recipientUf: "SP",
    noteTotal: 100,
  };

  it("saveManualCorrection faz POST no endpoint da nota quando o contexto é válido", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ ok: true, message: "Correção salva com sucesso." });
    const repository = new ApiNfceRepository(tenant);
    const result = await repository.saveManualCorrection("n1", validContext, payload);
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/nfce/notes/n1/manual-correction", {
      method: "POST",
      body: payload,
      tenant,
    });
    expect(result).toEqual({ ok: true, message: "Correção salva com sucesso." });
  });

  // Menor 1 da revisão da Fase 3: o repositório valida por conta própria, ANTES do POST — não
  // depende de o chamador já ter checado (ex.: um segundo chamador que pule o hook de UI).
  it("saveManualCorrection — Menor 1: rejeita fora de manual_review SEM chamar a API", async () => {
    const repository = new ApiNfceRepository(tenant);
    const result = await repository.saveManualCorrection("n1", { ...validContext, status: "authorized" }, payload);
    expect(result).toEqual({ ok: false, error: "A edição é permitida somente para NFC-e pendente de correção." });
    expect(apiClient.apiRequest).not.toHaveBeenCalled();
  });

  it("saveManualCorrection — Menor 1: rejeita item com NCM inválido SEM chamar a API", async () => {
    const repository = new ApiNfceRepository(tenant);
    const invalidPayload = { ...payload, items: [{ item: 1, ncm: "123", cfop: "5102", cest: "", icmsCstCsosn: "00" }] };
    const result = await repository.saveManualCorrection("n1", validContext, invalidPayload);
    expect(result).toEqual({ ok: false, error: "Item 1: NCM deve ter 8 dígitos." });
    expect(apiClient.apiRequest).not.toHaveBeenCalled();
  });

  it("saveAndReprocessManualCorrection não chama reprocess quando salvar falha", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValueOnce({ ok: false, error: "Item 1: dados fiscais inválidos." });
    const repository = new ApiNfceRepository(tenant);
    const result = await repository.saveAndReprocessManualCorrection("n1", validContext, payload);
    expect(result).toEqual({ ok: false, error: "Item 1: dados fiscais inválidos." });
    expect(apiClient.apiRequest).toHaveBeenCalledTimes(1);
  });

  it("saveAndReprocessManualCorrection — Menor 1: contexto inválido bloqueia ANTES de salvar ou reprocessar", async () => {
    const repository = new ApiNfceRepository(tenant);
    const result = await repository.saveAndReprocessManualCorrection("n1", { ...validContext, status: "authorized" }, payload);
    expect(result).toEqual({ ok: false, error: "A edição é permitida somente para NFC-e pendente de correção." });
    expect(apiClient.apiRequest).not.toHaveBeenCalled();
  });

  it("saveAndReprocessManualCorrection encadeia reprocess quando salvar dá certo", async () => {
    vi.mocked(apiClient.apiRequest)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, message: "Reprocessamento solicitado." });
    const repository = new ApiNfceRepository(tenant);
    const result = await repository.saveAndReprocessManualCorrection("n1", validContext, payload);
    expect(result).toEqual({ ok: true, message: "Correção salva e reprocessamento solicitado com sucesso." });
    expect(apiClient.apiRequest).toHaveBeenLastCalledWith("/nfce/notes/n1/reprocess", {
      method: "POST",
      body: {},
      tenant,
    });
  });
});
