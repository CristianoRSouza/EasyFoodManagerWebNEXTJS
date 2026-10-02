import { describe, expect, it } from "vitest";
import { toNfcePayment } from "./nfce-payment-mapper";

describe("toNfcePayment", () => {
  it("mapeia uma forma de pagamento com troco em dinheiro", () => {
    const payment = toNfcePayment({
      seq: 1,
      forma_pagamento: "01",
      forma_descricao: "Dinheiro",
      valor: "50.00",
      troco: "10.00",
      tipo_integracao: null,
      integracao_descricao: null,
      bandeira_cartao: null,
      bandeira_descricao: null,
      nsu_autorizacao: null,
      cnpj_credenciadora: null,
    });
    expect(payment).toEqual({
      sequence: 1,
      method: "01",
      methodDescription: "Dinheiro",
      amount: 50,
      amountText: "50.00",
      change: 10,
      changeText: "10.00",
      integrationType: null,
      integrationDescription: null,
      cardBrand: null,
      cardBrandDescription: null,
      authorizationNsu: null,
      acquirerCnpj: null,
    });
  });

  it("troco ausente vira null, não zero (nem todo pagamento tem troco aplicável)", () => {
    const payment = toNfcePayment({ seq: 1, forma_pagamento: "17", valor: "10.00" });
    expect(payment.change).toBeNull();
    expect(payment.changeText).toBeNull();
  });

  // Validação de escrita (2026-10-01): o formulário de correção do legado edita o texto CRU da API
  // (`String(row.valor ?? "").trim()`), então "136.60" aparece e é enviado como "136.60" — não
  // "136.6" (o que `String(136.6)` daria a partir do número).
  it("guarda o texto cru de valor/troco, como a API mandou", () => {
    const payment = toNfcePayment({ seq: 1, forma_pagamento: "04", valor: "136.60", troco: "0.00" });
    expect(payment.amount).toBe(136.6);
    expect(payment.amountText).toBe("136.60");
    expect(payment.changeText).toBe("0.00");
  });
});
