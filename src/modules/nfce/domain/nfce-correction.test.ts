import { describe, expect, it } from "vitest";
import { formatCurrency } from "./nfce-formatters";
import {
  validateNfceManualCorrection,
  type NfceManualCorrectionContext,
  type NfceManualCorrectionPayload,
} from "./nfce-correction";

function context(partial: Partial<NfceManualCorrectionContext> = {}): NfceManualCorrectionContext {
  return {
    status: "manual_review",
    taxRegimeCode: 3,
    issuerUf: "SP",
    recipientUf: "SP",
    noteTotal: 100,
    ...partial,
  };
}

function payload(partial: Partial<NfceManualCorrectionPayload> = {}): NfceManualCorrectionPayload {
  return {
    recipient: { cpf: "", cnpj: "", name: "", email: "" },
    infoComplementar: "",
    items: [{ item: 1, ncm: "12345678", cfop: "5102", cest: "", icmsCstCsosn: "00" }],
    payments: [{ seq: 1, paymentMethod: "17", paymentValue: "100.00" }],
    ...partial,
  };
}

describe("validateNfceManualCorrection", () => {
  it("aceita uma correção consistente (Regime Normal, PIX cobre o total)", () => {
    expect(validateNfceManualCorrection(context(), payload())).toEqual({ ok: true });
  });

  it("rejeita fora do estado manual_review — invariante 1 (estado)", () => {
    const result = validateNfceManualCorrection(context({ status: "authorized" }), payload());
    expect(result).toEqual({
      ok: false,
      error: "A edição é permitida somente para NFC-e pendente de correção.",
    });
  });

  // ── Itens — mensagens de `validateManualCorrectionBeforeSave` (legado, validação de tela) ──

  it("rejeita NCM fora de 8 dígitos", () => {
    const result = validateNfceManualCorrection(
      context(),
      payload({ items: [{ item: 1, ncm: "123", cfop: "5102", cest: "", icmsCstCsosn: "00" }] }),
    );
    expect(result).toEqual({ ok: false, error: "Item 1: NCM deve ter 8 dígitos." });
  });

  it("rejeita CFOP fora de 4 dígitos", () => {
    const result = validateNfceManualCorrection(
      context(),
      payload({ items: [{ item: 1, ncm: "12345678", cfop: "51", cest: "", icmsCstCsosn: "00" }] }),
    );
    expect(result).toEqual({ ok: false, error: "Item 1: CFOP deve ter 4 dígitos." });
  });

  it("rejeita CFOP fora da faixa de saída (5xxx/6xxx)", () => {
    const result = validateNfceManualCorrection(
      context(),
      payload({ items: [{ item: 1, ncm: "12345678", cfop: "1102", cest: "", icmsCstCsosn: "00" }] }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Item 1: CFOP deve iniciar com 5 ou 6 para NFC-e de saída.",
    });
  });

  it("operação interna (emitente e destinatário na mesma UF) exige CFOP 5xxx", () => {
    const result = validateNfceManualCorrection(
      context({ issuerUf: "SP", recipientUf: "SP" }),
      payload({ items: [{ item: 1, ncm: "12345678", cfop: "6102", cest: "", icmsCstCsosn: "00" }] }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Item 1: CFOP inválido para SP->SP. Esperado: 5xxx (operação interna).",
    });
  });

  it("operação interestadual exige CFOP 6xxx, e usa a UF do payload quando informada", () => {
    const result = validateNfceManualCorrection(
      context({ issuerUf: "SP", recipientUf: "SP" }),
      payload({
        recipientUf: "RJ",
        items: [{ item: 1, ncm: "12345678", cfop: "5102", cest: "", icmsCstCsosn: "00" }],
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Item 1: CFOP inválido para SP->RJ. Esperado: 6xxx (operação interestadual).",
    });
  });

  it("Simples Nacional rejeita CSOSN fora da lista permitida", () => {
    const result = validateNfceManualCorrection(
      context({ taxRegimeCode: 1 }),
      payload({ items: [{ item: 1, ncm: "12345678", cfop: "5102", cest: "", icmsCstCsosn: "999" }] }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Item 1: CSOSN inválido para CRT 1. Use 101, 102, 103, 201, 202, 203, 300, 400, 500 ou 900.",
    });
  });

  it("Simples Nacional rejeita CST no lugar de CSOSN (2 dígitos não está na lista de CSOSN)", () => {
    const result = validateNfceManualCorrection(
      context({ taxRegimeCode: 2 }),
      payload({ items: [{ item: 1, ncm: "12345678", cfop: "5102", cest: "", icmsCstCsosn: "00" }] }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Item 1: CSOSN inválido para CRT 2. Use 101, 102, 103, 201, 202, 203, 300, 400, 500 ou 900.",
    });
  });

  it("Regime Normal rejeita CST fora da lista permitida", () => {
    const result = validateNfceManualCorrection(
      context({ taxRegimeCode: 3 }),
      payload({ items: [{ item: 1, ncm: "12345678", cfop: "5102", cest: "", icmsCstCsosn: "99" }] }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Item 1: CST inválido para CRT 3. Use 00, 10, 20, 30, 40, 41, 50, 51, 60, 70 ou 90.",
    });
  });

  // ── Pagamentos — mensagens de `validateManualCorrectionBeforeSave` (legado, validação de tela) ──

  it("rejeita forma de pagamento com código de tamanho inválido", () => {
    const result = validateNfceManualCorrection(
      context(),
      payload({ payments: [{ seq: 1, paymentMethod: "1", paymentValue: "100" }] }),
    );
    expect(result).toEqual({ ok: false, error: "Pagamento 1: forma de pagamento inválida." });
  });

  it("rejeita valor de pagamento inválido", () => {
    const result = validateNfceManualCorrection(
      context(),
      payload({ payments: [{ seq: 1, paymentMethod: "17", paymentValue: "abc" }] }),
    );
    expect(result).toEqual({ ok: false, error: "Pagamento 1: valor inválido." });
  });

  it("rejeita troco inválido", () => {
    const result = validateNfceManualCorrection(
      context(),
      payload({ payments: [{ seq: 1, paymentMethod: "01", paymentValue: "100", changeValue: "abc" }] }),
    );
    expect(result).toEqual({ ok: false, error: "Pagamento 1: troco inválido." });
  });

  it("rejeita troco maior que o valor pago", () => {
    const result = validateNfceManualCorrection(
      context(),
      payload({ payments: [{ seq: 1, paymentMethod: "01", paymentValue: "50", changeValue: "60" }] }),
    );
    expect(result).toEqual({ ok: false, error: "Pagamento 1: troco não pode ser maior que o valor." });
  });

  it("rejeita troco em forma de pagamento diferente de dinheiro", () => {
    const result = validateNfceManualCorrection(
      context(),
      payload({ payments: [{ seq: 1, paymentMethod: "03", paymentValue: "100", changeValue: "5" }] }),
    );
    expect(result).toEqual({ ok: false, error: "Pagamento 1: troco só se aplica a dinheiro (01)." });
  });

  it("aceita troco em dinheiro", () => {
    const result = validateNfceManualCorrection(
      context({ noteTotal: 50 }),
      payload({ payments: [{ seq: 1, paymentMethod: "01", paymentValue: "60", changeValue: "10" }] }),
    );
    expect(result).toEqual({ ok: true });
  });

  // ── Invariante 1 (CLAUDE.md) — a última rede de segurança, mesma ordem do legado ──
  //
  // A invariante 1a (o total dos itens não pode mudar) não tem teste de runtime aqui: não há
  // como simular "o total mudou", porque `NfceManualCorrectionItem` não carrega `quantity`/
  // `unitPrice`/`grossValue` — a garantia é o próprio tipo do payload (ver comentário no topo de
  // `nfce-correction.ts`), não uma comparação de números.

  it("invariante 1b: rejeita quando pagamentos menos troco somam menos que o total da nota (mensagem do inline de tela, com o total formatado)", () => {
    const result = validateNfceManualCorrection(
      context({ noteTotal: 100 }),
      payload({ payments: [{ seq: 1, paymentMethod: "17", paymentValue: "80.00" }] }),
    );
    expect(result).toEqual({
      ok: false,
      error: `Pagamentos: soma menos troco não pode ser menor que o total da nota (${formatCurrency(100)}).`,
    });
  });

  it("aceita vírgula decimal nos valores de pagamento", () => {
    const result = validateNfceManualCorrection(
      context({ noteTotal: 10.5 }),
      payload({ payments: [{ seq: 1, paymentMethod: "17", paymentValue: "10,50" }] }),
    );
    expect(result).toEqual({ ok: true });
  });
});
