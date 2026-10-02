import type {
  CbsCstIbscbs,
  CbsCstIbscbsIndicator,
  CbsLegalBasis,
  CbsMunicipalityWithRate,
  CbsOpenDatasetVersion,
  CbsState,
  CbsStateReferenceRate,
  CbsTaxClassIbscbs,
  CbsTaxClassIbscbsIndicator,
  CbsTaxClassIbscbsType,
  CbsUnionReferenceRate,
} from "../domain/cbs-reference-data";

/**
 * Leitura das 11 tabelas de referência CBS/IBS da reforma tributária (`/v1/cbs/*`), usadas pela
 * tela Configuração fiscal (`/nfce-issuer-fiscal`). Dados globais — não levam tenant na URL — mas
 * a leitura ainda exige empresa/loja selecionada (mesma exigência de sessão das demais telas).
 *
 * `limit` sem valor usa o default da própria rota (ver `easyfoodmanagerAPI/src/routes/v1/cbs.ts`);
 * os valores passados pela tela (300, 500, 1000...) reproduzem o que o legado pedia por seção.
 */
export interface TaxReformRepository {
  fetchUnionReferenceRate(limit?: number): Promise<CbsUnionReferenceRate[]>;
  fetchOpenDatasetVersion(): Promise<CbsOpenDatasetVersion[]>;
  fetchTaxClassIbscbsType(limit?: number): Promise<CbsTaxClassIbscbsType[]>;
  fetchTaxClassIbscbs(limit?: number): Promise<CbsTaxClassIbscbs[]>;
  fetchTaxClassIbscbsIndicator(limit?: number): Promise<CbsTaxClassIbscbsIndicator[]>;
  fetchMunicipalityWithRateByUf(uf: string): Promise<CbsMunicipalityWithRate[]>;
  fetchLegalBasis(limit?: number): Promise<CbsLegalBasis[]>;
  fetchCstIbscbsIndicator(limit?: number): Promise<CbsCstIbscbsIndicator[]>;
  fetchCstIbscbs(limit?: number): Promise<CbsCstIbscbs[]>;
  fetchState(): Promise<CbsState[]>;
  fetchStateReferenceRate(stateCode?: number, limit?: number): Promise<CbsStateReferenceRate[]>;
}
