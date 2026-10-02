import type { Transaction, TefResultSnapshot } from "@/shared/domain/transaction";
import { asJsonObject, asNumber, asText } from "./convert";

type Row = Record<string, unknown>;

/**
 * Normaliza uma linha de `GET /v1/transactions` (numeric/jsonb/enums como texto) para o
 * domínio — mesma normalização de `mapTransactionRow` no legado (`src/lib/data-service.ts`),
 * com os campos traduzidos para inglês/camelCase.
 *
 * Único mapeador de transação do app: Comandas (`orders/infrastructure/order-mapper.ts`) e
 * Transações usam esta mesma função, cada um lendo só os campos que precisa.
 */
export function mapTransactionRow(row: Row): Transaction {
  return {
    id: String(row.id ?? ""),
    orderIds: Array.isArray(row.order_ids) ? (row.order_ids as unknown[]).map(String) : [],
    paymentMethod: String(row.payment_method ?? ""),
    amount: asNumber(row.amount),
    installments: asNumber(row.installments, 1),
    nsu: asText(row.nsu),
    authorizationCode: asText(row.authorization_code),
    tefTransactionId: asText(row.tef_transaction_id),
    status: String(row.status ?? "pending"),
    createdAt: String(row.created_at ?? ""),
    tefResult: asJsonObject<TefResultSnapshot>(row.tef_result),
    tefCancelFbSaleAlreadyClosed: row.tef_cancel_fb_sale_already_closed === true,
    tefCancelFbSaleMessage: asText(row.tef_cancel_fb_sale_message),
    pixQrcodeId: asText(row.pix_qrcode_id),
    pixStatus: asText(row.pix_status),
    pixTxid: asText(row.pix_txid),
    pixE2eId: asText(row.pix_e2e_id),
    pixPaidAt: asText(row.pix_paid_at),
    pixLastPollAt: asText(row.pix_last_poll_at),
    pixProviderUrl: asText(row.pix_provider_url),
  };
}
