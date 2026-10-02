import { asNumberOrNull, asText } from "@/shared/infrastructure/convert";
import type { ProductFiscal } from "../domain/product-fiscal";

type Row = Record<string, unknown>;

/**
 * Traduz a linha de `/v1/products/:id/fiscal` (a view `product_fiscal`, `snake_case`).
 *
 * Alíquotas continuam como texto — convertê-las para número faria "0,00" e vazio virarem a
 * mesma coisa, e a diferença entre alíquota zero e alíquota não informada é o que a tela
 * distingue com "—".
 */
export function toProductFiscal(row: Row, productId: string): ProductFiscal {
  return {
    productId: asText(row.product_id) ?? productId,
    identification: {
      ncm: asText(row.ncm),
      cfop: asText(row.cfop),
      cfopDescription: asText(row.cfop_description),
      cfopEntryExit: asText(row.cfop_entry_exit),
      cest: asText(row.cest),
      fiscalUnit: asText(row.fiscal_unit),
      taxRuleDescription: asText(row.tax_rule_description),
      taxBenefitCode: asText(row.tax_benefit_code),
      ipiTaxSituation: asText(row.ipi_tax_situation),
    },
    icms: {
      origin: asNumberOrNull(row.icms_origin),
      originState: asText(row.origin_state),
      cst: asText(row.cst_icms),
      csosn: asText(row.csosn),
      description: asText(row.icms_description),
      type: asText(row.icms_type),
      rate: asText(row.icms_aliquota),
      rateFundoPobreza: asText(row.icms_aliquota_fe),
      reductionPercent: asText(row.icms_reduction_percent),
      creditRateSimples: asText(row.aliquota_credito_sn),
      substitutionRate: asText(row.icms_st_aliquota),
      substitutionRateFundoPobreza: asText(row.icms_st_aliquota_fe),
      substitutionMargin: asText(row.icms_st_margin_value),
      resellerFlag: asText(row.reseller_flag),
    },
    pis: {
      cst: asText(row.cst_pis),
      description: asText(row.pis_description),
      calculationType: asText(row.pis_calculation_type),
      rate: asText(row.pis_aliquota),
      rateValue: asText(row.pis_aliquota_value),
    },
    cofins: {
      cst: asText(row.cst_cofins),
      description: asText(row.cofins_description),
      calculationType: asText(row.cofins_calculation_type),
      rate: asText(row.cofins_aliquota),
      rateValue: asText(row.cofins_aliquota_value),
    },
    taxReform: {
      taxClassCode: asText(row.ibscbs_tax_class_code),
      nationalRate: asText(row.aliquota_nacional),
      importedRate: asText(row.aliquota_importado),
      stateRate: asText(row.aliquota_estadual),
    },
  };
}
