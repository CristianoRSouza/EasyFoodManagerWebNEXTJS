import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";

vi.mock("@/shared/tenant/use-required-tenant", () => ({
  useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }),
}));

const { PixnopdvPage: Page } = await import("./PixnopdvPage");

const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" };

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={lan}>
        <Page />
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

afterEach(() => vi.restoreAllMocks());

describe("/pixnopdv — página fina sobre o cartão do módulo", () => {
  it("mostra o cabeçalho e delega os dados ao PixnopdvStoreCredentialsCard", async () => {
    mockFetch({
      "GET /api/v1/pixnopdv-store-credentials": {
        status: 200,
        body: { data: { store_id: "s1", environment: "producao", api_base_url: "https://api.exemplo.com/v1", basic_user: null, basic_token_set: false, secret_key_set: false, insecure_tls: false, enabled: true, updated_at: null } },
      },
    });

    renderPage();

    expect(screen.getByRole("heading", { name: "PIXnoPDV" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByDisplayValue("https://api.exemplo.com/v1")).toBeInTheDocument());
    // Sem cabeçalho próprio do cartão (a página já tem título) — `embedInPage`.
    expect(screen.queryByText("PIXnoPDV — credenciais da loja (produção)")).not.toBeInTheDocument();
  });

  it("o botão Atualizar dados dispara nova busca", async () => {
    const fetchSpy = mockFetch({
      "GET /api/v1/pixnopdv-store-credentials": { status: 200, body: { data: null } },
    });
    renderPage();

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    screen.getByRole("button", { name: /Atualizar dados/ }).click();
    await waitFor(() => expect(fetchSpy.mock.calls.length).toBeGreaterThan(1));
  });
});
