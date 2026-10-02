"use client";

import { useQuery } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useUnitRepository } from "./use-unit-repository";

/** Unidades de medida da loja — lista curta, raramente muda (sincronizada do Firebird). */
export function useUnitsQuery() {
  const tenant = useRequiredTenant();
  const repository = useUnitRepository();

  return useQuery({
    queryKey: ["units", tenant.companyId, tenant.storeId],
    queryFn: () => repository.list(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}
