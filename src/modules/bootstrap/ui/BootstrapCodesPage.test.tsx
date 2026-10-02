import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BootstrapCodesPage } from "./BootstrapCodesPage";
import * as runtimeModule from "@/shared/runtime/runtime-context";
import * as tenantModule from "@/shared/tenant/tenant-context";
import type { TenantState } from "@/shared/tenant/tenant-context";
import * as formModule from "./use-bootstrap-codes-form";

vi.mock("@/shared/runtime/runtime-context");
vi.mock("@/shared/tenant/tenant-context");
vi.mock("./use-bootstrap-codes-form");

type FormState = ReturnType<typeof formModule.useBootstrapCodesForm>;

const baseTenant: TenantState = {
  loading: false,
  companies: [],
  storesByCompany: {},
  allStoresLoaded: false,
  loadAllStores: vi.fn(),
  selection: { companyId: "company-1", storeId: "store-1" },
  selectedCompany: { id: "company-1", name: "Empresa Teste", cnpj: "" },
  selectedStore: { id: "store-1", company_id: "company-1", trade_name: "Loja Centro", legacy_store_code: "1" },
  needsSelection: false,
  isSystemAdmin: false,
  isCompanyAdmin: false,
  select: vi.fn(),
  refresh: vi.fn(),
};

const baseForm: FormState = {
  email: "",
  setEmail: vi.fn(),
  generating: false,
  result: null,
  copied: false,
  generate: vi.fn(),
  copy: vi.fn(),
};

function mockRuntime(backend: "cloud" | "lan") {
  vi.spyOn(runtimeModule, "useRuntime").mockReturnValue({
    backend,
    apiDisplayOrigin: "api.local",
    adminPlatformUrl: "https://admin.local",
  });
}

function mockTenant(overrides: Partial<TenantState> = {}) {
  vi.spyOn(tenantModule, "useTenant").mockReturnValue({ ...baseTenant, ...overrides });
}

function mockForm(overrides: Partial<FormState> = {}) {
  vi.spyOn(formModule, "useBootstrapCodesForm").mockReturnValue({ ...baseForm, ...overrides });
}

describe("BootstrapCodesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("modo loja (LAN): mostra o estado indisponível, igual ao legado", () => {
    mockRuntime("lan");
    mockTenant();
    mockForm();

    render(<BootstrapCodesPage />);

    expect(screen.getByText("Esta função está disponível apenas no modo Nuvem (painel Supabase).")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email do usuário")).not.toBeInTheDocument();
  });

  it("nuvem, sem ser admin: mostra o aviso de acesso negado", () => {
    mockRuntime("cloud");
    mockTenant({ isSystemAdmin: false, isCompanyAdmin: false });
    mockForm();

    render(<BootstrapCodesPage />);

    expect(
      screen.getByText("Apenas administradores da empresa/loja podem gerar códigos de primeiro acesso."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email do usuário")).not.toBeInTheDocument();
  });

  it("nuvem, admin da empresa: mostra o formulário com a loja e a empresa selecionadas", () => {
    mockRuntime("cloud");
    mockTenant({ isCompanyAdmin: true });
    mockForm();

    render(<BootstrapCodesPage />);

    expect(screen.getByLabelText("Email do usuário")).toBeInTheDocument();
    expect(screen.getByText("Loja Centro")).toBeInTheDocument();
    expect(screen.getByText("· Empresa Teste")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gerar código/ })).toBeEnabled();
  });

  it("nuvem, system admin: também gera acesso ao formulário", () => {
    mockRuntime("cloud");
    mockTenant({ isSystemAdmin: true });
    mockForm();

    render(<BootstrapCodesPage />);

    expect(screen.getByLabelText("Email do usuário")).toBeInTheDocument();
  });

  it("sem loja com nome cadastrado: usa o id da loja como rótulo", () => {
    mockRuntime("cloud");
    mockTenant({ isCompanyAdmin: true, selectedStore: null });
    mockForm();

    render(<BootstrapCodesPage />);

    expect(screen.getByText("store-1")).toBeInTheDocument();
  });

  it("loja com trade_name vazio: mostra o vazio, não o id (legado usa `??`, Menor 6)", () => {
    mockRuntime("cloud");
    mockTenant({
      isCompanyAdmin: true,
      selectedStore: { id: "store-1", company_id: "company-1", trade_name: "", legacy_store_code: "1" },
    });
    mockForm();

    render(<BootstrapCodesPage />);

    expect(screen.queryByText("store-1")).not.toBeInTheDocument();
  });

  it("gerando: botão mostra 'Gerando…' e fica desabilitado", () => {
    mockRuntime("cloud");
    mockTenant({ isCompanyAdmin: true });
    mockForm({ generating: true });

    render(<BootstrapCodesPage />);

    expect(screen.getByRole("button", { name: /Gerando…/ })).toBeDisabled();
  });

  it("clique em 'Gerar código' chama generate()", () => {
    mockRuntime("cloud");
    mockTenant({ isCompanyAdmin: true });
    const generate = vi.fn();
    mockForm({ generate });

    render(<BootstrapCodesPage />);
    fireEvent.click(screen.getByRole("button", { name: /Gerar código/ }));

    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("com código gerado: mostra o código, o email e a validade formatada (pt-BR)", () => {
    mockRuntime("cloud");
    mockTenant({ isCompanyAdmin: true });
    mockForm({
      result: { code: "EFB1.abc.def", email: "funcionario@empresa.com", expiresAt: "2026-10-01T12:00:00.000Z" },
    });

    render(<BootstrapCodesPage />);

    expect(screen.getByText("EFB1.abc.def")).toBeInTheDocument();
    expect(screen.getByText("funcionario@empresa.com")).toBeInTheDocument();
    // Regex escopada com "·" para não colidir com a dica estática "...e expira em 48 horas."
    // que fica sempre visível no card de geração, acima deste.
    expect(screen.getByText(/· expira em/)).toBeInTheDocument();
  });

  it("sem expiresAt: não mostra o trecho '· expira em'", () => {
    mockRuntime("cloud");
    mockTenant({ isCompanyAdmin: true });
    mockForm({ result: { code: "EFB1.abc.def", email: "funcionario@empresa.com", expiresAt: "" } });

    render(<BootstrapCodesPage />);

    expect(screen.queryByText(/· expira em/)).not.toBeInTheDocument();
  });

  it("clique em 'Copiar' chama copy()", () => {
    mockRuntime("cloud");
    mockTenant({ isCompanyAdmin: true });
    const copy = vi.fn();
    mockForm({
      result: { code: "EFB1.abc.def", email: "funcionario@empresa.com", expiresAt: "" },
      copy,
    });

    render(<BootstrapCodesPage />);
    fireEvent.click(screen.getByRole("button", { name: /Copiar/ }));

    expect(copy).toHaveBeenCalledTimes(1);
  });

  it("copiado: botão mostra 'Copiado'", () => {
    mockRuntime("cloud");
    mockTenant({ isCompanyAdmin: true });
    mockForm({
      result: { code: "EFB1.abc.def", email: "funcionario@empresa.com", expiresAt: "" },
      copied: true,
    });

    render(<BootstrapCodesPage />);

    expect(screen.getByRole("button", { name: /Copiado/ })).toBeInTheDocument();
  });
});
