/**
 * Classificação tributária da reforma (IBS/CBS) associada ao `taxReform.taxClassCode` de um
 * `ProductFiscal`. Consulta separada porque a classe é compartilhada por muitos produtos — cada
 * um só guarda o código, e este é o catálogo de referência.
 */
export interface ProductTaxReformClass {
  description: string | null;
  rateType: string | null;
  taxTreatmentDescription: string | null;
  cbsReductionPercent: number | null;
  ibsStateReductionPercent: number | null;
  ibsMunicipalityReductionPercent: number | null;
  validFrom: string | null;
  validTo: string | null;
}

/**
 * Indicadores IBS/CBS da classe, já normalizados para Sim/Não (legado 1.3.12, PRs #32/#43): a loja
 * manda o caractere cru do governo ("0"/"1"/"S"/vazio) e a nuvem boolean/'S'/null — ver
 * `indicadorLigado`. Ausência é "não participa".
 */
export interface ProductTaxReformIndicator {
  ibsReductionPoints: number | null;
  cbsReductionPoints: number | null;
  reducesTaxBase: boolean;
  regularTaxationGroup: boolean;
  presumedCreditOpGroup: boolean;
  monophasicStandardGroup: boolean;
  creditReversalGroup: boolean;
}

export interface ProductFiscalIbsCbs {
  /** `null` quando o código de classe do produto não bate com nenhuma classe cadastrada. */
  taxClass: ProductTaxReformClass | null;
  indicator: ProductTaxReformIndicator | null;
}
