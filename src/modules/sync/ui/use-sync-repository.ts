"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { SyncRepository } from "../application/sync-repository";
import { ApiSyncRepository } from "../infrastructure/api-sync-repository";

/** O repositório do monitor de sincronização, amarrado à loja selecionada. */
export function useSyncRepository(): SyncRepository {
  const { companyId, storeId } = useRequiredTenant();
  return useMemo(() => new ApiSyncRepository({ companyId, storeId }), [companyId, storeId]);
}
