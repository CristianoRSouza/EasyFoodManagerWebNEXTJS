import { paginateProducts } from "./paginate-products";
import type { Product, ProductQuery } from "../domain/product";

function product(overrides: Partial<Product>): Product {
  return {
    id: "p1",
    description: "Coxinha",
    barcode: "789",
    salePrice: 8.5,
    stockQuantity: 10,
    unitName: "UN",
    unitIsFractional: null,
    imageUrl: null,
    isActive: true,
    ...overrides,
  };
}

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

describe("paginateProducts", () => {
  it("filtra por busca na descrição ou no código de barras (case-insensitive)", () => {
    const items = [product({ id: "1", description: "Coxinha", barcode: "111" }), product({ id: "2", description: "Refrigerante", barcode: "789" })];
    const result = paginateProducts(items, { ...baseQuery, search: "COXI" });
    expect(result.items.map((p) => p.id)).toEqual(["1"]);
    expect(result.total).toBe(1);

    const byBarcode = paginateProducts(items, { ...baseQuery, search: "789" });
    expect(byBarcode.items.map((p) => p.id)).toEqual(["2"]);
  });

  it("filtra por status ativo/inativo", () => {
    const items = [product({ id: "1", isActive: true }), product({ id: "2", isActive: false })];
    expect(paginateProducts(items, { ...baseQuery, activeFilter: "active" }).items.map((p) => p.id)).toEqual(["1"]);
    expect(paginateProducts(items, { ...baseQuery, activeFilter: "inactive" }).items.map((p) => p.id)).toEqual(["2"]);
  });

  it("filtra por estoque (em estoque = > 0, sem estoque = <= 0)", () => {
    const items = [product({ id: "1", stockQuantity: 5 }), product({ id: "2", stockQuantity: 0 })];
    expect(paginateProducts(items, { ...baseQuery, stockFilter: "in_stock" }).items.map((p) => p.id)).toEqual(["1"]);
    expect(paginateProducts(items, { ...baseQuery, stockFilter: "out_of_stock" }).items.map((p) => p.id)).toEqual(["2"]);
  });

  it("filtra por faixa de preço (limites inclusivos)", () => {
    const items = [product({ id: "1", salePrice: 5 }), product({ id: "2", salePrice: 10 }), product({ id: "3", salePrice: 20 })];
    const result = paginateProducts(items, { ...baseQuery, priceMin: 5, priceMax: 10 });
    expect(result.items.map((p) => p.id)).toEqual(["1", "2"]);
  });

  it("ordena por chave e direção pedidas", () => {
    const items = [product({ id: "1", salePrice: 20 }), product({ id: "2", salePrice: 5 }), product({ id: "3", salePrice: 10 })];
    const asc = paginateProducts(items, { ...baseQuery, sortKey: "salePrice", sortDirection: "asc" });
    expect(asc.items.map((p) => p.id)).toEqual(["2", "3", "1"]);
    const desc = paginateProducts(items, { ...baseQuery, sortKey: "salePrice", sortDirection: "desc" });
    expect(desc.items.map((p) => p.id)).toEqual(["1", "3", "2"]);
  });

  it("ordena por isActive colocando ativos primeiro em ordem asc", () => {
    const items = [product({ id: "1", isActive: false }), product({ id: "2", isActive: true })];
    const result = paginateProducts(items, { ...baseQuery, sortKey: "isActive", sortDirection: "asc" });
    expect(result.items.map((p) => p.id)).toEqual(["2", "1"]);
  });

  it("pagina pelo intervalo from/to (inclusivo) e devolve o total do filtro inteiro", () => {
    const items = Array.from({ length: 25 }, (_, i) => product({ id: String(i), description: `P${String(i).padStart(2, "0")}` }));
    const page1 = paginateProducts(items, { ...baseQuery, from: 0, to: 19 });
    expect(page1.items).toHaveLength(20);
    expect(page1.total).toBe(25);
    const page2 = paginateProducts(items, { ...baseQuery, from: 20, to: 39 });
    expect(page2.items).toHaveLength(5);
    expect(page2.total).toBe(25);
  });

  it("combina todos os filtros ao mesmo tempo", () => {
    const items = [
      product({ id: "1", description: "Coxinha", isActive: true, stockQuantity: 5, salePrice: 8 }),
      product({ id: "2", description: "Coxinha grande", isActive: false, stockQuantity: 5, salePrice: 8 }),
      product({ id: "3", description: "Coxinha", isActive: true, stockQuantity: 0, salePrice: 8 }),
    ];
    const result = paginateProducts(items, { ...baseQuery, search: "coxinha", activeFilter: "active", stockFilter: "in_stock" });
    expect(result.items.map((p) => p.id)).toEqual(["1"]);
  });
});
