"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { BootstrapCodeRepository } from "../application/bootstrap-code-repository";
import { ApiBootstrapCodeRepository } from "../infrastructure/api-bootstrap-code-repository";

/**
 * O repositório de códigos de primeiro acesso, amarrado à loja selecionada. Só é chamado no
 * modo nuvem — `BootstrapCodesPage` mostra o estado "indisponível" antes de montar qualquer
 * coisa que dependa de tenant no modo loja.
 */
export function useBootstrapCodeRepository(): BootstrapCodeRepository {
  const tenant = useRequiredTenant();
  return useMemo(() => new ApiBootstrapCodeRepository(tenant), [tenant]);
}
