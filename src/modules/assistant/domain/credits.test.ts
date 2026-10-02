import { describe, expect, it } from "vitest";
import { DAILY_FREE_LIMIT, startOfTodayInBrasilia, summarizeCredits, type UsageEntry } from "./credits";

// 30/09/2026 15:00 em Brasília (UTC-3).
const NOW = new Date("2026-09-30T18:00:00.000Z");

const usage = (createdAt: string, wasFree: boolean, action: string | null = "chat"): UsageEntry => ({
  createdAt,
  wasFree,
  action,
});

describe("startOfTodayInBrasilia", () => {
  it("é a meia-noite de Brasília, qualquer que seja o fuso", () => {
    expect(startOfTodayInBrasilia(NOW).toISOString()).toBe("2026-09-30T03:00:00.000Z");
    // 01:00 UTC do dia 1º ainda é dia 30 em Brasília.
    expect(startOfTodayInBrasilia(new Date("2026-10-01T01:00:00.000Z")).toISOString()).toBe("2026-09-30T03:00:00.000Z");
  });
});

describe("summarizeCredits (regras do useAICredits do legado)", () => {
  it("sem uso e sem extrato: cota inteira, saldo zero", () => {
    expect(summarizeCredits([], [], NOW)).toEqual({
      dailyUsed: 0,
      dailyFreeUsed: 0,
      dailyPaidUsed: 0,
      dailyLimit: DAILY_FREE_LIMIT,
      freeRemaining: 10,
      balance: 0,
      noCredits: false,
    });
  });

  it("conta só o uso de hoje (Brasília) e ignora suporte", () => {
    const entries = [
      usage("2026-09-30T04:00:00.000Z", true),
      usage("2026-09-30T17:00:00.000Z", false),
      usage("2026-09-30T17:30:00.000Z", true, "support"),
      usage("2026-09-30T02:59:59.000Z", true), // ontem em Brasília
    ];
    const summary = summarizeCredits(entries, [], NOW);
    expect(summary.dailyUsed).toBe(2);
    expect(summary.dailyFreeUsed).toBe(1);
    expect(summary.dailyPaidUsed).toBe(1);
    expect(summary.freeRemaining).toBe(9);
  });

  it("saldo é a soma do extrato (texto numérico incluso)", () => {
    expect(summarizeCredits([], [100, -3, 2.5], NOW).balance).toBe(99.5);
  });

  it("sem créditos: cota grátis esgotada e saldo <= 0", () => {
    const esgotado = Array.from({ length: 10 }, () => usage("2026-09-30T12:00:00.000Z", true));
    expect(summarizeCredits(esgotado, [], NOW)).toMatchObject({ freeRemaining: 0, noCredits: true });
    expect(summarizeCredits(esgotado, [5], NOW).noCredits).toBe(false);
  });
});
