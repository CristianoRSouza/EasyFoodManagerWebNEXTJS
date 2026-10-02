import { describe, expect, it } from "vitest";
import { toNfceNote, toNfceStatus, toPaymentMethods } from "./nfce-note-mapper";

describe("toNfceStatus", () => {
  it("dobra o alias em português `inutilizada` para `inutilized`", () => {
    expect(toNfceStatus("inutilizada")).toBe("inutilized");
  });

  it("aceita os status conhecidos e cai em draft para o resto", () => {
    expect(toNfceStatus("authorized")).toBe("authorized");
    expect(toNfceStatus("algo-nunca-visto")).toBe("draft");
    expect(toNfceStatus(null)).toBe("draft");
  });
});

describe("toNfceNote — statusText", () => {
  it("guarda o texto cru do status para exibição (o domínio continua em draft para status desconhecido)", () => {
    const note = toNfceNote({ id: "n1", status: "contingency" });
    expect(note.status).toBe("draft");
    expect(note.statusText).toBe("contingency");
  });
});

describe("toPaymentMethods", () => {
  it("separa a lista por vírgula e remove espaços", () => {
    expect(toPaymentMethods("03, 17")).toEqual(["03", "17"]);
  });

  it("string vazia ou ausente vira lista vazia, nunca [\"\"]", () => {
    expect(toPaymentMethods("")).toEqual([]);
    expect(toPaymentMethods(null)).toEqual([]);
  });
});

describe("toNfceNote", () => {
  it("mapeia a linha da listagem (alias em português) para o domínio em inglês", () => {
    const note = toNfceNote({
      id: "n1",
      numero: 100,
      serie: 1,
      chave_acesso: "352604...",
      status: "authorized",
      valor_total: "228.99",
      valor_desconto: "0",
      emissao_em: "2026-04-06T12:17:27.000Z",
      autorizada_em: "2026-04-06T12:17:32.000Z",
      protocolo: "13526000005224416",
      codigo_retorno: "100",
      motivo_retorno: "Autorizado o uso da NF-e",
      order_id: null,
      qrcode: null,
      emitente_cnpj: "13971933000178",
      emitente_razao: "EASY SOFT",
      emitente_fantasia: null,
      emitente_uf: "SP",
      destinatario_cpf: null,
      destinatario_nome: null,
      qtd_itens: 6,
      formas_pagamento: "17",
      tipo_emissao: 1,
      reconcile_status: null,
      retry_count: 0,
    });

    expect(note).toMatchObject({
      id: "n1",
      number: 100,
      serie: 1,
      status: "authorized",
      totalValue: 228.99,
      discountValue: 0,
      itemCount: 6,
      paymentMethods: ["17"],
      issuerCnpj: "13971933000178",
    });
  });
});
