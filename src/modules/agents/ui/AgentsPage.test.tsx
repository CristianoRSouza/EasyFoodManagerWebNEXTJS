import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/shared/ui/primitives/toaster";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";

const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "127.0.0.1:4999", adminPlatformUrl: "https://b" };
const cloud: RuntimeInfo = { backend: "cloud", apiDisplayOrigin: "api.exemplo.com", adminPlatformUrl: "https://b" };

vi.mock("@/shared/tenant/use-required-tenant", () => ({
  useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }),
}));

const { AgentsPage } = await import("./AgentsPage");

function renderPage(runtime: RuntimeInfo = lan) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <RuntimeProvider value={runtime}>
      <QueryClientProvider client={queryClient}>
        <AgentsPage />
        <Toaster />
      </QueryClientProvider>
    </RuntimeProvider>,
  );
}

function mockFetch(routes: Record<string, { status: number; body: unknown }>) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const path = url.split("?")[0] ?? url;
    const key = `${(init?.method as string | undefined) ?? "GET"} ${path}`;
    const match = routes[key] ?? routes[path];
    if (!match) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    return new Response(JSON.stringify(match.body), { status: match.status });
  });
}

const AGENT_ROW = {
  id: "agent-1",
  agent_name: "NFCe-SRV-MATRIZ",
  is_active: true,
  install_path: null,
  api_rate_limit: 100,
  log_level: "info",
  sefaz_timeout_ms: 30000,
  retry_max_attempts: 3,
  retry_backoff_ms: 1000,
  contingency_enabled: false,
  contingency_reason: null,
  contingency_auto_transmit: true,
  contingency_worker_enabled: true,
  contingency_worker_interval_ms: 0,
  contingency_substitution_worker_enabled: true,
  contingency_substitution_worker_interval_ms: 0,
  contingency_substitution_xjust: null,
  contingency_sla_warn_hours: 0,
  contingency_sla_block_hours: 0,
  sync_service_enabled: true,
  sync_service_url: "http://localhost:3000",
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-01-15T08:30:00Z",
};

afterEach(() => vi.restoreAllMocks());

describe("AgentsPage — estado carregando", () => {
  it("mostra 'Carregando…' antes da resposta", () => {
    mockFetch({ "GET /api/v1/service-agents": { status: 200, body: { data: [] } } });
    renderPage();
    expect(screen.getByText("Carregando…")).toBeInTheDocument();
  });
});

describe("AgentsPage — estado vazio", () => {
  it("mostra 'Nenhum agente cadastrado' quando a lista vem vazia", async () => {
    mockFetch({ "GET /api/v1/service-agents": { status: 200, body: { data: [] } } });
    renderPage();
    await waitFor(() => expect(screen.getByText("Nenhum agente cadastrado")).toBeInTheDocument());
  });
});

describe("AgentsPage — estado de erro", () => {
  it("sem tratamento próprio: falha na carga cai no mesmo vazio do legado", async () => {
    mockFetch({ "GET /api/v1/service-agents": { status: 500, body: { code: "database_error", message: "Falha ao consultar o banco." } } });
    renderPage();
    await waitFor(() => expect(screen.queryByText("Carregando…")).not.toBeInTheDocument());
    expect(screen.getByText("Nenhum agente cadastrado")).toBeInTheDocument();
  });
});

