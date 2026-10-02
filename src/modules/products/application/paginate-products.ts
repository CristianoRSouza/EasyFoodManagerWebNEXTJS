import type { Product, ProductPage, ProductQuery } from "../domain/product";

/**
 * Filtra, ordena e pagina em memória.
 *
 * A easyfoodmanagerAPI (loja) só expõe `/products` (catálogo inteiro) — sem paginação
 * server-side como a EasyFoodAPI (nuvem) tem em `/products/paged`. Esta função replica, em
 * memória, o mesmo fallback que o legado usava para esse caso
 * (`fetchProductsPaged` em `src/lib/data-service.ts`).
 */
export function paginateProducts(items: Product[], query: ProductQuery): ProductPage {
  const term = query.search.trim().toLowerCase();

  const filtered = items.filter((p) => {
    if (query.activeFilter === "active" && !p.isActive) return false;
    if (query.activeFilter === "inactive" && p.isActive) return false;
    if (query.stockFilter === "in_stock" && p.stockQuantity <= 0) return false;
    if (query.stockFilter === "out_of_stock" && p.stockQuantity > 0) return false;
    if (query.priceMin != null && p.salePrice < query.priceMin) return false;
    if (query.priceMax != null && p.salePrice > query.priceMax) return false;
    if (term && !p.description.toLowerCase().includes(term) && !p.barcode.includes(term)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    let cmp = 0;
    if (query.sortKey === "description") cmp = a.description.localeCompare(b.description);
    else if (query.sortKey === "barcode") cmp = a.barcode.localeCompare(b.barcode);
    else if (query.sortKey === "salePrice") cmp = a.salePrice - b.salePrice;
    else if (query.sortKey === "stockQuantity") cmp = a.stockQuantity - b.stockQuantity;
    else if (query.sortKey === "isActive") cmp = a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1;
    return query.sortDirection === "asc" ? cmp : -cmp;
  });

  return {
    items: filtered.slice(query.from, query.to + 1),
    total: filtered.length,
  };
}
