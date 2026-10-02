"use client";

import { useQuery } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useDashboardRepository } from "./use-dashboard-repository";

/**
 * O legado atualiza sozinho a cada 60s (pausando com a aba escondida via `visibilitychange`).
 * `refetchInterval` do TanStack Query já pausa em background por padrão
 * (`refetchIntervalInBackground: false`, olha o mesmo `document.visibilityState`/foco de
 * janela) — não precisa reimplementar o polling manual do legado.
 */
const REFRESH_INTERVAL_MS = 60_000;

export function useDashboardSnapshotQuery() {
  const tenant = useRequiredTenant();
  const { backend } = useRuntime();
  const repository = useDashboardRepository();

  return useQuery({
    queryKey: ["dashboard-snapshot", backend, tenant.companyId, tenant.storeId],
    queryFn: () => repository.snapshot(),
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}