describe("AgentsPage — com dados", () => {
  it("mostra o agente, os cartões-resumo e os detalhes do agente", async () => {
    mockFetch({ "GET /api/v1/service-agents": { status: 200, body: { data: [AGENT_ROW] } } });
    renderPage();

    await waitFor(() => expect(screen.getByText("NFCe-SRV-MATRIZ")).toBeInTheDocument());
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("30.0s")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:3000")).toBeInTheDocument();
    // Cartões-resumo
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("Ativos")).toBeInTheDocument();
    expect(screen.getByText("Em Contingência")).toBeInTheDocument();
  });

  it("alterna o status pelo switch e envia PATCH /service-agents/:id/active", async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch({
      "GET /api/v1/service-agents": { status: 200, body: { data: [AGENT_ROW] } },
      "PATCH /api/v1/service-agents/agent-1/active": { status: 200, body: { ok: true } },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText("NFCe-SRV-MATRIZ")).toBeInTheDocument());
    await user.click(screen.getByRole("switch", { name: "Desativar NFCe-SRV-MATRIZ" }));

    await waitFor(() => {
      const patchCall = fetchSpy.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PATCH");
      expect(patchCall).toBeDefined();
    });
    const patchCall = fetchSpy.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PATCH")!;
    expect(String(patchCall[0])).toBe("/api/v1/service-agents/agent-1/active");
    expect(JSON.parse(String((patchCall[1] as RequestInit).body))).toEqual({ is_active: false });
    expect(await screen.findByText("NFCe-SRV-MATRIZ desativado")).toBeInTheDocument();
  });

  it("abre o formulário de edição pelo botão Editar, preenchido com os dados do agente", async () => {
    const user = userEvent.setup();
    mockFetch({ "GET /api/v1/service-agents": { status: 200, body: { data: [AGENT_ROW] } } });
    renderPage();

    await waitFor(() => expect(screen.getByText("NFCe-SRV-MATRIZ")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Editar" }));

    expect(await screen.findByText("Editar Agente")).toBeInTheDocument();
    expect(screen.getByDisplayValue("NFCe-SRV-MATRIZ")).toBeInTheDocument();
    expect(screen.getByDisplayValue("NFCe-SRV-MATRIZ")).toBeDisabled();
  });

  it("abre o cadastro de novo agente pelo botão Novo Agente", async () => {
    const user = userEvent.setup();
    mockFetch({ "GET /api/v1/service-agents": { status: 200, body: { data: [AGENT_ROW] } } });
    renderPage();

    await waitFor(() => expect(screen.getByText("NFCe-SRV-MATRIZ")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Novo Agente" }));

    expect(await screen.findByText("Preencha os dados para cadastrar um novo agente de serviço")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("NFCe-SRV-MATRIZ")).not.toBeDisabled();
  });

  it("abre o histórico de alterações pelo botão Histórico", async () => {
    const user = userEvent.setup();
    mockFetch({
      "GET /api/v1/service-agents": { status: 200, body: { data: [AGENT_ROW] } },
      "GET /api/v1/service-agents/agent-1/audit-logs": {
        status: 200,
        body: {
          data: [
            { id: "log-1", agent_config_id: "agent-1", action: "created", changed_fields: ["agent_name"], previous_values: {}, new_values: { agent_name: "NFCe-SRV-MATRIZ" }, performed_by: "admin@local.dev", created_at: "2026-01-01T10:00:00Z" },
          ],
        },
      },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText("NFCe-SRV-MATRIZ")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Histórico" }));

    expect(await screen.findByText("Histórico de Alterações")).toBeInTheDocument();
    expect(await screen.findByText("Criado")).toBeInTheDocument();
  });
});

describe("AgentsPage — cloud: `ok: false` num 2xx (C3)", () => {
  it("mostra 'Erro ao alterar status' em vez do toast de sucesso", async () => {
    const user = userEvent.setup();
    mockFetch({
      "GET /api/v1/service-agents": { status: 200, body: { data: [AGENT_ROW] } },
      "PATCH /api/v1/service-agents/agent-1/active": { status: 200, body: { ok: false } },
    });
    renderPage(cloud);

    await waitFor(() => expect(screen.getByText("NFCe-SRV-MATRIZ")).toBeInTheDocument());
    await user.click(screen.getByRole("switch", { name: "Desativar NFCe-SRV-MATRIZ" }));

    expect(await screen.findByText("Erro ao alterar status")).toBeInTheDocument();
    expect(screen.queryByText("NFCe-SRV-MATRIZ desativado")).not.toBeInTheDocument();
  });
});

describe("AgentsPage — falha ao salvar (Menor 7)", () => {
  it("mostra 'Erro ao salvar', mantém o diálogo aberto e não deixa rejeição sem tratamento", async () => {
    const user = userEvent.setup();
    mockFetch({
      "GET /api/v1/service-agents": { status: 200, body: { data: [AGENT_ROW] } },
      "PATCH /api/v1/service-agents/agent-1": { status: 500, body: { code: "database_error", message: "Falha ao gravar no banco." } },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText("NFCe-SRV-MATRIZ")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Editar" }));
    await screen.findByText("Editar Agente");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByText("Erro ao salvar")).toBeInTheDocument();
    expect(screen.getByText("Editar Agente")).toBeInTheDocument();
  });
});
