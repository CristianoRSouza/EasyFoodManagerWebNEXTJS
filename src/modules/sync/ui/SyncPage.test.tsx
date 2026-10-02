import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider } from "@/shared/runtime/runtime-context";
import * as apiClient from "@/shared/http/api-client";

vi.mock("@/shared/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/shared/http/api-client")>("@/shared/http/api-client");
  return { ...actual, apiRequest: vi.fn() };
});

const tenant = { selection: { companyId: "company-1", storeId: "store-1" } };
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: () => tenant }));

const mockToast = vi.fn();
vi.mock("@/shared/ui/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));

const { SyncPage } = await import("./SyncPage");

const request = vi.mocked(apiClient.apiRequest);

function renderPage(backend: "lan" | "cloud" = "lan") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RuntimeProvider value={{ backend, apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://admin.example" }}>
        <SyncPage />
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

const LOGS = [
  { id: "l1", direction: "fb_to_pg", table_name: "orders", records_affected: 0, record_id: null, status: "error", error_message: "timeout ao conectar no Firebird", created_at: "2024-01-01T08:03:00Z" },
  { id: "l2", direction: "pg_to_fb", table_name: "transactions", records_affected: 3, record_id: null, status: "ok", error_message: null, created_at: "2024-01-01T07:58:00Z" },
  { id: "l3", direction: "fb_to_pg", table_name: "products", records_affected: 5, record_id: null, status: "success", error_message: null, created_at: "2024-01-01T07:50:00Z" },
];

/** Resposta da API por caminho — o mesmo formato de `easyfoodmanagerAPI/src/routes/v1/sync*.ts`. */
function api(path: string): unknown {
  if (path.startsWith("/sync/logs")) return { data: LOGS };
  if (path.endsWith("/summary")) {
    return { data: { pending_novos: 4, pending_em_retry: 1, applied_total: 120, dispatched_total: 77, failed_terminal: 2, total: 127 } };
  }
  if (path.startsWith("/sync/inbox/recent-all")) {
    return {
      data: [
        {
          event_id: "ev-1",
          entity_name: "orders",
          entity_id: "o-1",
          op: "UPDATE",
          apply_status: "failed",
          retry_count: 3,
          applied_at: null,
          received_at: "2024-01-01T08:00:00Z",
          apply_error: "violação de chave",
          payload: { id: "o-1" },
        },
      ],
    };
  }
  if (path === "/sync/inbox/reset-to-pending") return { data: { updated: 1, event_id: "ev-1" } };
  return { data: [] };
}

function paths(): string[] {
  return request.mock.calls.map(([path]) => path);
}

function openTab(name: RegExp) {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

beforeEach(() => {
  request.mockReset();
  mockToast.mockReset();
});

describe("SyncPage — loja", () => {
  it("carregando: mostra o texto do legado enquanto o log não chega", () => {
    request.mockImplementation(() => new Promise(() => undefined));
    renderPage();
    expect(screen.getByText("Carregando monitor de sincronização...")).toBeInTheDocument();
  });

  it("vazio: sem linhas no log mostra 'Nenhum registro', KPIs zerados e página 1 / 1", async () => {
    request.mockResolvedValue({ data: [] });
    renderPage();

    expect(await screen.findByText("0 registros (após filtros)")).toBeInTheDocument();
    expect(screen.getByText("Nenhum registro")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(screen.getByText("Sucesso (filtrado)").previousSibling).toHaveTextContent("0");
  });

  it("erro na carga inicial: a tela abre com o log vazio, sem card de erro (como o legado)", async () => {
    request.mockRejectedValue(new Error("database_error"));
    renderPage();

    expect(await screen.findByText("0 registros (após filtros)")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Monitor de Sincronização" })).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("com dados: KPIs, linhas, mensagem de erro e o link do espelho; só o log é pedido", async () => {
    request.mockImplementation(async (path: string) => api(path));
    renderPage();

    expect(await screen.findByText("3 registros (após filtros)")).toBeInTheDocument();
    expect(screen.getByText("Sucesso (filtrado)").previousSibling).toHaveTextContent("2");
    expect(screen.getByText("Erros (filtrado)").previousSibling).toHaveTextContent("1");
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("timeout ao conectar no Firebird")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver espelho FB↔PG/ })).toHaveAttribute("href", "/sync/espelho");
    expect(paths()).toEqual(["/sync/logs?limit=500"]);
    expect(request.mock.calls[0]?.[1]).toEqual({ tenant: { companyId: "company-1", storeId: "store-1" } });
  });

  it("Atualizar dados: recarrega o log e mostra o toast do legado", async () => {
    request.mockImplementation(async (path: string) => api(path));
    renderPage();
    await screen.findByText("3 registros (após filtros)");

    fireEvent.click(screen.getByRole("button", { name: /Atualizar dados/ }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        title: "Dados atualizados",
        description: "Log (FB→PG) e painéis Inbox/Outbox (PG↔SB) foram recarregados.",
      }),
    );
    expect(paths().filter((p) => p.startsWith("/sync/logs"))).toHaveLength(2);
  });

  it("Atualizar dados com falha: toast destrutivo e o log anterior continua na tela", async () => {
    request.mockImplementation(async (path: string) => api(path));
    renderPage();
    await screen.findByText("3 registros (após filtros)");
    request.mockRejectedValue(new Error("offline"));

    fireEvent.click(screen.getByRole("button", { name: /Atualizar dados/ }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith({
        title: "Falha ao atualizar",
        description: "Não foi possível recarregar o monitor de sincronização.",
        variant: "destructive",
      }),
    );
    expect(screen.getByText("3 registros (após filtros)")).toBeInTheDocument();
  });

  it("aba Inbox: painel carrega de /sync/inbox/* e permite reenfileirar pela API da loja", async () => {
    request.mockImplementation(async (path: string) => api(path));
    renderPage();
    await screen.findByText("3 registros (após filtros)");

    openTab(/Inbox/);

    expect(await screen.findByText("Últimos eventos do inbox")).toBeInTheDocument();
    expect(paths()).toEqual(
      expect.arrayContaining(["/sync/inbox/summary", "/sync/inbox/apply-rate", "/sync/inbox/recent-all?limit=50&offset=0"]),
    );

    fireEvent.click(await screen.findByRole("button", { name: "Reenfileirar evento para reprocessar" }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith("/sync/inbox/reset-to-pending", {
        method: "POST",
        body: { event_id: "ev-1" },
        tenant: { companyId: "company-1", storeId: "store-1" },
      }),
    );
  });

  it("aba Outbox: painel de /sync/outbox/*, sem botão de reenfileirar", async () => {
    request.mockImplementation(async (path: string) => api(path));
    renderPage();
    await screen.findByText("3 registros (após filtros)");

    openTab(/Outbox/);

    expect(await screen.findByText("Últimos eventos do outbox")).toBeInTheDocument();
    expect(paths()).toEqual(expect.arrayContaining(["/sync/outbox/summary", "/sync/outbox/dispatch-rate"]));
    expect(screen.queryByRole("button", { name: "Reenfileirar evento para reprocessar" })).not.toBeInTheDocument();
  });
});

describe("SyncPage — nuvem", () => {
  it("abre o monitor da nuvem na aba Inbox, sem aba Log e sem pedir /sync/logs", async () => {
    request.mockImplementation(async (path: string) => api(path));
    renderPage("cloud");

    expect(screen.getByRole("tab", { name: /Inbox \(PG → SB\)/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Outbox \(SB → PG\)/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Log/ })).not.toBeInTheDocument();
    expect(await screen.findByText("Últimos eventos do inbox")).toBeInTheDocument();
    expect(paths()).toContain("/sync/inbox/summary");
    expect(paths().some((p) => p.startsWith("/sync/logs"))).toBe(false);
  });

  it("nuvem: nunca oferece reenfileirar, mesmo com evento em falha", async () => {
    request.mockImplementation(async (path: string) => api(path));
    renderPage("cloud");

    await screen.findByText("Últimos eventos do inbox");
    await screen.findAllByText("orders");
    expect(screen.queryByRole("button", { name: "Reenfileirar evento para reprocessar" })).not.toBeInTheDocument();
  });

  it("nuvem com erro no resumo: card 'Erro ao carregar dados' do painel", async () => {
    request.mockImplementation(async (path: string) => {
      if (path.endsWith("/summary")) throw new Error("forbidden");
      return api(path);
    });
    renderPage("cloud");

    expect(await screen.findByText("Erro ao carregar dados")).toBeInTheDocument();
  });
});
