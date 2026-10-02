"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useRuntime } from "@/shared/runtime/runtime-context";
import type { DashboardRepository } from "../application/dashboard-repository";
import { ApiDashboardRepository } from "../infrastructure/api-dashboard-repository";

/** O repositório do Dashboard do backend ativo, amarrado à loja selecionada. */
export function useDashboardRepository(): DashboardRepository {
  const tenant = useRequiredTenant();
  const { backend } = useRuntime();
  return useMemo(() => new ApiDashboardRepository(tenant, backend), [tenant, backend]);
}
