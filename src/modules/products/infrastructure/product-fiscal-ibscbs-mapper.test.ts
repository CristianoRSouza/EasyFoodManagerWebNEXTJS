import { toProductFiscalIbsCbs } from "./product-fiscal-ibscbs-mapper";

describe("toProductFiscalIbsCbs", () => {
  it("mapeia taxClass e indicator quando presentes", () => {
    const result = toProductFiscalIbsCbs({
      taxClass: {
        class_code: "000001",
        description: "Tributação integral",
        rate_type: "standard",
        tax_treatment_description: "Padrão",
        cbs_reduction_percent: 0,
        ibs_state_reduction_percent: 0,
        ibs_municipality_reduction_percent: 0,
        valid_from: "2026-01-01",
        valid_to: null,
      },
      indicator: {
        class_code: "000001",
        ibs_reduction_points: 0,
        cbs_reduction_points: 0,
        reduces_tax_base: false,
        regular_taxation_group: "1",
        presumed_credit_op_group: null,
        monophasic_standard_group: null,
        credit_reversal_group: null,
      },
    });
    expect(result.taxClass).toEqual({
      description: "Tributação integral",
      rateType: "standard",
      taxTreatmentDescription: "Padrão",
      cbsReductionPercent: 0,
      ibsStateReductionPercent: 0,
      ibsMunicipalityReductionPercent: 0,
      validFrom: "2026-01-01",
      validTo: null,
    });
    expect(result.indicator).toEqual({
      ibsReductionPoints: 0,
      cbsReductionPoints: 0,
      reducesTaxBase: false,
      regularTaxationGroup: true,
      presumedCreditOpGroup: false,
      monophasicStandardGroup: false,
      creditReversalGroup: false,
    });
  });

  it('loja: "0" é Não e "S"/"1" é Sim — "0" não vira Sim (legado 1.3.12, PR #32)', () => {
    const { indicator } = toProductFiscalIbsCbs({
      taxClass: null,
      indicator: { reduces_tax_base: "S", regular_taxation_group: "0", presumed_credit_op_group: "1", monophasic_standard_group: "", credit_reversal_group: "0" },
    });
    expect(indicator).toMatchObject({
      reducesTaxBase: true,
      regularTaxationGroup: false,
      presumedCreditOpGroup: true,
      monophasicStandardGroup: false,
      creditReversalGroup: false,
    });
  });

  it("devolve null para taxClass/indicator ausentes (classe não encontrada)", () => {
    const result = toProductFiscalIbsCbs({ taxClass: null, indicator: null });
    expect(result).toEqual({ taxClass: null, indicator: null });
  });
});
