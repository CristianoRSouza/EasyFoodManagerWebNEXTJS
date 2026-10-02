import { describe, expect, it } from "vitest";
import {
  computeApprovedTotals,
  filterTransactions,
  formatOrderBarcodes,
  formatOrderIds,
  hasPixSnapshot,
  hasTefSnapshot,
  paymentMethodKey,
  paymentMethodLabel,
  type Transaction,
} from "./transaction";

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    orderIds: [],
    paymentMethod: "credit_card",
    amount: 10,
    installments: 1,
    nsu: null,
    authorizationCode: null,
    tefTransactionId: null,
    status: "approved",
    createdAt: "2026-01-01T10:00:00.000Z",
    tefResult: null,
    tefCancelFbSaleAlreadyClosed: false,
    tefCancelFbSaleMessage: null,
    pixQrcodeId: null,
    pixStatus: null,
    pixTxid: null,
    pixE2eId: null,
    pixPaidAt: null,
    pixLastPollAt: null,
    pixProviderUrl: null,
    ...overrides,
  };
}

describe("paymentMethodKey", () => {
  it("reconhece crédito, débito, PIX e dinheiro por substring do enum da PG", () => {
    expect(paymentMethodKey("credit_card")).toBe("credit");
    expect(paymentMethodKey("debit_card")).toBe("debit");
    expect(paymentMethodKey("pix")).toBe("pix");
    expect(paymentMethodKey("cash")).toBe("cash");
    expect(paymentMethodKey("dinheiro")).toBe("cash");
  });

  it("cai em 'other' para métodos desconhecidos", () => {
    expect(paymentMethodKey("voucher")).toBe("other");
  });

  it("voucher tem chave própria: refeição e alimentação (legado 1.3.12, PR #23)", () => {
    expect(paymentMethodKey("meal_voucher")).toBe("meal_voucher");
    expect(paymentMethodKey("food_voucher")).toBe("food_voucher");
    expect(paymentMethodLabel("meal_voucher")).toBe("Vale Refeição");
    expect(paymentMethodLabel("food_voucher")).toBe("Vale Alimentação");
  });
});

describe("paymentMethodLabel", () => {
  it("traduz os quatro métodos conhecidos", () => {
    expect(paymentMethodLabel("credit_card")).toBe("Crédito");
    expect(paymentMethodLabel("pix")).toBe("PIX");
  });

  it("método desconhecido mostra o valor como veio da PG (sem tradução)", () => {
    expect(paymentMethodLabel("voucher")).toBe("voucher");
  });
});

describe("filterTransactions", () => {
  const transactions = [
    makeTransaction({ id: "a", paymentMethod: "credit_card", status: "approved" }),
    makeTransaction({ id: "b", paymentMethod: "pix", status: "pending" }),
    makeTransaction({ id: "c", paymentMethod: "debit_card", status: "approved" }),
  ];

  it("sem filtro devolve tudo", () => {
    expect(filterTransactions(transactions, { method: "all", status: "all" })).toHaveLength(3);
  });

  it("filtra por método", () => {
    const result = filterTransactions(transactions, { method: "pix", status: "all" });
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });

  it("filtra por status", () => {
    const result = filterTransactions(transactions, { method: "all", status: "pending" });
    expect(result.map((t) => t.id)).toEqual(["b"]);
  });

  it("combina os dois filtros", () => {
    const result = filterTransactions(transactions, { method: "debit", status: "approved" });
    expect(result.map((t) => t.id)).toEqual(["c"]);
  });
});

describe("computeApprovedTotals", () => {
  it("soma só as aprovadas, por método", () => {
    const totals = computeApprovedTotals([
      makeTransaction({ paymentMethod: "credit_card", amount: 10, status: "approved" }),
      makeTransaction({ paymentMethod: "credit_card", amount: 5, status: "approved" }),
      makeTransaction({ paymentMethod: "credit_card", amount: 999, status: "declined" }),
      makeTransaction({ paymentMethod: "pix", amount: 20, status: "approved" }),
    ]);
    expect(totals).toEqual({ credit: 15, debit: 0, pix: 20 });
  });
});

describe("hasTefSnapshot", () => {
  it("false sem tef_result", () => {
    expect(hasTefSnapshot(makeTransaction({ tefResult: null }))).toBe(false);
  });

  it("true quando há via do comprovante", () => {
    expect(
      hasTefSnapshot(makeTransaction({ tefResult: { merchantReceipt: ["linha 1"] } })),
    ).toBe(true);
  });

  it("true quando há apenas storedAt", () => {
    expect(hasTefSnapshot(makeTransaction({ tefResult: { storedAt: "2026-01-01" } }))).toBe(true);
  });
});

describe("hasPixSnapshot", () => {
  it("false sem nenhum campo PIX preenchido", () => {
    expect(hasPixSnapshot(makeTransaction())).toBe(false);
  });

  it("true com qualquer campo PIX preenchido", () => {
    expect(hasPixSnapshot(makeTransaction({ pixStatus: "paid" }))).toBe(true);
  });
});

describe("formatOrderIds", () => {
  it("sem ids devolve travessão", () => {
    expect(formatOrderIds([])).toEqual({ primary: "—", full: "" });
    expect(formatOrderIds(null)).toEqual({ primary: "—", full: "" });
  });

  it("com ids, o primeiro é o principal e todos aparecem no full", () => {
    expect(formatOrderIds(["o1", "o2"])).toEqual({ primary: "o1", full: "o1, o2" });
  });
});

describe("formatOrderBarcodes", () => {
  it("traduz cada id para o código de barras da comanda", () => {
    const map = new Map([["o1", "789"], ["o2", "790"]]);
    expect(formatOrderBarcodes(["o1", "o2"], map)).toEqual({ primary: "789", full: "789, 790" });
  });

  it("comanda sem código de barras conhecido aparece como travessão", () => {
    const map = new Map<string, string>();
    expect(formatOrderBarcodes(["o1"], map)).toEqual({ primary: "—", full: "—" });
  });
});
