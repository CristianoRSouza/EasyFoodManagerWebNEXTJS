import { asNumberOrNull, asText } from "@/shared/infrastructure/convert";
import { indicadorLigado } from "@/shared/domain/ibscbs-indicator";
import type { ProductFiscalIbsCbs } from "../domain/product-fiscal-ibscbs";

type Row = Record<string, unknown>;

/** Traduz a resposta de `/v1/cbs/product-fiscal-ibscbs` (`{ taxClass, indicator }`, `snake_case`). */
export function toProductFiscalIbsCbs(data: { taxClass: Row | null; indicator: Row | null }): ProductFiscalIbsCbs {
  const { taxClass, indicator } = data;
  return {
    taxClass: taxClass
      ? {
          description: asText(taxClass.description),
          rateType: asText(taxClass.rate_type),
          taxTreatmentDescription: asText(taxClass.tax_treatment_description),
          cbsReductionPercent: asNumberOrNull(taxClass.cbs_reduction_percent),
          ibsStateReductionPercent: asNumberOrNull(taxClass.ibs_state_reduction_percent),
          ibsMunicipalityReductionPercent: asNumberOrNull(taxClass.ibs_municipality_reduction_percent),
          validFrom: asText(taxClass.valid_from),
          validTo: asText(taxClass.valid_to),
        }
      : null,
    indicator: indicator
      ? {
          ibsReductionPoints: asNumberOrNull(indicator.ibs_reduction_points),
          cbsReductionPoints: asNumberOrNull(indicator.cbs_reduction_points),
          reducesTaxBase: indicadorLigado(indicator.reduces_tax_base),
          regularTaxationGroup: indicadorLigado(indicator.regular_taxation_group),
          presumedCreditOpGroup: indicadorLigado(indicator.presumed_credit_op_group),
          monophasicStandardGroup: indicadorLigado(indicator.monophasic_standard_group),
          creditReversalGroup: indicadorLigado(indicator.credit_reversal_group),
        }
      : null,
  };
}
