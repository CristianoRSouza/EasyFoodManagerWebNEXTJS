"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { ApiTotemRepository } from "../infrastructure/api-totem-repository";
import type { TotemRepository } from "../application/totem-repository";

/** O repositório de Totens do backend ativo, amarrado à loja selecionada. */
export function useTotemRepository(): TotemRepository {
  const tenant = useRequiredTenant();
  const { backend } = useRuntime();
  return useMemo(() => new ApiTotemRepository(tenant, backend), [tenant, backend]);
}
