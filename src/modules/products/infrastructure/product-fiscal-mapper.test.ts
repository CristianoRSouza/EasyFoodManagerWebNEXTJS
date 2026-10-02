import { toProductFiscal } from "./product-fiscal-mapper";

const fullRow = {
  product_id: "p1",
  ncm: "21069090",
  cfop: "5102",
  cfop_description: "Venda de mercadoria",
  cfop_entry_exit: "S",
  cest: "1234567",
  fiscal_unit: "UN",
  tax_rule_description: "Regra padrão",
  tax_benefit_code: "BC01",
  ipi_tax_situation: "53",
  icms_origin: 0,
  origin_state: "SP",
  cst_icms: null,
  csosn: "102",
  icms_description: "Tributada",
  icms_type: "normal",
  icms_aliquota: "18.00",
  icms_aliquota_fe: "2.00",
  icms_reduction_percent: "0.00",
  aliquota_credito_sn: "1.25",
  icms_st_aliquota: null,
  icms_st_aliquota_fe: null,
  icms_st_margin_value: null,
  reseller_flag: "N",
  cst_pis: "01",
  pis_description: "Tributável",
  pis_calculation_type: "percentual",
  pis_aliquota: "1.65",
  pis_aliquota_value: null,
  cst_cofins: "01",
  cofins_description: "Tributável",
  cofins_calculation_type: "percentual",
  cofins_aliquota: "7.60",
  cofins_aliquota_value: null,
  ibscbs_tax_class_code: "000001",
  aliquota_nacional: "5.6789",
  aliquota_importado: "0.0000",
  aliquota_estadual: "1.2345",
};

describe("toProductFiscal", () => {
  it("mapeia todos os grupos a partir da linha crua", () => {
    const fiscal = toProductFiscal(fullRow, "p1");
    expect(fiscal.productId).toBe("p1");
    expect(fiscal.identification).toEqual({
      ncm: "21069090",
      cfop: "5102",
      cfopDescription: "Venda de mercadoria",
      cfopEntryExit: "S",
      cest: "1234567",
      fiscalUnit: "UN",
      taxRuleDescription: "Regra padrão",
      taxBenefitCode: "BC01",
      ipiTaxSituation: "53",
    });
    expect(fiscal.icms).toEqual({
      origin: 0,
      originState: "SP",
      cst: null,
      csosn: "102",
      description: "Tributada",
      type: "normal",
      rate: "18.00",
      rateFundoPobreza: "2.00",
      reductionPercent: "0.00",
      creditRateSimples: "1.25",
      substitutionRate: null,
      substitutionRateFundoPobreza: null,
      substitutionMargin: null,
      resellerFlag: "N",
    });
    expect(fiscal.pis).toEqual({
      cst: "01",
      description: "Tributável",
      calculationType: "percentual",
      rate: "1.65",
      rateValue: null,
    });
    expect(fiscal.cofins).toEqual({
      cst: "01",
      description: "Tributável",
      calculationType: "percentual",
      rate: "7.60",
      rateValue: null,
    });
    expect(fiscal.taxReform).toEqual({
      taxClassCode: "000001",
      nationalRate: "5.6789",
      importedRate: "0.0000",
      stateRate: "1.2345",
    });
  });

  it("usa o productId do parâmetro quando a linha não tem product_id", () => {
    const fiscal = toProductFiscal({}, "fallback-id");
    expect(fiscal.productId).toBe("fallback-id");
    expect(fiscal.identification.ncm).toBeNull();
  });

  it("preserva alíquota zero como texto '0.00' (diferente de não informada = null)", () => {
    const fiscal = toProductFiscal({ ...fullRow, icms_reduction_percent: "0.00" }, "p1");
    expect(fiscal.icms.reductionPercent).toBe("0.00");
    const semInfo = toProductFiscal({ ...fullRow, icms_reduction_percent: null }, "p1");
    expect(semInfo.icms.reductionPercent).toBeNull();
  });
});
