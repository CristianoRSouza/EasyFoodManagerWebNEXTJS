"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { RevenueRepository } from "../application/revenue-repository";
import { ApiRevenueRepository } from "../infrastructure/api-revenue-repository";

/**
 * Ponto único que o resto da `ui/` do módulo importa para obter dados — nunca a
 * infraestrutura diretamente. O tenant é obrigatório por construção (`useRequiredTenant`): a
 * tela só monta atrás do `StoreGate`, que já bloqueia o conteúdo sem loja selecionada.
 */
export function useRevenueRepository(): RevenueRepository {
  const tenant = useRequiredTenant();
  return useMemo(() => new ApiRevenueRepository(tenant), [tenant]);
}
