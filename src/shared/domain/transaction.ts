/**
 * Transação de pagamento — tipo e regras comuns a Comandas e Transações. Fonte única: os dois
 * módulos importavam versões quase idênticas (`orders/domain/transaction.ts` e
 * `transactions/domain/transaction.ts`), que já haviam divergido entre si (`installments`,
 * `tefCancelFbSaleAlreadyClosed`). Comandas usa um `Pick<>` deste tipo, com só os campos que
 * consome.
 */

/** Snapshot gravado pelo EasyCommandPay-TEF-Aditum-Service (`tef_result` jsonb). */
export type TefResultSnapshot = {
  storedAt?: string;
  merchantReceipt?: (string | null)[] | null;
  cardholderReceipt?: (string | null)[] | null;
  aditumConfirmation?: { httpStatus?: number; json?: unknown } | { error?: string } | null;
  authorizationResponse?: unknown;
  tefCancelFbSaleAlreadyClosed?: boolean;
  tefCancelRequiresManualFbAction?: boolean;
  tefCancelAdminMessage?: string | null;
  tefCancelOrderHandling?: {
    message?: string;
    fbSaleAlreadyClosed?: boolean;
    requiresManualFbAction?: boolean;
    orderIds?: string[];
    reopenedOrderIds?: string[];
    orders?: Array<{
      id?: string;
      barcode?: string;
      statusBefore?: string;
      fbSaleId?: number | null;
      fbCashRegisterId?: number | null;
      syncClosedToFbAt?: string | null;
      action?: string;
    }>;
  };
};

/** Um pagamento processado pelo totem, via TEF ou PIX. */
export interface Transaction {
  id: string;
  /** Comandas que este pagamento fechou. Uma transação pode fechar várias. */
  orderIds: string[];
  /** Valor do enum PG `payment_method_enum` (ex.: credit, debit, …). */
  paymentMethod: string;
  amount: number;
  installments: number;
  nsu: string | null;
  authorizationCode: string | null;
  /** Identificador da transação no TEF/Aditum. */
  tefTransactionId: string | null;
  /** Valor do enum PG `transaction_status`. */
  status: string;
  createdAt: string;
  /** JSON da última operação TEF (recibos, confirmação Aditum, …). */
  tefResult: TefResultSnapshot | null;
  tefCancelFbSaleAlreadyClosed: boolean;
  tefCancelFbSaleMessage: string | null;
  /** PIX materializado (provider PIXnoPDV). */
  pixQrcodeId: string | null;
  pixStatus: string | null;
  pixTxid: string | null;
  pixE2eId: string | null;
  pixPaidAt: string | null;
  pixLastPollAt: string | null;
  pixProviderUrl: string | null;
}

export type PaymentMethodKey = "credit" | "debit" | "pix" | "cash" | "meal_voucher" | "food_voucher" | "other";

/** Só os métodos com rótulo fixo — `"other"` some do enum e mostra o valor cru, como no legado. */
export const PAYMENT_METHOD_LABELS: Partial<Record<PaymentMethodKey, string>> = {
  credit: "Crédito",
  debit: "Débito",
  pix: "PIX",
  cash: "Dinheiro",
  meal_voucher: "Vale Refeição",
  food_voucher: "Vale Alimentação",
};

/** Mapeia `payment_method_enum` da PG para chave de UI (mesma regra do legado). */
export function paymentMethodKey(method: string): PaymentMethodKey {
  const m = method.toLowerCase();
  // Antes de "credit"/"debit": voucher tem chave própria (legado 1.3.12, PR #23 — tPag 10/11).
  if (m === "meal_voucher" || m === "food_voucher") return m;
  if (m.includes("credit")) return "credit";
  if (m.includes("debit")) return "debit";
  if (m.includes("pix")) return "pix";
  if (m.includes("cash") || m.includes("dinheiro")) return "cash";
  return "other";
}

