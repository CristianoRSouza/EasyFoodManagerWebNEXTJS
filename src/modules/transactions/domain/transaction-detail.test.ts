import { describe, expect, it } from "vitest";
import { formatReceiptLines, getTefCancelFbSaleInfo, summarizeAditumConfirmation } from "./transaction-detail";
import type { Transaction } from "./transaction";

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
    status: "cancelled",
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

describe("formatReceiptLines", () => {
  it("vazio/nulo vira string vazia", () => {
    expect(formatReceiptLines(null)).toBe("");
    expect(formatReceiptLines([])).toBe("");
  });

  it("junta as linhas com quebra, tratando null como linha em branco", () => {
    expect(formatReceiptLines(["linha 1", null, "linha 3"])).toBe("linha 1\n\nlinha 3");
  });
});

describe("summarizeAditumConfirmation", () => {
  it("sem confirmação", () => {
    expect(summarizeAditumConfirmation(null)).toBe("—");
  });

  it("erro reportado pela Aditum", () => {
    expect(summarizeAditumConfirmation({ error: "timeout" })).toBe("Erro: timeout");
  });

  it("HTTP com confirmação no corpo", () => {
    expect(summarizeAditumConfirmation({ httpStatus: 200, json: { confirmed: true } })).toBe(
      "HTTP 200 · confirmado",
    );
  });

  it("HTTP sem confirmação no corpo", () => {
    expect(summarizeAditumConfirmation({ httpStatus: 500, json: {} })).toBe("HTTP 500");
  });
});

describe("getTefCancelFbSaleInfo", () => {
  it("null quando não está sinalizado", () => {
    expect(getTefCancelFbSaleInfo(makeTransaction())).toBeNull();
  });

  it("mensagem da própria transação quando sinalizada na coluna dedicada", () => {
    const info = getTefCancelFbSaleInfo(
      makeTransaction({ tefCancelFbSaleAlreadyClosed: true, tefCancelFbSaleMessage: "venda já fechada" }),
    );
    expect(info).toEqual({ message: "venda já fechada" });
  });

  it("cai para a mensagem dentro do tef_result quando a coluna dedicada está vazia", () => {
    const info = getTefCancelFbSaleInfo(
      makeTransaction({
        tefResult: { tefCancelFbSaleAlreadyClosed: true, tefCancelAdminMessage: "mensagem do snapshot" },
      }),
    );
    expect(info).toEqual({ message: "mensagem do snapshot" });
  });

  it("mensagem padrão quando sinalizado mas sem texto explicativo", () => {
    const info = getTefCancelFbSaleInfo(makeTransaction({ tefCancelFbSaleAlreadyClosed: true }));
    expect(info?.message).toMatch(/ja estava fechada no Firebird/);
  });
});
