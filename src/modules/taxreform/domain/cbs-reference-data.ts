/**
 * Tipos das tabelas de referência CBS/IBS (reforma tributária), um por rota `/v1/cbs/*` da
 * EasyFoodAPI (`easyfoodmanagerAPI/src/routes/v1/cbs.ts`).
 *
 * Cada interface reflete SÓ as colunas que a rota de fato seleciona (`SELECT ...`) — não o
 * conjunto mais largo de `easyfoodmanagerWEB/src/lib/mock-data.ts`, que inclui colunas
 * (`raw_json`, `label`, etc.) que essas rotas nunca devolvem. Colunas `NUMERIC` do Postgres
 * chegam como `string` (o driver `pg` não faz parse automático de `numeric`), então alíquotas e
 * percentuais são tipados como `string`, não `number` — mesma leitura do legado.
 */

export interface CbsUnionReferenceRate {
  reference_date: string;
  valid_from: string;
  valid_to: string | null;
  reference_rate: string;
  own_rate: string;
  updated_at: string;
}

export interface CbsOpenDatasetVersion {
  id: string;
  dataset_description: string;
  provider_app_version: string;
  provider_db_version: string;
  updated_at: string;
}

export interface CbsTaxClassIbscbsType {
  class_code: string;
  reference_date: string;
  acronym: string;
  type_code: string | null;
  description: string;
}

export interface CbsTaxClassIbscbs {
  class_code: string;
  reference_date: string;
  description: string;
  rate_type: string | null;
  tax_treatment_description: string | null;
  valid_from: string;
  valid_to: string | null;
  updated_at: string;
  /** `NUMERIC` — chega como texto, não `number` (ver comentário do topo do arquivo). */
  cbs_reduction_percent: string | null;
  ibs_state_reduction_percent: string | null;
  ibs_municipality_reduction_percent: string | null;
}

export interface CbsTaxClassIbscbsIndicator {
  class_code: string;
  /** `NUMERIC` — chega como texto, não `number` (ver comentário do topo do arquivo). */
  ibs_reduction_points: string | null;
  cbs_reduction_points: string | null;
  /** Loja: caractere cru ("0"/"S"/vazio). Nuvem: boolean. Ler com `indicadorLigado` (legado 1.3.12, PR #32). */
  reduces_tax_base: boolean | string | null;
  regular_taxation_group: string | null;
  presumed_credit_op_group: string | null;
  monophasic_standard_group: string | null;
  monophasic_withholding_group: string | null;
  monophasic_substitution_group: string | null;
  monophasic_diff_group: string | null;
  credit_reversal_group: string | null;
  credit_recipient_notes: string | null;
}

/** Junção `cbs_municipality` + `cbs_municipality_reference_rate` (LEFT JOIN: campos de alíquota podem faltar). */
export interface CbsMunicipalityWithRate {
  code: string;
  state_abbreviation: string;
  name: string;
  updated_at: string;
  reference_date: string | null;
  valid_from: string | null;
  valid_to: string | null;
  reference_rate: string | null;
  own_rate_mun: string | null;
  rate_updated_at: string | null;
}

export interface CbsLegalBasis {
  tax_class_code: string;
  tax_class_description: string;
  tax_situation_code: string | null;
  tax_situation_description: string | null;
  tax_subset_label: string | null;
  statutory_reference: string | null;
  valid_from: string;
  valid_to: string | null;
}

/**
 * Indicadores por CST. A loja manda "0"/"1" (ou "S"/"N"); a nuvem, boolean — ler com
 * `indicadorLigado` (legado 1.3.12, PR #45: "0"/"N" apareciam como S).
 */
export interface CbsCstIbscbsIndicator {
  cst_code: string;
  group_ibscbs: boolean | string | null;
  group_ibscbs_monophasic: boolean | string | null;
  group_reduction: boolean | string | null;
  group_differential: boolean | string | null;
  group_credit_transfer: boolean | string | null;
  group_presumed_zfm: boolean | string | null;
  group_competence_adjust: boolean | string | null;
  allows_nfe: boolean | string | null;
  allows_nfce: boolean | string | null;
  allows_cte: boolean | string | null;
  allows_cte_os: boolean | string | null;
  allows_bpe: boolean | string | null;
  allows_bpe_tm: boolean | string | null;
  allows_nf3e: boolean | string | null;
  allows_nfcom: boolean | string | null;
  allows_nfse: boolean | string | null;
}

export interface CbsCstIbscbs {
  api_record_id: number;
  reference_date: string;
  cst_code: string;
  description: string;
  valid_from: string;
  valid_to: string | null;
  updated_at: string;
}

export interface CbsState {
  code: number;
  abbreviation: string;
  name: string;
  updated_at: string;
}

export interface CbsStateReferenceRate {
  state_code: number;
  reference_date: string;
  valid_from: string | null;
  valid_to: string | null;
  reference_rate: string | null;
  own_rate: string | null;
  updated_at: string;
}

