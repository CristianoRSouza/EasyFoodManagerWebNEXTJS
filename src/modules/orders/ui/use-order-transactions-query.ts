"use client";

import { useQuery } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useOrderRepository } from "./use-order-repository";

/** Transações vinculadas a UMA comanda — carrega só quando a linha é expandida na tela. */
export function useOrderTransactionsQuery(orderId: string) {
  const tenant = useRequiredTenant();
  const repository = useOrderRepository();

  return useQuery({
    queryKey: ["order-transactions", tenant.companyId, tenant.storeId, orderId],
    queryFn: () => repository.listTransactionsByOrderId(orderId),
    enabled: Boolean(orderId),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
