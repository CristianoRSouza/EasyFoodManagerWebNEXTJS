"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { OrderRepository } from "../application/order-repository";
import { ApiOrderRepository } from "../infrastructure/api-order-repository";

/** O repositório de comandas, amarrado à loja selecionada. */
export function useOrderRepository(): OrderRepository {
  const tenant = useRequiredTenant();
  return useMemo(() => new ApiOrderRepository(tenant), [tenant]);
}
