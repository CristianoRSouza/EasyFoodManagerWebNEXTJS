"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { ApiPixnopdvRepository } from "../infrastructure/api-pixnopdv-repository";
import type { PixnopdvRepository } from "../application/pixnopdv-repository";

/** O repositório de credenciais PIXnoPDV, amarrado à loja selecionada. */
export function usePixnopdvRepository(): PixnopdvRepository {
  const tenant = useRequiredTenant();
  return useMemo(() => new ApiPixnopdvRepository(tenant), [tenant]);
}
