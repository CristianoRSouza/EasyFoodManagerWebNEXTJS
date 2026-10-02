import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RuntimeProvider } from "@/shared/runtime/runtime-context";
import { TaxReformFiscalPage } from "./TaxReformFiscalPage";
import * as useRepositoryModule from "./use-tax-reform-repository";
import type { TaxReformRepository } from "../application/tax-reform-repository";

/**
 * Mock no nível do repositório do módulo (não em `apiRequest` cru): mesmo padrão de
 * `UnitsPage.test.tsx`/`ProductsPage.test.tsx` — a tela não usa TanStack Query (usa
 * `LazyFiscalCard`, que gerencia seu próprio estado idle/loading/done/error por card), então não
 * há hook de query para mockar; o ponto de corte é o repositório, injetado via
 * `useTaxReformRepository`.
 */
function makeRepository(overrides: Partial<TaxReformRepository> = {}): TaxReformRepository {
  return {
    fetchUnionReferenceRate: vi.fn().mockResolvedValue([]),
    fetchOpenDatasetVersion: vi.fn().mockResolvedValue([]),
    fetchTaxClassIbscbsType: vi.fn().mockResolvedValue([]),
    fetchTaxClassIbscbs: vi.fn().mockResolvedValue([]),
    fetchTaxClassIbscbsIndicator: vi.fn().mockResolvedValue([]),
    fetchMunicipalityWithRateByUf: vi.fn().mockResolvedValue([]),
    fetchLegalBasis: vi.fn().mockResolvedValue([]),
    fetchCstIbscbsIndicator: vi.fn().mockResolvedValue([]),
    fetchCstIbscbs: vi.fn().mockResolvedValue([]),
    fetchState: vi.fn().mockResolvedValue([]),
    fetchStateReferenceRate: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function renderPage(repository: TaxReformRepository) {
  vi.spyOn(useRepositoryModule, "useTaxReformRepository").mockReturnValue(repository);
  return render(
    <RuntimeProvider value={{ backend: "lan", apiDisplayOrigin: "loja.local", adminPlatformUrl: "https://admin.example.com" }}>
      <TaxReformFiscalPage />
    </RuntimeProvider>,
  );
}

describe("TaxReformFiscalPage", () => {
  it("renderiza a navegação do emitente e o filtro de ano", () => {
    renderPage(makeRepository());
    expect(screen.getByText("Emitente NFC-e")).toBeInTheDocument();
    expect(screen.getByText("Filtrar por ano de vigência:")).toBeInTheDocument();
  });

  it("estado carregando: mostra 'Carregando...' na seção eager antes da API responder", async () => {
    let resolveDataset!: (rows: Awaited<ReturnType<TaxReformRepository["fetchOpenDatasetVersion"]>>) => void;
    const pending = new Promise<Awaited<ReturnType<TaxReformRepository["fetchOpenDatasetVersion"]>>>((resolve) => {
      resolveDataset = resolve;
    });
    renderPage(makeRepository({ fetchOpenDatasetVersion: vi.fn().mockReturnValue(pending) }));

    expect(await screen.findByText("Carregando Versão Dataset CBS/IBS…")).toBeInTheDocument();

    resolveDataset([]);
  });

  it("estado vazio: mostra a mensagem de 'nenhum encontrado' quando a API devolve listas vazias", async () => {
    renderPage(makeRepository());

    expect(await screen.findByText("Nenhuma versão de dataset encontrada")).toBeInTheDocument();
    expect(await screen.findByText("Nenhuma alíquota de referência encontrada")).toBeInTheDocument();
  });

  it("estado de erro: mostra a mensagem de falha quando a API rejeita", async () => {
    renderPage(makeRepository({ fetchOpenDatasetVersion: vi.fn().mockRejectedValue(new Error("falhou")) }));

    expect(await screen.findByText("Falha ao carregar. Atualize a página para tentar novamente.")).toBeInTheDocument();
    // A seção vizinha (Alíquota da União) não é afetada pela falha da outra.
    expect(await screen.findByText("Nenhuma alíquota de referência encontrada")).toBeInTheDocument();
  });

  it("estado com dados: mostra as linhas devolvidas pela API", async () => {
    renderPage(
      makeRepository({
        fetchOpenDatasetVersion: vi.fn().mockResolvedValue([
          {
            id: "v1",
            dataset_description: "CBS 2026",
            provider_app_version: "1.0",
            provider_db_version: "1.0",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ]),
        fetchUnionReferenceRate: vi.fn().mockResolvedValue([
          {
            reference_date: "2026-01-01",
            valid_from: "2026-01-01",
            valid_to: null,
            reference_rate: "0.90",
            own_rate: "0.90",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ]),
      }),
    );

    expect(await screen.findByText("CBS 2026")).toBeInTheDocument();
    // Alíq. Referência e Alíq. Própria: mesmo valor (0.90) nas duas colunas da linha.
    expect(await screen.findAllByText("0.90%")).toHaveLength(2);
  });

  it("seções não-eager ficam pendentes de rolagem (sem IntersectionObserver no jsdom)", async () => {
    renderPage(makeRepository());

    await screen.findByText("Nenhuma versão de dataset encontrada"); // espera as seções eager assentarem
    expect(screen.getAllByText("Role para baixo para carregar…").length).toBeGreaterThan(0);
  });
});
