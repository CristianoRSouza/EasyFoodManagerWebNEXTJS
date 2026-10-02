import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiTaxReformRepository } from "./api-tax-reform-repository";
import * as apiClient from "@/shared/http/api-client";

vi.mock("@/shared/http/api-client");

const tenant = { companyId: "company-1", storeId: "store-1" };

describe("ApiTaxReformRepository", () => {
  beforeEach(() => {
    vi.mocked(apiClient.apiRequest).mockReset();
  });

  it("fetchUnionReferenceRate: pede /cbs/union-reference-rate com o limit informado", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [{ reference_date: "2026-01-01", valid_from: "2026-01-01", valid_to: null, reference_rate: "0.90", own_rate: "0.90", updated_at: "2026-01-01T00:00:00Z" }],
    });

    const repo = new ApiTaxReformRepository(tenant);
    const rows = await repo.fetchUnionReferenceRate(30);

    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/union-reference-rate?limit=30", { tenant });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reference_rate).toBe("0.90");
  });

  it("fetchUnionReferenceRate: sem limit, usa o default (24) da rota", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });
    const repo = new ApiTaxReformRepository(tenant);
    await repo.fetchUnionReferenceRate();
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/union-reference-rate?limit=24", { tenant });
  });

  it("fetchOpenDatasetVersion: sem query string (rota não aceita parâmetros)", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [{ id: "v1", dataset_description: "CBS 2026", provider_app_version: "1.0", provider_db_version: "1.0", updated_at: "2026-01-01T00:00:00Z" }],
    });
    const repo = new ApiTaxReformRepository(tenant);
    const rows = await repo.fetchOpenDatasetVersion();
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/open-dataset-version", { tenant });
    expect(rows[0]?.id).toBe("v1");
  });

  it("fetchTaxClassIbscbsType: repassa o limit alto pedido pela tela (1000)", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });
    const repo = new ApiTaxReformRepository(tenant);
    await repo.fetchTaxClassIbscbsType(1000);
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/tax-class-ibscbs-type?limit=1000", { tenant });
  });

  it("fetchTaxClassIbscbs: usa o default (120) quando não informado", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });
    const repo = new ApiTaxReformRepository(tenant);
    await repo.fetchTaxClassIbscbs();
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/tax-class-ibscbs?limit=120", { tenant });
  });

  it("fetchTaxClassIbscbsIndicator: repassa o limit", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });
    const repo = new ApiTaxReformRepository(tenant);
    await repo.fetchTaxClassIbscbsIndicator(300);
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/tax-class-ibscbs-indicator?limit=300", { tenant });
  });

  it("fetchMunicipalityWithRateByUf: manda a UF, sem limit (a rota não aceita)", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [{ code: "3550308", state_abbreviation: "SP", name: "São Paulo", updated_at: "2026-01-01T00:00:00Z", reference_date: null, valid_from: null, valid_to: null, reference_rate: null, own_rate_mun: null, rate_updated_at: null }],
    });
    const repo = new ApiTaxReformRepository(tenant);
    const rows = await repo.fetchMunicipalityWithRateByUf("SP");
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/municipality-with-rate-by-uf?uf=SP", { tenant });
    expect(rows[0]?.name).toBe("São Paulo");
  });

  it("fetchLegalBasis: repassa o limit", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });
    const repo = new ApiTaxReformRepository(tenant);
    await repo.fetchLegalBasis(500);
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/legal-basis?limit=500", { tenant });
  });

  it("fetchCstIbscbsIndicator: repassa o limit", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });
    const repo = new ApiTaxReformRepository(tenant);
    await repo.fetchCstIbscbsIndicator(300);
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/cst-ibscbs-indicator?limit=300", { tenant });
  });

  it("fetchCstIbscbs: repassa o limit", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });
    const repo = new ApiTaxReformRepository(tenant);
    await repo.fetchCstIbscbs(300);
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/cst-ibscbs?limit=300", { tenant });
  });

  it("fetchState: sem query string", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [{ code: 35, abbreviation: "SP", name: "São Paulo", updated_at: "2026-01-01T00:00:00Z" }],
    });
    const repo = new ApiTaxReformRepository(tenant);
    const rows = await repo.fetchState();
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/state", { tenant });
    expect(rows[0]?.abbreviation).toBe("SP");
  });

  it("fetchStateReferenceRate: sem stateCode, manda só o limit", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });
    const repo = new ApiTaxReformRepository(tenant);
    await repo.fetchStateReferenceRate(undefined, 300);
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/state-reference-rate?limit=300", { tenant });
  });

  it("fetchStateReferenceRate: com stateCode, manda os dois parâmetros", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });
    const repo = new ApiTaxReformRepository(tenant);
    await repo.fetchStateReferenceRate(35, 120);
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/cbs/state-reference-rate?stateCode=35&limit=120", { tenant });
  });

  it("resposta sem 'data' vira lista vazia, não erro", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({} as { data: unknown[] });
    const repo = new ApiTaxReformRepository(tenant);
    await expect(repo.fetchState()).resolves.toEqual([]);
  });
});
