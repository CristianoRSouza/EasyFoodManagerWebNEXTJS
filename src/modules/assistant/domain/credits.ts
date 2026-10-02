/**
 * Créditos de IA da LOJA ativa — cota grátis do dia e saldo. Regras de
 * `LEGACY/src/hooks/useAICredits.ts`: dez consultas grátis por dia, contadas no fuso de Brasília;
 * perguntas de suporte não consomem a cota; o saldo é a soma do extrato.
 */
export const DAILY_FREE_LIMIT = 10;

export interface UsageEntry {
  createdAt: string;
  wasFree: boolean;
  action: string | null;
}

export interface CreditSummary {
  dailyUsed: number;
  dailyFreeUsed: number;
  dailyPaidUsed: number;
  dailyLimit: number;
  freeRemaining: number;
  balance: number;
  noCredits: boolean;
}

/** Meia-noite de hoje em Brasília, qualquer que seja o fuso do navegador. */
export function startOfTodayInBrasilia(now: Date = new Date()): Date {
  const day = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new Date(`${day}T00:00:00-03:00`);
}

export function summarizeCredits(usage: UsageEntry[], amounts: number[], now: Date = new Date()): CreditSummary {
  const start = startOfTodayInBrasilia(now);
  const quotaEntries = usage.filter((u) => new Date(u.createdAt) >= start && u.action !== "support");
  const dailyFreeUsed = quotaEntries.filter((u) => u.wasFree).length;
  const balance = amounts.reduce((sum, amount) => sum + amount, 0);
  return {
    dailyUsed: quotaEntries.length,
    dailyFreeUsed,
    dailyPaidUsed: quotaEntries.length - dailyFreeUsed,
    dailyLimit: DAILY_FREE_LIMIT,
    freeRemaining: Math.max(0, DAILY_FREE_LIMIT - dailyFreeUsed),
    balance,
    noCredits: dailyFreeUsed >= DAILY_FREE_LIMIT && balance <= 0,
  };
}
