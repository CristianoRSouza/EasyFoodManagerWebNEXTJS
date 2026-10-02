import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";

const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "127.0.0.1:4999", adminPlatformUrl: "" };
const cloud: RuntimeInfo = { backend: "cloud", apiDisplayOrigin: "api.exemplo.com", adminPlatformUrl: "" };

vi.mock("@/shared/tenant/use-required-tenant", () => ({
  useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }),
}));

const { SyncMirrorPage } = await import("./SyncMirrorPage");

function renderPage(runtime: RuntimeInfo = lan) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <RuntimeProvider value={runtime}>
      <QueryClientProvider client={queryClient}>
        <SyncMirrorPage />
      </QueryClientProvider>
    </RuntimeProvider>,
  );
}

type Routes = Record<string, { status: number; body: unknown }>;

/** `fetch` simulado por caminho (sem query string). Guarda as URLs pedidas. */
function mockFetch(routes: Routes) {
  const calls: string[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    calls.push(url);
    const match = routes[url.split("?")[0] ?? url];
    if (!match) return new Response(JSON.stringify({ data: null }), { status: 200 });
    return new Response(JSON.stringify(match.body), { status: match.status });
  });
  return { spy, calls };
}

const NOW = Date.now();
const ago = (s: number) => new Date(NOW - s * 1000).toISOString();

const DATA_ROUTES: Routes = {
  "/api/v1/sync/fbpg/health": {
    status: 200,
    body: {
      data: {
        ultimo_ping: ago(3),
        inicio_janela: ago(2400),
        segundos_desde_ping: 3,
        heartbeats_retidos: 480,
        ciclos_5min: 60,
        duracao_media_s: 0.612,
        duracao_max_s: 1.1,
      },
    },
  },
  "/api/v1/sync/fbpg/jobs": {
    status: 200,
    body: {
      data: [
        { direcao: "fb_to_pg", tabela: "products", linhas: 2, registros_afetados: 3, erros: 0, ultimo: ago(20) },
        { direcao: "fb_to_pg", tabela: "tabela_nova", linhas: 1, registros_afetados: 1, erros: 0, ultimo: ago(20) },
      ],
    },
  },
  "/api/v1/sync/fbpg/job-stats": { status: 200, body: { data: { disponivel: true, linhas: [] } } },
  "/api/v1/sync/fbpg/queues": {
    status: 200,
    body: {
      data: {
        limiar_travada_min: 10,
        itens: { total: 0, comandas: 0, mais_antigo: null },
        estornos: { total: 0, mais_antigo: null },
        fechamentos: { total: 1, mais_antigo: ago(900), travadas: 1, com_falha: 1, max_tentativas: 2 },
        fechamentos_detalhe: [{ barcode: "000789", pedido_em: ago(900), tentativas: 2, espera_s: 900 }],
      },
    },
  },
  "/api/v1/sync/fbpg/events": {
    status: 200,
    body: {
      data: [
        {
          id: "e1",
          created_at: ago(30),
          direcao: "pg_to_fb",
          tabela: "orders",
          registros_afetados: 0,
          record_id: null,
          status: "error",
          mensagem: "Fechamento adiado: comanda 000789 em uso no PDV",
        },
      ],
    },
  },
  "/api/v1/sync/fbpg/changes": {
    status: 200,
    body: {
      data: {
        disponivel: true,
        linhas: [
          {
            id: "m1",
            changed_at: ago(60),
            direcao: "fb_to_pg",
            entidade: "products",
            chave: "7891000100103",
            record_id: null,
            op: "update",
            rotulo: "Coca-Cola 350ml",
            campos: ["sale_price"],
            detalhe: { sale_price: { de: 6, para: 9 } },
          },
        ],
      },
    },
  },
};

afterEach(() => vi.restoreAllMocks());

