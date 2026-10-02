import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";
import { Toaster } from "@/shared/ui/primitives/toaster";

vi.mock("@/shared/tenant/use-required-tenant", () => ({
  useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }),
}));

const { PixnopdvStoreCredentialsCard } = await import("./PixnopdvStoreCredentialsCard");

const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" };
const cloud: RuntimeInfo = { backend: "cloud", apiDisplayOrigin: "api.exemplo.com", adminPlatformUrl: "https://b" };

function renderCard(runtime: RuntimeInfo = lan, props: { embedInPage?: boolean } = {}) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={runtime}>
        <PixnopdvStoreCredentialsCard {...props} />
        <Toaster />
      </RuntimeProvider>
    </QueryClientProvider>,
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

const EMPTY_VIEW = {
  store_id: "s1",
  environment: "producao",
  api_base_url: null,
  basic_user: null,
  basic_token_set: false,
  secret_key_set: false,
  insecure_tls: false,
  enabled: true,
  updated_at: null,
};

const FILLED_VIEW = {
  store_id: "s1",
  environment: "producao",
  api_base_url: "https://api.exemplo.com/v1",
  basic_user: "operador",
  basic_token_set: true,
  secret_key_set: true,
  insecure_tls: false,
  enabled: true,
  updated_at: "2026-01-05T10:00:00Z",
};

afterEach(() => vi.restoreAllMocks());

describe("PixnopdvStoreCredentialsCard — estado carregando", () => {
  it("mostra 'A carregar…' antes da resposta", () => {
    mockFetch({ "GET /api/v1/pixnopdv-store-credentials": { status: 200, body: { data: EMPTY_VIEW } } });
    renderCard();
    expect(screen.getByText("A carregar…")).toBeInTheDocument();
  });
});

describe("PixnopdvStoreCredentialsCard — backend cloud grava (paridade com o legado em produção)", () => {
  // No legado, `writable` inclui `isCloudSupabaseMode()`, que devolve `true` POR HOSTNAME
  // (`*.easysoftcloud.com.br`, `LEGACY/src/lib/cloud-mode.ts#isCloudHostname`) antes de olhar
  // qualquer flag — em produção na nuvem o cartão é gravável e salva por `PUT
  // /v1/pixnopdv-store-credentials`. Ver fase-4-revisao-final.md, C1.
  it("mostra 'Sem credenciais de produção para esta loja' no cloud quando não há registro", async () => {
    mockFetch({ "GET /api/v1/pixnopdv-store-credentials": { status: 200, body: { data: null } } });
    renderCard(cloud);
    expect(await screen.findByText("Sem credenciais de produção para esta loja")).toBeInTheDocument();
    expect(screen.queryByText(/Neste ambiente não é possível editar credenciais da loja/)).not.toBeInTheDocument();
  });

  it("mantém os campos editáveis e grava por PUT no cloud", async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch({
      "GET /api/v1/pixnopdv-store-credentials": { status: 200, body: { data: FILLED_VIEW } },
      "PUT /api/v1/pixnopdv-store-credentials": { status: 200, body: { ok: true, data: FILLED_VIEW } },
    });
    renderCard(cloud);
    await waitFor(() => expect(screen.getByDisplayValue("https://api.exemplo.com/v1")).toBeInTheDocument());
    expect(screen.getByLabelText(/URL base da API/)).not.toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Guardar credenciais" }));
    await waitFor(() =>
      expect(fetchSpy.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === "PUT")).toBe(true),
    );
    expect(await screen.findByText("Credenciais PIXnoPDV guardadas")).toBeInTheDocument();
  });

  it("não mostra o aviso 'Sem credenciais' no backend lan", async () => {
    mockFetch({ "GET /api/v1/pixnopdv-store-credentials": { status: 200, body: { data: null } } });
    renderCard(lan);
    await waitFor(() => expect(screen.queryByText("A carregar…")).not.toBeInTheDocument());
    expect(screen.queryByText("Sem credenciais de produção para esta loja")).not.toBeInTheDocument();
    expect(screen.queryByText(/Neste ambiente não é possível editar credenciais da loja/)).not.toBeInTheDocument();
  });
});

