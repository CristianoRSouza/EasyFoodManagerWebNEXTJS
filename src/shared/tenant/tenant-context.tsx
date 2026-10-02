"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/shared/http/api-client";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { TENANT_STORAGE_KEYS, resolveSelection, type Company, type Selection, type Store } from "./tenant";

export interface TenantState {
  loading: boolean;
  companies: Company[];
  /**
   * Lojas conhecidas, por empresa. Até o seletor pedir `loadAllStores()`, só as da empresa ativa
   * (`/me/stores`); depois, as de todas as empresas (`/me/all-stores`) — como o
   * `allStoresByCompany` do legado.
   */
  storesByCompany: Record<string, Store[]>;
  /** `/me/all-stores` já chegou (o seletor mostra o carregando até lá). */
  allStoresLoaded: boolean;
  /** Pede `/me/all-stores` — chamado pelo seletor ao abrir, como o `fetchAllStores` do legado. */
  loadAllStores(): void;
  selection: Selection | null;
  selectedCompany: Company | null;
  selectedStore: Store | null;
  needsSelection: boolean;
  isSystemAdmin: boolean;
  isCompanyAdmin: boolean;
  select(companyId: string, storeId: string): void;
  refresh(): Promise<void>;
}

interface CloudContext {
  is_system_admin: boolean;
  is_company_admin: boolean;
  companies: { id: string; name: string | null; cnpj: string | null }[];
}

interface CloudStore {
  id: string;
  company_id: string;
  trade_name: string | null;
  legacy_store_code: string | number | null;
}

const TenantContext = createContext<TenantState | null>(null);

function readSaved() {
  try {
    return {
      companyId: localStorage.getItem(TENANT_STORAGE_KEYS.company),
      storeId: localStorage.getItem(TENANT_STORAGE_KEYS.store),
    };
  } catch {
    return { companyId: null, storeId: null };
  }
}

function persist(selection: Selection) {
  try {
    localStorage.setItem(TENANT_STORAGE_KEYS.company, selection.companyId);
    localStorage.setItem(TENANT_STORAGE_KEYS.store, selection.storeId);
  } catch {
    /* navegador sem armazenamento: a escolha vale só nesta aba */
  }
}

function groupByCompany(stores: Store[]): Record<string, Store[]> {
  return stores.reduce<Record<string, Store[]>>((groups, store) => {
    (groups[store.company_id] ??= []).push(store);
    return groups;
  }, {});
}

function toStore(s: CloudStore): Store {
  return {
    id: s.id,
    company_id: s.company_id,
    trade_name: s.trade_name ?? "",
    legacy_store_code: String(s.legacy_store_code ?? ""),
  };
}

/**
 * Paridade com o `CompanyStoreContext` do legado (modo EasyFoodAPI): a cada carga de página só
 * `/me/context` + `/me/stores` da empresa ativa (cabeçalho `x-company-id`); `/me/all-stores` —
 * 555 lojas para um admin do sistema — só quando o seletor de loja abre (`loadAllStores`).
 * A empresa ativa é a escolhida, senão a salva (se ainda visível), senão a única.
 */