describe("SyncMirrorPage — gate de instalação", () => {
  it("na nuvem mostra o cartão 'Disponível apenas na loja' e não chama a API", () => {
    const { spy } = mockFetch({});
    renderPage(cloud);
    expect(screen.getByRole("heading", { name: "Disponível apenas na loja" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Monitor de Sincronização/ })).toHaveAttribute("href", "/sync");
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("SyncMirrorPage — estados", () => {
  it("carregando: a tela já monta com os painéis vazios, como o legado (sem spinner)", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>(() => {}));
    renderPage();
    expect(screen.getByRole("heading", { name: "Espelho Firebird ↔ PostgreSQL" })).toBeInTheDocument();
    expect(screen.getByText("sem heartbeat recente")).toBeInTheDocument();
    expect(screen.getAllByText("quieto")).toHaveLength(10);
  });

  it("vazio: rollup indisponível explicado, filas vazias sem alarme", async () => {
    mockFetch({
      "/api/v1/sync/fbpg/jobs": { status: 200, body: { data: [] } },
      "/api/v1/sync/fbpg/job-stats": { status: 200, body: { data: { disponivel: false, linhas: [] } } },
      "/api/v1/sync/fbpg/queues": {
        status: 200,
        body: { data: { limiar_travada_min: 10, itens: null, estornos: null, fechamentos: null, fechamentos_detalhe: [] } },
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Nada esperando para entrar no Firebird.")).toBeInTheDocument());
    expect(screen.getByText("Inalterados indisponíveis nesta loja.")).toBeInTheDocument();
    expect(screen.getAllByText("quieto")).toHaveLength(10);
  });

  it("erro: a API falhando não derruba a tela (cada painel fica vazio)", async () => {
    const { calls } = mockFetch(
      Object.fromEntries(
        ["health", "jobs", "job-stats", "queues", "cycles", "changes", "alarms", "retention"].map((r) => [
          `/api/v1/sync/fbpg/${r}`,
          { status: 500, body: { code: "database_error", message: "falhou" } },
        ]),
      ),
    );
    renderPage();
    await waitFor(() => expect(calls.length).toBeGreaterThanOrEqual(8));
    expect(screen.getByText("sem heartbeat recente")).toBeInTheDocument();
    expect(screen.getByText("Inalterados indisponíveis nesta loja.")).toBeInTheDocument();
  });

  it("com dados: vida do serviço, jobs, fila travada e par fora do catálogo", async () => {
    const { calls } = mockFetch(DATA_ROUTES);
    renderPage();
    await waitFor(() => expect(screen.getByText(/serviço vivo/)).toBeInTheDocument());
    expect(screen.getByText(/há 3 s/)).toBeInTheDocument();
    expect(screen.getByText("ciclo 612 ms")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("1 comanda(s) paga(s) há mais de 10 min sem virar venda")).toBeInTheDocument(),
    );
    expect(screen.getByText("barcode 000789")).toBeInTheDocument();
    expect(screen.getByText("fb_to_pg/tabela_nova")).toBeInTheDocument();
    const products = screen.getByText("Produtos").closest("tr")!;
    expect(within(products).getByText("3")).toBeInTheDocument();

    expect(calls).toEqual(
      expect.arrayContaining([
        "/api/v1/sync/fbpg/health",
        "/api/v1/sync/fbpg/jobs?minutes=5",
        "/api/v1/sync/fbpg/job-stats?minutes=5",
        "/api/v1/sync/fbpg/queues",
        "/api/v1/sync/fbpg/cycles?limit=120",
        "/api/v1/sync/fbpg/changes?limit=200&offset=0",
        "/api/v1/sync/fbpg/alarms?hours=24",
        "/api/v1/sync/fbpg/retention",
      ]),
    );
    // Log do serviço só busca com a aba aberta; histórico longo só fora da faixa detalhada.
    expect(calls.some((c) => c.includes("/events"))).toBe(false);
    expect(calls.some((c) => c.includes("/cycle-history"))).toBe(false);
  });
});

describe("SyncMirrorPage — interação", () => {
  it("Log do serviço: busca a primeira página ao abrir a aba", async () => {
    const user = userEvent.setup();
    const { calls } = mockFetch(DATA_ROUTES);
    renderPage();
    await user.click(screen.getByRole("tab", { name: "Log do serviço" }));
    await waitFor(() =>
      expect(screen.getByText("Fechamento adiado: comanda 000789 em uso no PDV")).toBeInTheDocument(),
    );
    expect(calls).toContain("/api/v1/sync/fbpg/events?limit=100&offset=0");
  });

  it("Alterações: abre com a lista e mostra o de→para traduzido", async () => {
    const user = userEvent.setup();
    mockFetch(DATA_ROUTES);
    renderPage();
    await user.click(screen.getByRole("tab", { name: "Alterações" }));
    await waitFor(() => expect(screen.getByText("Coca-Cola 350ml")).toBeInTheDocument());
    expect(screen.getByText("Preço de venda")).toBeInTheDocument();
    expect(screen.getByText("1 alteração(ões) mais recentes · retenção de 30 dias")).toBeInTheDocument();
  });

  it("Pausar alterna para Retomar; Atualizar dados refaz as consultas", async () => {
    const user = userEvent.setup();
    const { calls } = mockFetch(DATA_ROUTES);
    renderPage();
    await waitFor(() => expect(screen.getByText(/serviço vivo/)).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Pausar" }));
    expect(screen.getByRole("button", { name: "Retomar" })).toBeInTheDocument();

    const before = calls.filter((c) => c === "/api/v1/sync/fbpg/health").length;
    await user.click(screen.getByRole("button", { name: "Atualizar dados" }));
    await waitFor(() =>
      expect(calls.filter((c) => c === "/api/v1/sync/fbpg/health").length).toBeGreaterThan(before),
    );
  });
});
