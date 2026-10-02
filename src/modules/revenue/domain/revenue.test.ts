import { describe, expect, it } from "vitest";
import {
  cumulativeByDay,
  isOutOfWindow,
  isPresetAllowed,
  pieChartRows,
  rankTopProducts,
  rawMethodLabel,
  withVoucherDefaults,
  type RevenueDayBucket,
  type RevenueProductTotal,
  type RevenueReport,
} from "./revenue";

function report(overrides: Partial<Pick<RevenueReport, "byMethod">> = {}): Pick<RevenueReport, "byMethod"> {
  return {
    byMethod: {
      credit: { amount: 100, count: 2 },
      debit: { amount: 50, count: 1 },
      pix: { amount: 25, count: 1 },
      voucher: { amount: 10, count: 1 },
      ...overrides.byMethod,
    },
  };
}

describe("pieChartRows", () => {
  it("devolve as quatro fatias na ordem fixa crédito/débito/PIX/voucher", () => {
    expect(pieChartRows(report())).toEqual([
      { name: "Crédito", value: 100, key: "credit" },
      { name: "Débito", value: 50, key: "debit" },
      { name: "PIX", value: 25, key: "pix" },
      { name: "Voucher", value: 10, key: "voucher" },
    ]);
  });
});

describe("rawMethodLabel", () => {
  it("voucher mostra o tipo fiscal; desconhecido sai cru", () => {
    expect(rawMethodLabel("meal_voucher")).toBe("Vale Refeição");
    expect(rawMethodLabel("food_voucher")).toBe("Vale Alimentação");
    expect(rawMethodLabel("pix")).toBe("PIX");
    expect(rawMethodLabel("cash")).toBe("cash");
  });
});

describe("withVoucherDefaults (legado 1.3.12)", () => {
  it("completa com zero um relatório de servidor anterior ao voucher", () => {
    const antigo = {
      period: { from: "2026-09-01", to: "2026-09-28" },
      byMethod: { credit: { amount: 10, count: 1 }, debit: { amount: 0, count: 0 }, pix: { amount: 0, count: 0 } },
      total: { amount: 10, count: 1 },
      kpis: { averageTicket: 10, shareCredit: 100, shareDebit: 0, sharePix: 0, nfceIssuedCount: 0 },
      byHour: [{ hour: 0, label: "00h", credit: 10, debit: 0, pix: 0, total: 10 }],
      recentApproved: [],
      recentApprovedMeta: { offset: 0, limit: 50, hasMore: false },
      byTotem: [],
      byProductTop10: [],
      byMonthYoY: [],
      byDay: [{ day: "2026-09-28", label: "28/09", credit: 10, debit: 0, pix: 0, total: 10 }],
    } as unknown as RevenueReport;

    const r = withVoucherDefaults(antigo);
    expect(r.byMethod.voucher).toEqual({ amount: 0, count: 0 });
    expect(r.kpis.shareVoucher).toBe(0);
    expect(r.byHour[0]!.voucher).toBe(0);
    expect(r.byDay[0]!.voucher).toBe(0);
    expect(r.byMethod.credit).toEqual({ amount: 10, count: 1 });
  });
});

describe("cumulativeByDay", () => {
  it("acumula o total dia a dia", () => {
    const byDay: RevenueDayBucket[] = [
      { day: "2026-07-01", label: "01/07", credit: 100, debit: 0, pix: 0, voucher: 0, total: 100 },
      { day: "2026-07-02", label: "02/07", credit: 0, debit: 0, pix: 0, voucher: 0, total: 0 },
      { day: "2026-07-03", label: "03/07", credit: 0, debit: 0, pix: 25, voucher: 0, total: 25 },
    ];
    expect(cumulativeByDay(byDay).map((d) => d.cumulative)).toEqual([100, 100, 125]);
  });

  it("período vazio devolve lista vazia", () => {
    expect(cumulativeByDay([])).toEqual([]);
  });
});

describe("rankTopProducts", () => {
  const products: RevenueProductTotal[] = [
    { product: "Coxinha", quantity: 10, amount: 50, txCount: 5 },
    { product: "Pastel", quantity: 20, amount: 30, txCount: 8 },
    { product: "Suco", quantity: 5, amount: 80, txCount: 3 },
  ];

  it("por quantidade: maior quantidade primeiro", () => {
    expect(rankTopProducts(products, "quantity").map((p) => p.product)).toEqual(["Pastel", "Coxinha", "Suco"]);
  });

  it("por valor: maior valor primeiro", () => {
    expect(rankTopProducts(products, "amount").map((p) => p.product)).toEqual(["Suco", "Coxinha", "Pastel"]);
  });

  it("não muta a lista original", () => {
    const original = [...products];
    rankTopProducts(products, "amount");
    expect(products).toEqual(original);
  });
});

describe("isPresetAllowed", () => {
  it("sem janela: todos os presets liberados", () => {
    expect(isPresetAllowed("month", null)).toBe(true);
  });

  it("janela de 7 dias: só hoje e 7 dias", () => {
    expect(isPresetAllowed("today", 7)).toBe(true);
    expect(isPresetAllowed("7d", 7)).toBe(true);
    expect(isPresetAllowed("30d", 7)).toBe(false);
    expect(isPresetAllowed("month", 7)).toBe(false);
  });

  it("janela de 31 dias: libera até o mês atual", () => {
    expect(isPresetAllowed("month", 31)).toBe(true);
  });
});

describe("isOutOfWindow", () => {
  it("sem data mínima: nunca bloqueia", () => {
    expect(isOutOfWindow(null, "2020-01-01", "2020-01-02")).toBe(false);
  });

  it("bloqueia quando `from` ou `to` ficam antes da data mínima", () => {
    expect(isOutOfWindow("2026-06-16", "2026-06-01", "2026-07-01")).toBe(true);
    expect(isOutOfWindow("2026-06-16", "2026-06-20", "2026-06-10")).toBe(true);
  });

  it("dentro da janela: não bloqueia", () => {
    expect(isOutOfWindow("2026-06-16", "2026-06-16", "2026-07-01")).toBe(false);
  });
});