/**
 * Rótulo em PT-BR para um método de pagamento.
 *
 * Para um método fora dos quatro conhecidos, devolve o próprio valor (trim); se ele vier vazio,
 * devolve `unknownFallback` quando informado (Comandas usa `"Outro"`) ou o valor cru (Transações,
 * comportamento padrão).
 */
export function paymentMethodLabel(paymentMethod: string, unknownFallback?: string): string {
  const known = PAYMENT_METHOD_LABELS[paymentMethodKey(paymentMethod)];
  if (known) return known;
  const trimmed = paymentMethod.trim();
  return trimmed || (unknownFallback ?? paymentMethod);
}

export type TransactionMethodFilter = "all" | "credit" | "debit" | "pix";

/** `"all"` ou um valor de `Transaction["status"]`. */
export type TransactionStatusFilter = string;

export function filterTransactions(
  transactions: Transaction[],
  filters: { method: TransactionMethodFilter; status: TransactionStatusFilter },
): Transaction[] {
  return transactions.filter((t) => {
    if (filters.method !== "all" && paymentMethodKey(t.paymentMethod) !== filters.method) return false;
    if (filters.status !== "all" && t.status !== filters.status) return false;
    return true;
  });
}

export interface PaymentTotals {
  credit: number;
  debit: number;
  pix: number;
}

/** Soma por método, só das transações aprovadas — os cards do topo da tela. */
export function computeApprovedTotals(transactions: Transaction[]): PaymentTotals {
  const approved = transactions.filter((t) => t.status === "approved");
  const sumFor = (key: PaymentMethodKey) =>
    approved
      .filter((t) => paymentMethodKey(t.paymentMethod) === key)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  return { credit: sumFor("credit"), debit: sumFor("debit"), pix: sumFor("pix") };
}

/** `true` quando há retorno do TEF a mostrar (recibos, confirmação Aditum ou resposta bruta). */
export function hasTefSnapshot(transaction: Transaction): boolean {
  const tr = transaction.tefResult;
  if (!tr) return false;
  return Boolean(
    tr.storedAt ||
      (tr.merchantReceipt && tr.merchantReceipt.length > 0) ||
      (tr.cardholderReceipt && tr.cardholderReceipt.length > 0) ||
      tr.authorizationResponse != null ||
      tr.aditumConfirmation != null,
  );
}

export function hasPixSnapshot(transaction: Transaction): boolean {
  return Boolean(
    transaction.pixQrcodeId ||
      transaction.pixStatus ||
      transaction.pixTxid ||
      transaction.pixE2eId ||
      transaction.pixPaidAt ||
      transaction.pixLastPollAt ||
      transaction.pixProviderUrl,
  );
}

export interface IdSummary {
  /** Primeiro identificador, para exibir na coluna. */
  primary: string;
  /** Todos os identificadores juntos, para o tooltip (`title=`). */
  full: string;
}

export function formatOrderIds(orderIds: string[] | null | undefined): IdSummary {
  const ids = Array.isArray(orderIds) ? orderIds.map((v) => String(v).trim()).filter(Boolean) : [];
  if (ids.length === 0) return { primary: "—", full: "" };
  return { primary: ids[0] ?? "—", full: ids.join(", ") };
}

/** Mesmos ids, traduzidos para o código de barras da comanda (o que a pessoa lê no balcão). */
export function formatOrderBarcodes(
  orderIds: string[] | null | undefined,
  barcodeById: Map<string, string>,
): IdSummary {
  const ids = Array.isArray(orderIds) ? orderIds.map((v) => String(v).trim()).filter(Boolean) : [];
  if (ids.length === 0) return { primary: "—", full: "" };
  const barcodes = ids.map((id) => barcodeById.get(id) ?? "—").filter(Boolean);
  if (barcodes.length === 0) return { primary: "—", full: "" };
  return { primary: barcodes[0] ?? "—", full: barcodes.join(", ") };
}
