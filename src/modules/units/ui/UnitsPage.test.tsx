import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UnitsPage } from "./UnitsPage";
import * as unitsQueryModule from "./use-units-query";
import type { Unit } from "../domain/unit";

const mockUnit1: Unit = {
  id: "unit-1",
  legacyCode: 1,
  shortDescription: "UND",
  description: "Unidade",
  isFractional: false,
  isActive: true,
  createdAt: "2024-01-01T10:00:00Z",
};

const mockUnit2: Unit = {
  id: "unit-2",
  legacyCode: 2,
  shortDescription: "KG",
  description: "Quilograma",
  isFractional: true,
  isActive: true,
  createdAt: "2024-01-02T10:00:00Z",
};

describe("UnitsPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("mostra o estado de carregamento", () => {
    const mockReturn = {
      data: [],
      isLoading: true,
      refetch: vi.fn(),
      isError: false,
      error: null,
      isPending: false,
      isSuccess: false,
      status: "pending" as const,
    };
    vi.spyOn(unitsQueryModule, "useUnitsQuery").mockReturnValue(mockReturn as never);

    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });

  it("mostra o estado vazio", () => {
    const mockReturn = {
      data: [],
      isLoading: false,
      refetch: vi.fn(),
      isError: false,
      error: null,
      isPending: false,
      isSuccess: true,
      status: "success" as const,
    };
    vi.spyOn(unitsQueryModule, "useUnitsQuery").mockReturnValue(mockReturn as never);

    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Nenhuma unidade cadastrada")).toBeInTheDocument();
  });

  it("estado de erro: sem tratamento próprio, cai no mesmo vazio do legado", () => {
    const mockReturn = {
      data: undefined,
      isLoading: false,
      refetch: vi.fn(),
      isError: true,
      error: new Error("falhou"),
      isPending: false,
      isSuccess: false,
      status: "error" as const,
    };
    vi.spyOn(unitsQueryModule, "useUnitsQuery").mockReturnValue(mockReturn as never);

    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>,
    );

    // A tela não tem estado de erro dedicado: sem dados, mostra a mesma mensagem do vazio —
    // igual ao legado (ver fase-2-revisao-final.md, Menor 8).
    expect(screen.getByText("Nenhuma unidade cadastrada")).toBeInTheDocument();
  });

  it("mostra a tabela de unidades com dados", () => {
    const mockReturn = {
      data: [mockUnit1, mockUnit2],
      isLoading: false,
      refetch: vi.fn(),
      isError: false,
      error: null,
      isPending: false,
      isSuccess: true,
      status: "success" as const,
    };
    vi.spyOn(unitsQueryModule, "useUnitsQuery").mockReturnValue(mockReturn as never);

    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Unidades (2)")).toBeInTheDocument();
    expect(screen.getByText("UND")).toBeInTheDocument();
    expect(screen.getByText("Unidade")).toBeInTheDocument();
    expect(screen.getByText("KG")).toBeInTheDocument();
    expect(screen.getByText("Quilograma")).toBeInTheDocument();
  });

  it("mostra o badge correto para unidades fracionáveis", () => {
    const mockReturn = {
      data: [mockUnit1, mockUnit2],
      isLoading: false,
      refetch: vi.fn(),
      isError: false,
      error: null,
      isPending: false,
      isSuccess: true,
      status: "success" as const,
    };
    vi.spyOn(unitsQueryModule, "useUnitsQuery").mockReturnValue(mockReturn as never);

    render(
      <QueryClientProvider client={queryClient}>
        <UnitsPage />
      </QueryClientProvider>,
    );

    // Badges do status "fracionável"
    expect(screen.getByText("Não")).toBeInTheDocument(); // mockUnit1 não é fracionável
    expect(screen.getByText("Sim")).toBeInTheDocument(); // mockUnit2 é fracionável
  });
});
