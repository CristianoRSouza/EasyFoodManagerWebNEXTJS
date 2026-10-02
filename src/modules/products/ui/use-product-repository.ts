"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { ApiProductRepository } from "../infrastructure/api-product-repository";
import type { ProductRepository } from "../application/product-repository";

/** O repositório de produtos do backend ativo, amarrado à loja selecionada. */
export function useProductRepository(): ProductRepository {
  const tenant = useRequiredTenant();
  const { backend } = useRuntime();
  return useMemo(() => new ApiProductRepository(tenant, backend), [tenant, backend]);
}
