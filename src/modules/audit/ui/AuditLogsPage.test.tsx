import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";
import * as tenantModule from "@/shared/tenant/tenant-context";
import type { TenantState } from "@/shared/tenant/tenant-context";

vi.mock("@/shared/tenant/use-required-tenant", () => ({
  useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }),
}));

const { AuditLogsPage } = await import("./AuditLogsPage");

const baseTenant: TenantState = {
  loading: false,
  companies: [],
  storesByCompany: {},
  allStoresLoaded: false,
  loadAllStores: vi.fn(),
  selection: { companyId: "c1", storeId: "s1" },
  selectedCompany: null,
  selectedStore: null,
  needsSelection: false,
  isSystemAdmin: true,
  isCompanyAdmin: false,
  select: vi.fn(),
  refresh: vi.fn(),
};

function runtime(backend: RuntimeInfo["backend"]): RuntimeInfo {
  return { backend, apiDisplayOrigin: "api", adminPlatformUrl: "https://admin" };
}

function renderPage(backend: RuntimeInfo["backend"] = "cloud", tenant: Partial<TenantState> = {}) {
  vi.spyOn(tenantModule, "useTenant").mockReturnValue({ ...baseTenant, ...tenant });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <RuntimeProvider value={runtime(backend)}>
      <QueryClientProvider client={queryClient}>
        <AuditLogsPage />
      </QueryClientProvider>
    </RuntimeProvider>,
  );
}

function mockFetch(response: { status: number; body: unknown } | "pending") {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    if (response === "pending") return new Promise<Response>(() => {});
    return new Response(JSON.stringify(response.body), { status: response.status });
  });
}

function recentIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

const ROWS = [
  {
    id: "l1",
    source: "totem",
    entity_id: "t1",
    entity_name: "TOTEM-01",
    action: "updated",
    changed_fields: ["totem_name", "is_active"],
    previous_values: { totem_name: "TOTEM-A", is_active: true },
    new_values: { totem_name: "TOTEM-01", is_active: false },
    performed_by: "maria@empresa.com",
    created_at: recentIso(1),
  },
  {
    id: "l2",
    source: "agent",
    entity_id: "a1",
    entity_name: "NFCe-SRV",
    action: "created",
    changed_fields: ["agent_name"],
    previous_values: {},
    new_values: { agent_name: "NFCe-SRV" },
    performed_by: "joao@empresa.com",
    created_at: recentIso(2),
  },
];

afterEach(() => vi.restoreAllMocks());

describe("AuditLogsPage — gates", () => {
  it("modo loja: acesso restrito, como o legado (useIsSystemAdmin = false fora da nuvem), sem chamar a API", () => {
    const fetchSpy = mockFetch({ status: 200, body: { data: [] } });
    renderPage("lan", { isSystemAdmin: true });
    expect(screen.getByText("Acesso restrito")).toBeInTheDocument();
    expect(screen.queryByText("Indisponível nesta instalação")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("nuvem sem admin do sistema: acesso restrito, sem chamar a API", () => {
    const fetchSpy = mockFetch({ status: 200, body: { data: [] } });
    renderPage("cloud", { isSystemAdmin: false });
    expect(screen.getByText("Acesso restrito")).toBeInTheDocument();
    expect(screen.getByText("Esta página está disponível apenas para administradores do sistema.")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("AuditLogsPage — dados", () => {
  it("carregando: esqueleto da linha do tempo", () => {
    mockFetch("pending");
    const { container } = renderPage();
    expect(screen.getByRole("heading", { name: "Logs de Auditoria" })).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("vazio", async () => {
    mockFetch({ status: 200, body: { data: [] } });
    renderPage();
    expect(await screen.findByText("Nenhum registro de auditoria")).toBeInTheDocument();
    expect(screen.getByText("— 0 de 0 registro(s)")).toBeInTheDocument();
  });

  it("erro", async () => {
    mockFetch({ status: 500, body: { code: "database_error", message: "falhou" } });
    renderPage();
    expect(await screen.findByText("Não foi possível carregar os logs de auditoria.")).toBeInTheDocument();
  });

  it("com dados: linha do tempo com origem, ação, rótulos e antes → depois", async () => {
    const fetchSpy = mockFetch({ status: 200, body: { data: ROWS } });
    renderPage();
    expect(await screen.findByText("— 2 de 2 registro(s)")).toBeInTheDocument();
    expect(screen.getAllByText("TOTEM-01")).toHaveLength(2); // nome da entidade + valor novo
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe("/api/v1/audit-logs?limit=500");
    expect(screen.getByText("Totem")).toBeInTheDocument();
    expect(screen.getByText("Agente")).toBeInTheDocument();
    expect(screen.getByText("Editado")).toBeInTheDocument();
    expect(screen.getByText("Criado")).toBeInTheDocument();
    expect(screen.getByText("Nome:")).toBeInTheDocument();
    expect(screen.getByText("TOTEM-A")).toHaveClass("line-through");
    expect(screen.getByText("Sim")).toBeInTheDocument();
    expect(screen.getByText("Não")).toBeInTheDocument();
  });

  it("filtro por usuário sem resultado mostra a mensagem de filtros e o botão Limpar", async () => {
    mockFetch({ status: 200, body: { data: ROWS } });
    renderPage();
    await screen.findByText("— 2 de 2 registro(s)");
    await userEvent.type(screen.getByPlaceholderText("Filtrar por usuário"), "ninguem");
    expect(screen.getByText("Nenhum registro para os filtros selecionados")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpar" }));
    await waitFor(() => expect(screen.getByText("— 2 de 2 registro(s)")).toBeInTheDocument());
  });
});
