"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/shared/http/api-client";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { TENANT_STORAGE_KEYS, resolveSelection, type Company, type Selection, type Store } from "./tenant";

export interface TenantState {
  loading: boolean;
  companies: Company[];
  storesByCompany: Record<string, Store[]>;
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

function useCloudTenant(): TenantState {
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<Selection | null>(null);

  const context = useQuery({
    queryKey: ["tenant", "context"],
    queryFn: () => apiRequest<CloudContext>("/me/context"),
    staleTime: 5 * 60_000,
  });
  const stores = useQuery({
    queryKey: ["tenant", "all-stores"],
    queryFn: async () =>
      (await apiRequest<CloudStore[]>("/me/all-stores")).map<Store>((s) => ({
        id: s.id,
        company_id: s.company_id,
        trade_name: s.trade_name ?? "",
        legacy_store_code: String(s.legacy_store_code ?? ""),
      })),
    staleTime: 5 * 60_000,
  });

  const companies = useMemo<Company[]>(
    () => (context.data?.companies ?? []).map((c) => ({ id: c.id, name: c.name ?? "", cnpj: c.cnpj ?? "" })),
    [context.data],
  );
  const allStores = useMemo(() => stores.data ?? [], [stores.data]);
  const selection = chosen ?? (stores.data ? resolveSelection({ stores: allStores, saved: readSaved() }) : null);

  const select = useCallback((companyId: string, storeId: string) => {
    const next = { companyId, storeId };
    persist(next);
    setChosen(next);
  }, []);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tenant"] });
  }, [queryClient]);

  const loading = context.isPending || stores.isPending;
  // Como no legado: com uma empresa só, ela já aparece no cabeçalho antes de escolher a loja.
  const selectedCompanyId = selection?.companyId ?? (companies.length === 1 ? companies[0]!.id : null);
  return {
    loading,
    companies,
    storesByCompany: groupByCompany(allStores),
    selection,
    selectedCompany: companies.find((c) => c.id === selectedCompanyId) ?? null,
    selectedStore: allStores.find((s) => s.id === selection?.storeId) ?? null,
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
  const selection = identity.data ? { companyId: identity.data.company_id, storeId: identity.data.store_id } : null;
  return {
    loading: identity.isPending,
    companies: [],
    storesByCompany: {},
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
