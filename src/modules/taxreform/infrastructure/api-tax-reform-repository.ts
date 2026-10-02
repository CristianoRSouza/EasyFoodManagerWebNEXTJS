import type { TaxReformRepository } from "../application/tax-reform-repository";
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
import { apiRequest } from "@/shared/http/api-client";
import { toQueryString } from "@/shared/http/query-string";
import type { Tenant } from "@/shared/tenant/use-required-tenant";

type QueryParams = Record<string, string | number | undefined>;

/**
 * As 11 tabelas de referência CBS/IBS, pela Admin API (`/v1/cbs/*`).
 *
 * Em vez de 15 implementações repetindo `apiRequest` + `response.data ?? []`, há um único método
 * genérico (`fetchList`); cada leitura pública é uma linha que só fixa a rota, os parâmetros e o
 * tipo de retorno — a tipagem forte fica por conta do genérico de `fetchList<T>`, não de duplicar
 * a chamada HTTP.
 */
export class ApiTaxReformRepository implements TaxReformRepository {
  constructor(private readonly tenant: Tenant) {}

  private async fetchList<T>(resource: string, params: QueryParams = {}): Promise<T[]> {
    const response = await apiRequest<{ data: T[] }>(`/cbs/${resource}${toQueryString(params)}`, {
      tenant: this.tenant,
    });
    return response.data ?? [];
  }

  fetchUnionReferenceRate(limit = 24): Promise<CbsUnionReferenceRate[]> {
    return this.fetchList<CbsUnionReferenceRate>("union-reference-rate", { limit });
  }

  fetchOpenDatasetVersion(): Promise<CbsOpenDatasetVersion[]> {
    return this.fetchList<CbsOpenDatasetVersion>("open-dataset-version");
  }

  fetchTaxClassIbscbsType(limit = 120): Promise<CbsTaxClassIbscbsType[]> {
    return this.fetchList<CbsTaxClassIbscbsType>("tax-class-ibscbs-type", { limit });
  }

  fetchTaxClassIbscbs(limit = 120): Promise<CbsTaxClassIbscbs[]> {
    return this.fetchList<CbsTaxClassIbscbs>("tax-class-ibscbs", { limit });
  }

  fetchTaxClassIbscbsIndicator(limit = 120): Promise<CbsTaxClassIbscbsIndicator[]> {
    return this.fetchList<CbsTaxClassIbscbsIndicator>("tax-class-ibscbs-indicator", { limit });
  }

  fetchMunicipalityWithRateByUf(uf: string): Promise<CbsMunicipalityWithRate[]> {
    return this.fetchList<CbsMunicipalityWithRate>("municipality-with-rate-by-uf", { uf });
  }

  fetchLegalBasis(limit = 200): Promise<CbsLegalBasis[]> {
    return this.fetchList<CbsLegalBasis>("legal-basis", { limit });
  }

  fetchCstIbscbsIndicator(limit = 120): Promise<CbsCstIbscbsIndicator[]> {
    return this.fetchList<CbsCstIbscbsIndicator>("cst-ibscbs-indicator", { limit });
  }

  fetchCstIbscbs(limit = 120): Promise<CbsCstIbscbs[]> {
    return this.fetchList<CbsCstIbscbs>("cst-ibscbs", { limit });
  }

  fetchState(): Promise<CbsState[]> {
    return this.fetchList<CbsState>("state");
  }

  fetchStateReferenceRate(stateCode?: number, limit = 120): Promise<CbsStateReferenceRate[]> {
    return this.fetchList<CbsStateReferenceRate>("state-reference-rate", { stateCode, limit });
  }
}
