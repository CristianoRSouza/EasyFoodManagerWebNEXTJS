"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { SyncMirrorRepository } from "../application/sync-mirror-repository";
import { ApiSyncMirrorRepository } from "../infrastructure/api-sync-mirror-repository";

/** O repositório do Espelho FB↔PG, amarrado à loja selecionada. */
export function useSyncMirrorRepository(): SyncMirrorRepository {
  const tenant = useRequiredTenant();
  return useMemo(() => new ApiSyncMirrorRepository(tenant), [tenant]);
}