describe("PixnopdvStoreCredentialsCard — estado de erro", () => {
  it("mostra 'Falha ao carregar' com a mensagem da API", async () => {
    mockFetch({
      "GET /api/v1/pixnopdv-store-credentials": {
        status: 500,
        body: { code: "database_error", message: "Falha ao consultar o banco." },
      },
    });
    renderCard();
    await waitFor(() => expect(screen.getByText("Falha ao carregar")).toBeInTheDocument());
    expect(screen.getByText("Falha ao consultar o banco.")).toBeInTheDocument();
  });
});

describe("PixnopdvStoreCredentialsCard — com dados", () => {
  it("preenche os campos com os dados carregados e mostra os textos de segredo guardado", async () => {
    mockFetch({ "GET /api/v1/pixnopdv-store-credentials": { status: 200, body: { data: FILLED_VIEW } } });
    renderCard();

    await waitFor(() => expect(screen.getByDisplayValue("https://api.exemplo.com/v1")).toBeInTheDocument());
    expect(screen.getByDisplayValue("operador")).toBeInTheDocument();
    expect(screen.getAllByText("Valor guardado — deixe vazio para manter")).toHaveLength(2);
    expect(screen.getByText(/Última atualização:/)).toBeInTheDocument();
  });

  it("cabeçalho aparece só quando embedInPage é false", async () => {
    mockFetch({ "GET /api/v1/pixnopdv-store-credentials": { status: 200, body: { data: EMPTY_VIEW } } });
    renderCard(lan, { embedInPage: true });
    await waitFor(() => expect(screen.queryByText("A carregar…")).not.toBeInTheDocument());
    expect(screen.queryByText("PIXnoPDV — credenciais da loja (produção)")).not.toBeInTheDocument();
  });

  it("Guardar credenciais envia PUT com o payload e mostra toast de sucesso", async () => {
    const user = userEvent.setup();
    const fetchSpy = mockFetch({
      "GET /api/v1/pixnopdv-store-credentials": { status: 200, body: { data: EMPTY_VIEW } },
      "PUT /api/v1/pixnopdv-store-credentials": { status: 200, body: { ok: true, data: FILLED_VIEW } },
    });
    renderCard();

    await waitFor(() => expect(screen.getByLabelText(/URL base da API/)).toBeInTheDocument());
    await user.type(screen.getByLabelText(/URL base da API/), "https://api.exemplo.com/v1");
    await user.click(screen.getByRole("button", { name: "Guardar credenciais" }));

    await waitFor(() => {
      const putCall = fetchSpy.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PUT");
      expect(putCall).toBeDefined();
    });
    const putCall = fetchSpy.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "PUT")!;
    const body = JSON.parse(String((putCall[1] as RequestInit).body));
    expect(body).toMatchObject({ api_base_url: "https://api.exemplo.com/v1", enabled: true, insecure_tls: false });
    expect(await screen.findByText("Credenciais PIXnoPDV guardadas")).toBeInTheDocument();
  });

  it("Limpar token Basic marca para apagar e desabilita o campo", async () => {
    const user = userEvent.setup();
    mockFetch({ "GET /api/v1/pixnopdv-store-credentials": { status: 200, body: { data: FILLED_VIEW } } });
    renderCard();

    await waitFor(() => expect(screen.getByDisplayValue("operador")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Limpar token Basic" }));

    expect(screen.getByLabelText(/Token Basic/)).toBeDisabled();
  });
});

describe("PixnopdvStoreCredentialsCard — backend lan permanece gravável", () => {
  it("mantém os campos editáveis e o botão Guardar habilitado no backend lan", async () => {
    mockFetch({ "GET /api/v1/pixnopdv-store-credentials": { status: 200, body: { data: FILLED_VIEW } } });
    renderCard(lan);

    await waitFor(() => expect(screen.getByDisplayValue("https://api.exemplo.com/v1")).toBeInTheDocument());
    expect(screen.getByLabelText(/URL base da API/)).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar credenciais" })).not.toBeDisabled();
  });
});
