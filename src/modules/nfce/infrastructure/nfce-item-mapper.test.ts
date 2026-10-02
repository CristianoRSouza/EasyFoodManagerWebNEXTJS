import { describe, expect, it } from "vitest";
import { toNfceItem } from "./nfce-item-mapper";

describe("toNfceItem", () => {
  it("mapeia campos básicos e o bloco ICMS (CST ou CSOSN, o que vier)", () => {
    const item = toNfceItem({
      item: 1,
      codigo_produto: "7891000",
      ean: null,
      descricao: "Refrigerante Lata",
      ncm: "22021000",
      cest: null,
      cfop: "5102",
      unidade: "UN",
      quantidade: "2.000",
      preco_unitario: "6.50",
      valor_bruto: "13.00",
      desconto: null,
      frete: null,
      seguro: null,
      outras_despesas: null,
      info_adicional: null,
      icms_origem: 0,
      icms_cst_csosn: "102",
      icms_bc: null,
      icms_aliquota: null,
      icms_valor: null,
      icms_st_valor: null,
      icms_fcp_valor: null,
      sn_aliq_credito: null,
      sn_valor_credito: null,
      pis_cst: "49",
      pis_bc: "13.00",
      pis_aliquota: "1.65",
      pis_valor: "0.21",
      cofins_cst: "49",
      cofins_bc: "13.00",
      cofins_aliquota: "7.6",
      cofins_valor: "0.98",
      total_tributos: "1.19",
    });

    expect(item).toMatchObject({
      sequence: 1,
      description: "Refrigerante Lata",
      quantity: 2,
      unitPrice: 6.5,
      grossValue: 13,
      icms: expect.objectContaining({ cstOrCsosn: "102", csosn500: null }),
      pis: expect.objectContaining({ cst: "49", value: 0.21 }),
    });
  });

  it("csosn500 aparece só quando algum campo da substituição tributária veio preenchido", () => {
    const item = toNfceItem({
      item: 1,
      codigo_produto: "1",
      descricao: "x",
      ncm: "1",
      cfop: "5102",
      unidade: "UN",
      quantidade: "1",
      preco_unitario: "1",
      valor_bruto: "1",
      icms_cst_csosn: "500",
      csosn500_p_st: "10",
    });
    expect(item.icms.csosn500).toMatchObject({ stRate: 10 });
  });
});
