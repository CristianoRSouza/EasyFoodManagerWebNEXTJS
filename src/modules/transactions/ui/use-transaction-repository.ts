"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { TransactionRepository } from "../application/transaction-repository";
import { ApiTransactionRepository } from "../infrastructure/api-transaction-repository";

export function useTransactionRepository(): TransactionRepository {
  const tenant = useRequiredTenant();
  return useMemo(() => new ApiTransactionRepository(tenant), [tenant]);
}
