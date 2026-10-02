import { format, subDays } from "date-fns";
import type { PeriodPreset } from "@/shared/date-period/date-period-presets";

/**
 * Janela de histórico do plano (quantos dias para trás o plano deixa consultar) — regras puras
 * comuns às telas com filtro de período (Comandas, Transações, Receitas).
 */

/**
 * Data mínima (`AAAA-MM-DD`, fuso local) que o plano ativo permite consultar, ou `null` sem
 * limite. `referenceDate` existe só para o teste não depender do relógio da máquina.
 */
export function minAllowedYmd(historyWindowDays: number | null, referenceDate: Date = new Date()): string | null {
  if (!historyWindowDays || historyWindowDays <= 0) return null;
  return format(subDays(referenceDate, historyWindowDays - 1), "yyyy-MM-dd");
}

/**
 * Bloqueio das telas com preset de período (Comandas, Transações), igual ao legado: "Todos" ou
 * um início antes da data mínima caem fora da janela do plano.
 */
export function isPeriodOutsidePlanWindow(minYmd: string | null, period: PeriodPreset, dateFrom: string): boolean {
  if (!minYmd) return false;
  if (period === "all") return true;
  if (!dateFrom) return true;
  return dateFrom < minYmd;
}
