import type { PaymentMethod } from "../domain/revenue";

/** Formatação compacta de eixo (ex.: `12,3 mil`), igual ao `ReceitasCharts.tsx` do legado. */
export function compactNumber(v: number): string {
  return Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 0, notation: "compact" });
}

/** Cores do design system (variáveis CSS) para os quatro grupos de pagamento, iguais ao legado. */
export const CHART_FILL: Record<PaymentMethod, string> = {
  credit: "hsl(var(--chart-1))",
  debit: "hsl(var(--chart-2))",
  pix: "hsl(var(--chart-4))",
  voucher: "hsl(var(--chart-3))",
};
