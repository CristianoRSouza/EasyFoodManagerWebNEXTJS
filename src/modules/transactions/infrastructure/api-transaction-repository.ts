import { apiRequest } from "@/shared/http/api-client";
import { toQueryString } from "@/shared/http/query-string";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import type { TransactionDateRange, TransactionRepository } from "../application/transaction-repository";
import type { Transaction } from "../domain/transaction";
import { mapTransactionRow } from "./transaction-mapper";

type Row = Record<string, unknown>;

/**
 * Transações e comandas pela easyfoodmanagerAPI — os mesmos endpoints que o legado usa no
 * modo Admin API/LAN (`GET /v1/transactions`, `GET /v1/orders`, ver
 * `src/lib/data-service.ts` do legado). Sem paginação: a API devolve o período inteiro numa
 * única resposta (`{ data: [...] }`, ver `easyfoodmanagerAPI/src/routes/v1/transactions.ts`
 * e `.../orders.ts`).
 */
export class ApiTransactionRepository implements TransactionRepository {
  constructor(private readonly tenant: Tenant) {}

  async list(range: TransactionDateRange): Promise<Transaction[]> {
    const response = await apiRequest<{ data: Row[] }>(`/transactions${toQueryString({ ...range })}`, {
      tenant: this.tenant,
    });
    return (response.data ?? []).map(mapTransactionRow);
  }

  async orderBarcodes(range: TransactionDateRange): Promise<Map<string, string>> {
    const response = await apiRequest<{ data: Row[] }>(`/orders${toQueryString({ ...range })}`, {
      tenant: this.tenant,
    });
    const map = new Map<string, string>();
    for (const order of response.data ?? []) {
      map.set(String(order.id), String(order.barcode ?? ""));
    }
    return map;
  }
}
