/**
 * Produto — entidade de domínio.
 *
 * Representa o produto como a tela o consome, independente de vir da EasyFoodAPI (nuvem) ou da
 * easyfoodmanagerAPI (loja). Traduzir a linha de cada backend para este formato é
 * responsabilidade da camada de infraestrutura, nunca daqui.
 */
export interface Product {
  id: string;
  description: string;
  barcode: string;
  salePrice: number;
  stockQuantity: number;
  unitName: string | null;
  /** `is_fractional` da unidade — decide as casas do estoque na tela. `null`: API antiga não manda (legado 1.3.12, PR #30). */
  unitIsFractional: boolean | null;
  imageUrl: string | null;
  isActive: boolean;
}

export type ActiveFilter = "all" | "active" | "inactive";
export type StockFilter = "all" | "in_stock" | "out_of_stock";
export type ProductSortKey = "description" | "barcode" | "salePrice" | "stockQuantity" | "isActive";
export type SortDirection = "asc" | "desc";

/** Quantos produtos cada página carrega — igual ao legado (`pages/Products.tsx`). */
export const PRODUCTS_PAGE_SIZE = 20;

/** Critérios de busca/ordenação/paginação. `from`/`to` são índices inclusivos (herança do `range()` do PostgREST, preservada para não recalcular nada). */
export interface ProductQuery {
  search: string;
  activeFilter: ActiveFilter;
  stockFilter: StockFilter;
  priceMin: number | null;
  priceMax: number | null;
  sortKey: ProductSortKey;
  sortDirection: SortDirection;
  from: number;
  to: number;
}

/** Uma página de resultados. `total` é a contagem do filtro inteiro, não da página. */
export interface ProductPage {
  items: Product[];
  total: number;
}
