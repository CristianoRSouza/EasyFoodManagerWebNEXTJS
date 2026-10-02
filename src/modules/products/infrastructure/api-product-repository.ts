import { apiRequest } from "@/shared/http/api-client";
import { toQueryString } from "@/shared/http/query-string";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import type { RuntimeInfo } from "@/shared/runtime/runtime-context";
import type { ProductRepository } from "../application/product-repository";
import type { ProductPage, ProductQuery } from "../domain/product";
import type { ProductFiscal } from "../domain/product-fiscal";
import type { ProductFiscalIbsCbs } from "../domain/product-fiscal-ibscbs";
import { paginateProducts } from "../application/paginate-products";
import { toProduct } from "./product-mapper";
import { toProductFiscal } from "./product-fiscal-mapper";
import { toProductFiscalIbsCbs } from "./product-fiscal-ibscbs-mapper";

type Row = Record<string, unknown>;

/** O domínio ordena por nome de campo; a API/Supabase, pelo nome da coluna. */
const SORT_COLUMN: Record<ProductQuery["sortKey"], string> = {
  description: "description",
  barcode: "barcode",
  salePrice: "sale_price",
  stockQuantity: "stock_quantity",
  isActive: "is_active",
};

/**
 * Produtos pelas rotas `/v1/products*` e `/v1/cbs/product-fiscal-ibscbs`.
 *
 * A paginação diverge por backend: a EasyFoodAPI (nuvem) tem `/products/paged`, que filtra,
 * ordena e pagina no servidor; a easyfoodmanagerAPI (loja) só tem `/products` (catálogo
 * inteiro) — o mesmo fallback do legado (`fetchProductsPaged` em `src/lib/data-service.ts`,
 * ramo Admin API/Electron) é replicado aqui, em memória, via `paginateProducts`.
 *
 * As duas rotas de dados fiscais (`/products/:id/fiscal` e `/cbs/product-fiscal-ibscbs`) têm a
 * mesma forma nos dois backends, então não há ramo por `backend` para elas.
 */
export class ApiProductRepository implements ProductRepository {
  constructor(
    private readonly tenant: Tenant,
    private readonly backend: RuntimeInfo["backend"],
  ) {}

  async listPage(query: ProductQuery): Promise<ProductPage> {
    if (this.backend === "cloud") {
      const response = await apiRequest<{ rows: Row[]; total: number }>(
        `/products/paged${toQueryString({
          search: query.search.trim(),
          activeFilter: query.activeFilter,
          stockFilter: query.stockFilter,
          priceMin: query.priceMin,
          priceMax: query.priceMax,
          sortKey: SORT_COLUMN[query.sortKey],
          sortDir: query.sortDirection,
          from: query.from,
          to: query.to,
        })}`,
        { tenant: this.tenant },
      );
      return { items: response.rows.map(toProduct), total: response.total };
    }

    const response = await apiRequest<{ data: Row[] }>("/products", { tenant: this.tenant });
    return paginateProducts((response.data ?? []).map(toProduct), query);
  }

  async fiscal(productId: string): Promise<ProductFiscal | null> {
    const response = await apiRequest<{ data: Row | null }>(`/products/${encodeURIComponent(productId)}/fiscal`, {
      tenant: this.tenant,
    });
    return response.data ? toProductFiscal(response.data, productId) : null;
  }

  async fiscalIbsCbs(classCode: string): Promise<ProductFiscalIbsCbs> {
    const response = await apiRequest<{ data: { taxClass: Row | null; indicator: Row | null } }>(
      `/cbs/product-fiscal-ibscbs${toQueryString({ classCode })}`,
      { tenant: this.tenant },
    );
    return toProductFiscalIbsCbs(response.data ?? { taxClass: null, indicator: null });
  }
}
