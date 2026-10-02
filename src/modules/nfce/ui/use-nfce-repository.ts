"use client";

import { useMemo } from "react";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { NfceRepository } from "../application/nfce-repository";
import { ApiNfceRepository } from "../infrastructure/api-nfce-repository";

/** O repositório de NFC-e, amarrado à loja selecionada. */
export function useNfceRepository(): NfceRepository {
  const tenant = useRequiredTenant();
  const { backend } = useRuntime();
  return useMemo(() => new ApiNfceRepository(tenant, backend), [tenant, backend]);
}
