"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useOrderRepository } from "./use-order-repository";
import type { DateRange } from "../application/order-repository";

/** Comandas do período. Habilitada só quando o período está dentro da janela do plano. */
export function useOrdersQuery(range: DateRange, enabled: boolean) {
  const tenant = useRequiredTenant();
  const repository = useOrderRepository();

  return useQuery({
    queryKey: ["orders", tenant.companyId, tenant.storeId, range.from ?? null, range.to ?? null],
    queryFn: () => repository.listOrders(range),
    enabled,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
