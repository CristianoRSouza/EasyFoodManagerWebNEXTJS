import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";

vi.mock("@/shared/tenant/use-required-tenant", () => ({
  useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }),
}));

const { ProductsPage } = await import("./ProductsPage");

const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" };

function renderPage(runtime: RuntimeInfo = lan) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={runtime}>
        <ProductsPage />
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

function mockFetch(routes: Record<string, { status: number; body: unknown }>) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const path = url.split("?")[0] ?? url;
    const match = routes[path];
    if (!match) return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    return new Response(JSON.stringify(match.body), { status: match.status });
  });
}

afterEach(() => vi.restoreAllMocks());

describe("ProductsPage", () => {
  it("mostra o estado de carregamento antes da resposta chegar", async () => {
    let resolveFetch: (r: Response) => void = () => undefined;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise((resolve) => (resolveFetch = resolve)));

    renderPage();
    expect(screen.getByText("Carregando produtos...")).toBeInTheDocument();

    resolveFetch(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    await waitFor(() => expect(screen.queryByText("Carregando produtos...")).toBeNull());
  });

  it("estado vazio: nenhuma resposta de produto", async () => {
    mockFetch({ "/api/v1/products": { status: 200, body: { data: [] } } });
    renderPage();
    await waitFor(() => expect(screen.getByText("Produtos")).toBeInTheDocument());
    expect(screen.getAllByText("Nenhum produto encontrado").length).toBeGreaterThan(0);
    expect(screen.getByText("0 produtos encontrados")).toBeInTheDocument();
  });

  it("estado de erro: a API falha", async () => {
    mockFetch({ "/api/v1/products": { status: 500, body: { message: "database_error" } } });
    renderPage();
    await waitFor(() => expect(screen.getByText("Não foi possível carregar os produtos.")).toBeInTheDocument());
  });

  it("estado com dados: lista produtos, preço formatado e contagem no cabeçalho", async () => {
    mockFetch({
      "/api/v1/products": {
        status: 200,
        body: {
          data: [
            { id: "p1", description: "Coxinha", barcode: "789", sale_price: "8.5", stock_quantity: 3, unit_name: "UN", image_url: null, is_active: true },
            { id: "p2", description: "Refrigerante", barcode: "111", sale_price: "5", stock_quantity: 0, unit_name: null, image_url: null, is_active: false },
          ],
        },
      },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText("2 produtos encontrados")).toBeInTheDocument());
    expect(screen.getAllByText("Coxinha").length).toBeGreaterThan(0);
    expect(screen.getAllByText("R$ 8.50").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inativo").length).toBeGreaterThan(0);
  });

  it("refresh falhando mantém a lista visível (não vira a tela de erro cheia)", async () => {
    mockFetch({
      "/api/v1/products": {
        status: 200,
        body: { data: [{ id: "p1", description: "Coxinha", barcode: "789", sale_price: "8.5", stock_quantity: 3, unit_name: "UN", image_url: null, is_active: true }] },
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("1 produto encontrado")).toBeInTheDocument());

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ message: "fail" }), { status: 500 }));
    fireEvent.click(screen.getByRole("button", { name: /Atualizar dados/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: /Atualizar dados/ })).toBeEnabled());
    expect(screen.queryByText("Não foi possível carregar os produtos.")).toBeNull();
    expect(screen.getAllByText("Coxinha").length).toBeGreaterThan(0);
  });
});
