"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { summarizeCredits } from "../domain/credits";
import { useAssistantRepository } from "./use-assistant-repository";

/**
 * Repique do extrato — substitui a subscrição realtime do Supabase do legado, como o próprio
 * legado faz no caminho da EasyFoodAPI: 30 s é rápido o bastante para o saldo mudar sozinho depois
 * de uma compra em outra aba.
 */
const POLL_MS = 30_000;

/** Créditos de IA da LOJA ativa: cota grátis do dia e saldo (`useAICredits` do legado). */
export function useAICredits() {
  const repo = useAssistantRepository();
  const { companyId, storeId } = useRequiredTenant();

  const usageQuery = useQuery({
    queryKey: ["ai-usage-log", companyId, storeId],
    queryFn: () => repo.usage(),
    staleTime: 60_000,
    refetchInterval: POLL_MS,
  });
  const creditsQuery = useQuery({
    queryKey: ["ai-credit-transactions", companyId, storeId],
    queryFn: () => repo.creditAmounts(),
    staleTime: 60_000,
    refetchInterval: POLL_MS,
  });

  const { refetch: refetchUsage } = usageQuery;
  const { refetch: refetchCredits } = creditsQuery;
  const refetchAll = useCallback(() => {
    void refetchUsage();
    void refetchCredits();
  }, [refetchUsage, refetchCredits]);

  return {
    ...summarizeCredits(usageQuery.data ?? [], creditsQuery.data ?? []),
    isLoading: usageQuery.isLoading,
    refetchAll,
  };
}
