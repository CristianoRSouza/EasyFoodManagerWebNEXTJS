export interface Company {
  id: string;
  name: string;
  cnpj: string;
}

export interface Store {
  id: string;
  company_id: string;
  trade_name: string;
  legacy_store_code: string;
}

export interface Selection {
  companyId: string;
  storeId: string;
}

/** Mesmas chaves do legado: quem já usava o painel continua na loja que escolheu. */
export const TENANT_STORAGE_KEYS = { company: "cp.selectedCompanyId", store: "cp.selectedStoreId" } as const;

export function resolveSelection(input: {
  stores: Store[];
  saved: { companyId: string | null; storeId: string | null };
}): Selection | null {
  const { stores, saved } = input;
  const savedStore = stores.find((s) => s.id === saved.storeId && s.company_id === saved.companyId);
  if (savedStore) return { companyId: savedStore.company_id, storeId: savedStore.id };
  const [only, ...rest] = stores;
  if (only && rest.length === 0) return { companyId: only.company_id, storeId: only.id };
  return null;
}
