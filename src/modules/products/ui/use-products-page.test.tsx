import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";
import { PRODUCTS_PAGE_SIZE } from "../domain/product";

vi.mock("@/shared/tenant/use-required-tenant", () => ({
  useRequiredTenant: () => ({ companyId: "c1", storeId: "s1" }),
}));

const { useProductsPage } = await import("./use-products-page");

const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" };

/** Catálogo com uma página e meia: a loja devolve tudo e o Next pagina em memória. */
const CATALOG = Array.from({ length: PRODUCTS_PAGE_SIZE + 10 }, (_, index) => ({
  id: `p${index}`,
  description: `Produto ${String(index).padStart(2, "0")}`,
  barcode: String(1000 + index),
  sale_price: "1.00",
  stock_quantity: 1,
  unit_name: "UN",
  image_url: null,
  is_active: true,
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <RuntimeProvider value={lan}>{children}</RuntimeProvider>
    </QueryClientProvider>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("useProductsPage — Atualizar dados", () => {
  it("volta a lista para a 1ª página, sem repetir as páginas já roladas (igual ao legado)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response(JSON.stringify({ data: CATALOG }), { status: 200 }));
    const { result } = renderHook(() => useProductsPage(), { wrapper });

    await waitFor(() => expect(result.current.products).toHaveLength(PRODUCTS_PAGE_SIZE));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.products).toHaveLength(CATALOG.length));
    expect(result.current.hasMore).toBe(false);

    fetchSpy.mockClear();
    await act(async () => {
      await result.current.handleRefresh();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current.products).toHaveLength(PRODUCTS_PAGE_SIZE);
    expect(result.current.hasMore).toBe(true);
  });
});

describe("useProductsPage — isError só na 1ª carga (I4)", () => {
  it("refresh falhando mantém a lista visível, sem virar isError", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => new Response(JSON.stringify({ data: CATALOG.slice(0, 3) }), { status: 200 }),
    );
    const { result } = renderHook(() => useProductsPage(), { wrapper });

    await waitFor(() => expect(result.current.products).toHaveLength(3));
    expect(result.current.isError).toBe(false);

    vi.spyOn(globalThis, "fetch").mockImplementationOnce(
      async () => new Response(JSON.stringify({ message: "falhou" }), { status: 500 }),
    );
    await act(async () => {
      await result.current.handleRefresh();
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.products).toHaveLength(3);
  });
});
