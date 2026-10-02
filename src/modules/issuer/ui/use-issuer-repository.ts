"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { ApiIssuerRepository } from "../infrastructure/api-issuer-repository";
import type { IssuerRepository } from "../application/issuer-repository";

/** O repositório do emitente NFC-e do backend ativo, amarrado à loja selecionada. */
export function useIssuerRepository(): IssuerRepository {
  const tenant = useRequiredTenant();
  return useMemo(() => new ApiIssuerRepository(tenant), [tenant]);
}
