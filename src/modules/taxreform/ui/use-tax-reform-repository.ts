"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { TaxReformRepository } from "../application/tax-reform-repository";
import { ApiTaxReformRepository } from "../infrastructure/api-tax-reform-repository";

/** O repositório das tabelas de referência CBS/IBS, amarrado à loja selecionada. */
export function useTaxReformRepository(): TaxReformRepository {
  const tenant = useRequiredTenant();
  return useMemo(() => new ApiTaxReformRepository(tenant), [tenant]);
}