function useCloudTenant(): TenantState {
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<Selection | null>(null);
  const [allStoresRequested, setAllStoresRequested] = useState(false);

  const context = useQuery({
    queryKey: ["tenant", "context"],
    queryFn: () => apiRequest<CloudContext>("/me/context"),
    staleTime: 5 * 60_000,
  });

  const companies = useMemo<Company[]>(
    () => (context.data?.companies ?? []).map((c) => ({ id: c.id, name: c.name ?? "", cnpj: c.cnpj ?? "" })),
    [context.data],
  );
  const saved = useMemo(() => readSaved(), []);
  const activeCompanyId =
    chosen?.companyId ??
    (companies.some((c) => c.id === saved.companyId) ? saved.companyId : null) ??
    (companies.length === 1 ? companies[0]!.id : null);

  const companyStores = useQuery({
    queryKey: ["tenant", "stores", activeCompanyId],
    queryFn: async () =>
      (await apiRequest<CloudStore[]>("/me/stores", { tenant: { companyId: activeCompanyId! } })).map(toStore),
    enabled: activeCompanyId !== null,
    staleTime: 5 * 60_000,
  });
  const allStores = useQuery({
    queryKey: ["tenant", "all-stores"],
    queryFn: async () => (await apiRequest<CloudStore[]>("/me/all-stores")).map(toStore),
    enabled: allStoresRequested,
    staleTime: 5 * 60_000,
  });

  const storesOfCompany = useMemo(() => companyStores.data ?? [], [companyStores.data]);
  // Identidade estável: sem isto, cada render devolveria um objeto novo e os hooks
  // `use-*-repository.ts` do resto do app recriariam o repositório a cada render (ver
  // fase-2-revisao-final.md, Menor 1).
  const selection = useMemo(() => {
    if (chosen) return chosen;
    if (!companyStores.data) return null;
    const resolved = resolveSelection({ stores: storesOfCompany, saved });
    // Com várias empresas, só a loja salva vale: a auto-seleção de loja única era (e continua)
    // restrita a quem só enxerga uma loja no total — o que exige empresa única.
    if (resolved && companies.length > 1 && resolved.storeId !== saved.storeId) return null;
    return resolved;
  }, [chosen, companyStores.data, storesOfCompany, saved, companies.length]);

  const storesByCompany = useMemo<Record<string, Store[]>>(() => {
    if (allStores.data) return groupByCompany(allStores.data);
    return activeCompanyId && companyStores.data ? { [activeCompanyId]: companyStores.data } : {};
  }, [allStores.data, activeCompanyId, companyStores.data]);

  const select = useCallback((companyId: string, storeId: string) => {
    const next = { companyId, storeId };
    persist(next);
    setChosen(next);
  }, []);

  const loadAllStores = useCallback(() => setAllStoresRequested(true), []);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tenant"] });
  }, [queryClient]);

  // Depois de uma escolha no seletor a seleção já existe: a troca de empresa não volta a "carregando".
  const loading = context.isPending || (!chosen && activeCompanyId !== null && companyStores.isPending);
  // Como no legado: com uma empresa só, ela já aparece no cabeçalho antes de escolher a loja.
  const selectedCompanyId = selection?.companyId ?? (companies.length === 1 ? companies[0]!.id : null);
  const selectedStoreId = selection?.storeId;
  return {
    loading,
    companies,
    storesByCompany,
    allStoresLoaded: allStores.isSuccess,
    loadAllStores,
    selection,
    selectedCompany: companies.find((c) => c.id === selectedCompanyId) ?? null,
    // Logo após trocar de empresa no seletor, a loja já está na lista de todas as lojas enquanto
    // o `/me/stores` da nova empresa chega.
    selectedStore:
      storesOfCompany.find((s) => s.id === selectedStoreId) ?? allStores.data?.find((s) => s.id === selectedStoreId) ?? null,
    needsSelection: !loading && !selection,
    isSystemAdmin: context.data?.is_system_admin === true,
    isCompanyAdmin: context.data?.is_company_admin === true,
    select,
    refresh,
  };
}

function useLanTenant(): TenantState {
  const identity = useQuery({
    queryKey: ["tenant", "site-identity"],
    queryFn: () => apiRequest<{ company_id: string; store_id: string }>("/site-identity"),
    staleTime: Infinity,
  });
  const selection = useMemo(
    () => (identity.data ? { companyId: identity.data.company_id, storeId: identity.data.store_id } : null),
    [identity.data],
  );
  return {
    loading: identity.isPending,
    companies: [],
    storesByCompany: {},
    allStoresLoaded: false,
    loadAllStores: () => undefined,
    selection,
    selectedCompany: null,
    selectedStore: null,
    needsSelection: false,
    isSystemAdmin: false,
    isCompanyAdmin: false,
    select: () => undefined,
    refresh: async () => undefined,
  };
}

function CloudTenantProvider({ children }: { children: ReactNode }) {
  return <TenantContext.Provider value={useCloudTenant()}>{children}</TenantContext.Provider>;
}

function LanTenantProvider({ children }: { children: ReactNode }) {
  return <TenantContext.Provider value={useLanTenant()}>{children}</TenantContext.Provider>;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { backend } = useRuntime();
  return backend === "cloud" ? <CloudTenantProvider>{children}</CloudTenantProvider> : <LanTenantProvider>{children}</LanTenantProvider>;
}

export function useTenant(): TenantState {
  const tenant = useContext(TenantContext);
  if (!tenant) throw new Error("useTenant fora do TenantProvider.");
  return tenant;
}
