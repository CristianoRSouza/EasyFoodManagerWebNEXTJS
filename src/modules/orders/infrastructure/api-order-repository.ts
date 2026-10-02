import type { DateRange, OrderRepository } from "../application/order-repository";
import type { Order } from "../domain/order";
import type { OrderItem } from "../domain/order-item";
import type { Transaction } from "../domain/transaction";
import { apiRequest } from "@/shared/http/api-client";
import { toQueryString } from "@/shared/http/query-string";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import { toOrder, toOrderItem, toTransaction } from "./order-mapper";

type Row = Record<string, unknown>;

/**
 * Máximo de ids por chamada de `GET /v1/product-images` na EasyFoodAPI: acima disso ela responde
 * `400 too_many_ids — "No máximo 200 ids por chamada."` (validação de produção, 2026-10-01; o código
 * da API de nuvem não está neste workspace). `listProductImages` divide em lotes deste tamanho.
 */
export const PRODUCT_IMAGES_MAX_IDS_PER_REQUEST = 200;

/**
 * Comandas/itens/transações pela easyfoodmanagerAPI (mesmos endpoints `/v1/orders`,
 * `/v1/order-items` e `/v1/transactions` que o legado consome no modo LAN).
 */
export class ApiOrderRepository implements OrderRepository {
  constructor(private readonly tenant: Tenant) {}

  async listOrders(range: DateRange): Promise<Order[]> {
    const response = await apiRequest<{ data?: Row[] }>(`/orders${toQueryString({ ...range })}`, { tenant: this.tenant });
    return (response.data ?? []).map(toOrder);
  }

  async listOrderItems(range: DateRange): Promise<OrderItem[]> {
    const response = await apiRequest<{ data?: Row[] }>(`/order-items${toQueryString({ ...range })}`, {
      tenant: this.tenant,
    });
    return (response.data ?? []).map(toOrderItem);
  }

  async listTransactionsByOrderId(orderId: string): Promise<Transaction[]> {
    const trimmed = orderId.trim();
    if (!trimmed) return [];
    const response = await apiRequest<{ data?: Row[] }>(`/transactions?orderId=${encodeURIComponent(trimmed)}`, {
      tenant: this.tenant,
    });
    return (response.data ?? []).map(toTransaction);
  }

  async listProductImages(productIds: string[]): Promise<Map<string, string | null>> {
    if (productIds.length === 0) return new Map();
    const batches: string[][] = [];
    for (let i = 0; i < productIds.length; i += PRODUCT_IMAGES_MAX_IDS_PER_REQUEST) {
      batches.push(productIds.slice(i, i + PRODUCT_IMAGES_MAX_IDS_PER_REQUEST));
    }
    const responses = await Promise.all(
      batches.map((batch) =>
        apiRequest<{ data?: Record<string, string | null> }>(`/product-images${toQueryString({ ids: batch.join(",") })}`, {
          tenant: this.tenant,
        }),
      ),
    );
    return new Map(responses.flatMap((response) => Object.entries(response.data ?? {})));
  }
}
