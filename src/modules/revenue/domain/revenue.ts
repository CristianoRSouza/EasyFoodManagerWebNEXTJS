/**
 * Receita (crédito, débito, PIX, voucher) só com transações aprovadas — espelha 1:1 o envelope
 * `{ data: ... }` de `GET /dashboard/revenue-approved` (ver
 * `easyfoodmanagerAPI/src/routes/v1/dashboard.ts`). Os nomes dos campos seguem o contrato
 * (snake_case incluso) de propósito: qualquer tradução aqui só criaria uma camada de mapeamento
 * sem ganho, já que o servidor calcula as somas — o cliente só exibe.
 */
/**
 * Grupo de forma de pagamento do relatório. `voucher` é um GRUPO, não um valor do banco: soma
 * `meal_voucher` (tPag 11) e `food_voucher` (tPag 10) — legado 1.3.12 (`revenue-methods.ts`,
 * PR #23). Dinheiro e outros continuam fora do relatório.
 */
export type PaymentMethod = "credit" | "debit" | "pix" | "voucher";

export const PAYMENT_METHODS: readonly PaymentMethod[] = ["credit", "debit", "pix", "voucher"];

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  credit: "Crédito",
  debit: "Débito",
  pix: "PIX",
  voucher: "Voucher",
};

/** Rótulo do valor CRU de `payment_method` (tabela de recentes e CSV): voucher mostra o tipo fiscal. */
const RAW_METHOD_LABEL: Record<string, string> = {
  credit: "Crédito",
  debit: "Débito",
  pix: "PIX",
  meal_voucher: "Vale Refeição",
  food_voucher: "Vale Alimentação",
};

/** Rótulo de um `payment_method` do banco; desconhecido sai cru, como no legado. */
export function rawMethodLabel(paymentMethod: string): string {
  return RAW_METHOD_LABEL[paymentMethod] ?? paymentMethod;
}

export interface RevenueAmount {
  amount: number;
  count: number;
}

export interface RevenueDayBucket {
  day: string;
  label: string;
  credit: number;
  debit: number;
  pix: number;
  voucher: number;
  total: number;
}

export interface RevenueHourBucket {
  hour: number;
  label: string;
  credit: number;
  debit: number;
  pix: number;
  voucher: number;
  total: number;
}

export interface RevenueTransactionRow {
  id: string;
  created_at: string;
  payment_method: string;
  amount: number;
}

export interface RevenueRecentMeta {
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface RevenueTotemTotal {
  totem: string;
  amount: number;
  count: number;
}

export interface RevenueProductTotal {
  product: string;
  quantity: number;
  amount: number;
  txCount: number;
}

export interface RevenueMonthComparison {
  month: string;
  label: string;
  current: number;
  previous: number;
}

export interface RevenueReport {
  period: { from: string; to: string };
  byMethod: Record<PaymentMethod, RevenueAmount>;
  total: RevenueAmount;
  kpis: {
    averageTicket: number;
    shareCredit: number;
    shareDebit: number;
    sharePix: number;
    shareVoucher: number;
    nfceIssuedCount: number;
  };
  byHour: RevenueHourBucket[];
  recentApproved: RevenueTransactionRow[];
  recentApprovedMeta: RevenueRecentMeta;
  byTotem: RevenueTotemTotal[];
  byProductTop10: RevenueProductTotal[];
  byMonthYoY: RevenueMonthComparison[];
  byDay: RevenueDayBucket[];
}

export interface RevenuePieRow {
  name: string;
  value: number;
  key: PaymentMethod;
}

/** As quatro fatias do gráfico de pizza (crédito/débito/PIX/voucher), na ordem fixa do legado. */
export function pieChartRows(report: Pick<RevenueReport, "byMethod">): RevenuePieRow[] {
  return PAYMENT_METHODS.map((key) => ({
    name: METHOD_LABEL[key],
    value: report.byMethod[key].amount,
    key,
  }));
}

/**
 * Completa os campos de voucher num relatório vindo de um servidor anterior a eles (EasyFoodAPI ou
 * easyfoodmanagerAPI ainda não atualizadas) — legado 1.3.12 (`withVoucherDefaults`). Sem isto a
 * tela somaria `undefined` e mostraria NaN.
 */
export function withVoucherDefaults(r: RevenueReport): RevenueReport {
  const zero = { amount: 0, count: 0 };
  return {
    ...r,
    byMethod: { ...r.byMethod, voucher: r.byMethod?.voucher ?? zero },
    kpis: { ...r.kpis, shareVoucher: r.kpis?.shareVoucher ?? 0 },
    byHour: (r.byHour ?? []).map((h) => ({ ...h, voucher: h.voucher ?? 0 })),
    byDay: (r.byDay ?? []).map((d) => ({ ...d, voucher: d.voucher ?? 0 })),
  };
}

export interface RevenueCumulativeDay extends RevenueDayBucket {
  cumulative: number;
}

/** Soma progressiva do período, dia a dia — calculada no cliente, como no legado. */
export function cumulativeByDay(byDay: RevenueDayBucket[]): RevenueCumulativeDay[] {
  let acc = 0;
  return byDay.map((d) => {
    acc += d.total;
    return { ...d, cumulative: acc };
  });
}

export type ProductRankingBy = "quantity" | "amount";

/** Top 10 produtos, reordenado no cliente pelo critério escolhido (quantidade ou valor). */
export function rankTopProducts(
  byProductTop10: RevenueProductTotal[],
  rankBy: ProductRankingBy,
): RevenueProductTotal[] {
  const rows = [...byProductTop10];
  rows.sort((a, b) =>
    rankBy === "quantity"
      ? b.quantity - a.quantity || b.amount - a.amount
      : b.amount - a.amount || b.quantity - a.quantity,
  );
  return rows.slice(0, 10);
}

export type DatePreset = "today" | "7d" | "30d" | "month" | null;

/** Se o preset (`7 dias`, `30 dias`, `Mês atual`) cabe na janela do plano ativo. */
export function isPresetAllowed(kind: Exclude<DatePreset, null>, historyWindowDays: number | null): boolean {
  if (!historyWindowDays) return true;
  if (kind === "today") return true;
  if (kind === "7d") return historyWindowDays >= 7;
  if (kind === "30d") return historyWindowDays >= 30;
  if (kind === "month") return historyWindowDays >= 31;
  return true;
}

/** Bloqueio total: o intervalo escolhido cai antes da data mínima do plano. */
export function isOutOfWindow(minYmd: string | null, from: string, to: string): boolean {
  if (!minYmd) return false;
  return (Boolean(from) && from < minYmd) || (Boolean(to) && to < minYmd);
}
