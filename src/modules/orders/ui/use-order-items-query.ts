"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useOrderRepository } from "./use-order-repository";
import type { DateRange } from "../application/order-repository";

/** Itens de todas as comandas do período (para somar subtotal linha a linha na listagem). */
export function useOrderItemsQuery(range: DateRange, enabled: boolean) {
  const tenant = useRequiredTenant();
  const repository = useOrderRepository();

  return useQuery({
    queryKey: ["order-items", tenant.companyId, tenant.storeId, range.from ?? null, range.to ?? null],
    queryFn: () => repository.listOrderItems(range),
    enabled,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
