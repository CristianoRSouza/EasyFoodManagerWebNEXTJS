"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { UnitRepository } from "../application/unit-repository";
import { ApiUnitRepository } from "../infrastructure/api-unit-repository";

/** O repositório de unidades de medida, amarrado à loja selecionada. */
export function useUnitRepository(): UnitRepository {
  const tenant = useRequiredTenant();
  return useMemo(() => new ApiUnitRepository(tenant), [tenant]);
}
