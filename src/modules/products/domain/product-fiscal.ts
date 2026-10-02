/**
 * A classificação fiscal de um produto.
 *
 * É o que determina o imposto que sai na nota. Os valores tributários são guardados como texto
 * porque vêm assim do cadastro do PDV: converter para número transformaria "0,00" e vazio na
 * mesma coisa, e a diferença entre alíquota zero e alíquota não informada importa (é o que a
 * tela mostra com "—").
 */
export interface ProductFiscal {
  productId: string;
  identification: FiscalIdentification;
  icms: FiscalIcms;
  pis: FiscalContribution;
  cofins: FiscalContribution;
  /** Alíquotas de referência do NCM (Lei 12.741) e classe da reforma tributária (IBS/CBS). */
  taxReform: FiscalTaxReform;
}

export interface FiscalIdentification {
  ncm: string | null;
  cfop: string | null;
  cfopDescription: string | null;
  /** "S" = Saída, "E" = Entrada — como vem do cadastro. */
  cfopEntryExit: string | null;
  cest: string | null;
  fiscalUnit: string | null;
  taxRuleDescription: string | null;
  taxBenefitCode: string | null;
  ipiTaxSituation: string | null;
}

export interface FiscalIcms {
  /** 0 = nacional; os demais indicam importação, total ou parcial. */
  origin: number | null;
  originState: string | null;
  /** CST no Regime Normal, CSOSN no Simples Nacional. Nunca os dois. */
  cst: string | null;
  csosn: string | null;
  description: string | null;
  type: string | null;
  rate: string | null;
  rateFundoPobreza: string | null;
  reductionPercent: string | null;
  creditRateSimples: string | null;
  substitutionRate: string | null;
  substitutionRateFundoPobreza: string | null;
  substitutionMargin: string | null;
  /** "S"/"N" — como vem do cadastro. */
  resellerFlag: string | null;
}

export interface FiscalContribution {
  cst: string | null;
  description: string | null;
  calculationType: string | null;
  rate: string | null;
  rateValue: string | null;
}

export interface FiscalTaxReform {
  taxClassCode: string | null;
  nationalRate: string | null;
  importedRate: string | null;
  stateRate: string | null;
}
