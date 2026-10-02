import { ApiProductRepository } from "./api-product-repository";
import type { ProductQuery } from "../domain/product";

const tenant = { companyId: "c1", storeId: "s1" };

const baseQuery: ProductQuery = {
  search: "",
  activeFilter: "all",
  stockFilter: "all",
  priceMin: null,
  priceMax: null,
  sortKey: "description",
  sortDirection: "asc",
  from: 0,
  to: 19,
};

function mockFetchOnce(body: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
}

afterEach(() => vi.restoreAllMocks());

describe("ApiProductRepository — nuvem (cloud)", () => {
  it("lista pela rota paginada do servidor, mapeando rows/total sem envelope {data}", async () => {
    const fetchSpy = mockFetchOnce({ rows: [{ id: "p1", description: "Coxinha", barcode: "789", sale_price: 8.5, stock_quantity: 1, unit_name: "UN", image_url: null, is_active: true }], total: 1 });
    const repo = new ApiProductRepository(tenant, "cloud");

    const page = await repo.listPage({ ...baseQuery, search: "cox", sortKey: "salePrice", sortDirection: "desc", from: 0, to: 19 });

    expect(page).toEqual({ items: [{ id: "p1", description: "Coxinha", barcode: "789", salePrice: 8.5, stockQuantity: 1, unitName: "UN", unitIsFractional: null, imageUrl: null, isActive: true }], total: 1 });
    const [url] = fetchSpy.mock.calls[0]!;
    const calledUrl = String(url);
    expect(calledUrl).toContain("/api/v1/products/paged");
    expect(calledUrl).toContain("search=cox");
    // sortKey do domínio ("salePrice") vira o nome da coluna ("sale_price") na querystring.
    expect(calledUrl).toContain("sortKey=sale_price");
    expect(calledUrl).toContain("sortDir=desc");
    expect(calledUrl).not.toContain("activeFilter"); // "all" é omitido
  });

  it("envia o tenant nos cabeçalhos", async () => {
    const fetchSpy = mockFetchOnce({ rows: [], total: 0 });
    await new ApiProductRepository(tenant, "cloud").listPage(baseQuery);
    const [, init] = fetchSpy.mock.calls[0]!;
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("x-company-id")).toBe("c1");
    expect(headers.get("x-store-id")).toBe("s1");
  });
});

describe("ApiProductRepository — loja (lan)", () => {
  it("lista o catálogo inteiro e pagina/filtra em memória (sem rota /products/paged)", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      description: `Produto ${String(i).padStart(2, "0")}`,
      barcode: String(i),
      sale_price: "10.00",
      stock_quantity: 1,
      unit_name: null,
      image_url: null,
      is_active: true,
    }));
    const fetchSpy = mockFetchOnce({ data: rows });
    const repo = new ApiProductRepository(tenant, "lan");

    const page = await repo.listPage({ ...baseQuery, from: 0, to: 19 });

    expect(page.items).toHaveLength(20);
    expect(page.total).toBe(25);
    const [url] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/products");
  });
});

describe("ApiProductRepository — dados fiscais (comuns aos dois backends)", () => {
  it("fiscal() desembrulha {data} e devolve null quando ausente", async () => {
    mockFetchOnce({ data: { product_id: "p1", ncm: "21069090" } });
    const withData = await new ApiProductRepository(tenant, "lan").fiscal("p1");
    expect(withData?.identification.ncm).toBe("21069090");

    mockFetchOnce({ data: null });
    const withoutData = await new ApiProductRepository(tenant, "cloud").fiscal("p2");
    expect(withoutData).toBeNull();
  });

  it("fiscalIbsCbs() manda classCode na query e desembrulha {data}", async () => {
    const fetchSpy = mockFetchOnce({ data: { taxClass: null, indicator: null } });
    const result = await new ApiProductRepository(tenant, "lan").fiscalIbsCbs("000001");
    expect(result).toEqual({ taxClass: null, indicator: null });
    const [url] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toBe("/api/v1/cbs/product-fiscal-ibscbs?classCode=000001");
  });
});
