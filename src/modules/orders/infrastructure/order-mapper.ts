import type { Order, OrderStatus } from "../domain/order";
import type { OrderItem } from "../domain/order-item";
import type { Transaction } from "../domain/transaction";
import { mapTransactionRow } from "@/shared/infrastructure/transaction-mapper";
import { asText, asNumber } from "@/shared/infrastructure/convert";

type Row = Record<string, unknown>;

function toOrderStatus(value: unknown): OrderStatus {
  return value === "closed" || value === "cancelled" ? value : "open";
}

export function toOrder(row: Row): Order {
  return {
    id: String(row.id ?? ""),
    barcode: String(row.barcode ?? ""),
    customerName: asText(row.customer_name),
    tableName: String(row.table_name ?? ""),
    totemName: asText(row.totem_name),
    status: toOrderStatus(row.status),
    fbSaleId: row.fb_sale_id != null ? asNumber(row.fb_sale_id, 0) : null,
    fbCashRegisterId: row.fb_cash_register_id != null ? asNumber(row.fb_cash_register_id, 0) : null,
    syncClosePending: row.sync_close_pending === true,
    syncCloseAttempts: asNumber(row.sync_close_attempts, 0),
    syncCloseLastError: asText(row.sync_close_last_error),
    syncCloseRequestedAt: asText(row.sync_close_requested_at),
    syncClosedToFbAt: asText(row.sync_closed_to_fb_at),
    tefCancelFbSaleAlreadyClosed: row.tef_cancel_fb_sale_already_closed === true,
    tefCancelFbSaleMessage: asText(row.tef_cancel_fb_sale_message),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function toOrderItem(row: Row): OrderItem {
  return {
    id: String(row.id ?? ""),
    orderId: String(row.order_id ?? ""),
    productId: asText(row.product_id),
    productName: String(row.product_name ?? ""),
    productBarcode: String(row.product_barcode ?? ""),
    quantity: asNumber(row.quantity, 0),
    unitPrice: asNumber(row.unit_price, 0),
    subtotal: asNumber(row.subtotal, 0),
    unitName: asText(row.unit_name),
    origin: String(row.origin ?? ""),
    status: String(row.status ?? ""),
    syncedToFb: row.synced_to_fb === true,
    fbId: row.fb_id != null ? asNumber(row.fb_id, 0) : null,
    // Só a nuvem preenche `image_url` (URL pública já resolvida no servidor). Na loja o campo
    // não existe na resposta e a foto é resolvida por barcode via `useProductImageUrl`.
    imageUrl: asText(row.image_url),
  };
}

/**
 * Projeta o mapeador único de transação (`@/shared/infrastructure/transaction-mapper`) no
 * recorte que Comandas usa — mesma fonte de conversão que Transações, sem reimplementar
 * `installments`/`tefCancelFbSaleAlreadyClosed` (eram os dois campos que haviam divergido).
 */
export function toTransaction(row: Row): Transaction {
  const t = mapTransactionRow(row);
  return {
    id: t.id,
    orderIds: t.orderIds,
    paymentMethod: t.paymentMethod,
    amount: t.amount,
    installments: t.installments,
    nsu: t.nsu,
    status: t.status,
    createdAt: t.createdAt,
    tefResult: t.tefResult,
    tefCancelFbSaleAlreadyClosed: t.tefCancelFbSaleAlreadyClosed,
    tefCancelFbSaleMessage: t.tefCancelFbSaleMessage,
  };
}
