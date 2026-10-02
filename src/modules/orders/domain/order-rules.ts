import type { Order, OrderStatusFilter } from "./order";
import type { OrderItem } from "./order-item";
import type { Transaction } from "./transaction";
import { paymentMethodKey, paymentMethodLabel } from "@/shared/domain/transaction";

const DEFAULT_TEF_CANCEL_MESSAGE =
  "TEF cancelado, mas a venda ja estava fechada no Firebird; a comanda foi mantida fechada.";

/**
 * Rótulo em PT-BR do método de pagamento, com "Outro" para método vazio — igual ao legado.
 * Fonte única em `@/shared/domain/transaction` (também usada por Transações, cujo fallback
 * padrão é o valor cru, não "Outro").
 */
export function formatTransactionMethod(method: string): string {
  // Paridade com o legado 1.3.12: o `formatTransactionMethod` de `Orders.tsx` NÃO ganhou os rótulos
  // de voucher no PR #23 (só Transações/Receitas ganharam) — na Comanda o voucher aparece cru
  // (`meal_voucher`). Mantido igual de propósito; corrigir nos dois lados junto.
  const key = paymentMethodKey(method);
  if (key === "meal_voucher" || key === "food_voucher") return method.trim();
  return paymentMethodLabel(method, "Outro");
}

export interface TefCancelInfo {
  message: string;
}

/** Aviso quando um TEF foi cancelado, mas a venda já estava fechada no Firebird do PDV. */
export function getTransactionTefCancelInfo(transaction: Transaction): TefCancelInfo | null {
  const flagged =
    transaction.tefCancelFbSaleAlreadyClosed === true ||
    transaction.tefResult?.tefCancelFbSaleAlreadyClosed === true;
  if (!flagged) return null;
  return {
    message: transaction.tefCancelFbSaleMessage || transaction.tefResult?.tefCancelAdminMessage || DEFAULT_TEF_CANCEL_MESSAGE,
  };
}

/** Mesmo aviso, visto do lado da comanda (agregado pelo servidor a partir das transações). */
export function getOrderTefCancelInfo(order: Order): TefCancelInfo | null {
  if (order.tefCancelFbSaleAlreadyClosed !== true) return null;
  return { message: order.tefCancelFbSaleMessage || DEFAULT_TEF_CANCEL_MESSAGE };
}

/** Itens do totem ativos que o Sync-Service ainda não marcou como enviados ao FB (bloqueia fechamento). */
export function totemItemsPendingSync(items: OrderItem[]): boolean {
  return items.some((i) => i.origin === "totem" && i.status === "active" && !i.syncedToFb);
}

export type FirebirdLinkStatus = "fb_linked" | "fb_partial" | "fb_unlinked";

/**
 * Vínculo com FB: prioriza cabeçalho da comanda (`fbSaleId` / fechamento concluído), depois
 * `fbId` nas linhas. Evita "Sem vínculo FB" após venda gravada só porque a comparação olhou
 * apenas para as linhas.
 */
export function getFirebirdLinkStatus(order: Order, items: OrderItem[]): FirebirdLinkStatus {
  const hasOrderSale = order.fbSaleId != null && Number(order.fbSaleId) !== 0;
  if (hasOrderSale) return "fb_linked";
  if (order.syncClosedToFbAt) return "fb_linked";

  const active = items.filter((i) => i.status === "active");
  const pool = active.length > 0 ? active : items;
  if (pool.length === 0) return "fb_unlinked";
  const linkedCount = pool.filter((item) => item.fbId != null).length;
  if (linkedCount === 0) return "fb_unlinked";
  if (linkedCount === pool.length) return "fb_linked";
  return "fb_partial";
}

/** Soma dos itens ativos da comanda — os cancelados não valem venda. */
export function sumActiveItemsSubtotal(items: OrderItem[]): number {
  return items.filter((i) => i.status === "active").reduce((sum, i) => sum + Number(i.subtotal), 0);
}

export interface OrderFilterOptions {
  search: string;
  status: OrderStatusFilter;
}

export function filterOrders(orders: Order[], opts: OrderFilterOptions): Order[] {
  return orders.filter((o) => {
    if (opts.status !== "all" && o.status !== opts.status) return false;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      return o.barcode.toLowerCase().includes(q) || (o.customerName?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });
}

/**
 * Itens agrupados por comanda, cada grupo em ordem alfabética — legado 1.3.12 (`Orders.tsx`, PR #27).
 * Loja e nuvem devolvem os itens em ordens diferentes; ordenar aqui faz os dois modos mostrarem a
 * mesma sequência. Empate (mesmo produto) desempata pelo `fbId` (sem `fbId` por último) e depois
 * pelo `id`.
 */
export function groupItemsByOrder(items: OrderItem[]): Map<string, OrderItem[]> {
  const map = new Map<string, OrderItem[]>();
  for (const item of items) {
    const arr = map.get(item.orderId);
    if (arr) arr.push(item);
    else map.set(item.orderId, [item]);
  }
  for (const arr of map.values()) {
    arr.sort(
      (a, b) =>
        (a.productName ?? "").localeCompare(b.productName ?? "", "pt-BR", { sensitivity: "base" }) ||
        (a.fbId ?? Number.MAX_SAFE_INTEGER) - (b.fbId ?? Number.MAX_SAFE_INTEGER) ||
        String(a.id).localeCompare(String(b.id)),
    );
  }
  return map;
}

/** Produtos dos itens, sem repetição nem vazios — as fotos são buscadas uma vez por produto. */
export function uniqueProductIds(items: OrderItem[]): string[] {
  return Array.from(new Set(items.map((item) => item.productId).filter((id): id is string => !!id)));
}

/**
 * Aplica o mapa `product_id → foto` da nuvem aos itens, como o legado faz no render
 * (`productImages?.get(item.product_id) ?? null`). Sem mapa, os itens seguem intactos.
 */
export function withProductImages(items: OrderItem[], images: Map<string, string | null> | undefined): OrderItem[] {
  if (!images) return items;
  return items.map((item) => ({ ...item, imageUrl: item.productId ? (images.get(item.productId) ?? null) : null }));
}
