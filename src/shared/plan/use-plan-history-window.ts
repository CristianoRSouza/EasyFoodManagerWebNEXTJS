"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/shared/http/api-client";
import type { Envelope } from "@/shared/http/envelope";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useTenant } from "@/shared/tenant/tenant-context";

export interface PlanHistoryWindow {
  planSlug: string | null;
  planName: string | null;
  /** Janela máxima de histórico em dias permitida pelo plano. `null` = sem limite. */
  historyWindowDays: number | null;
}

const UNLIMITED_WINDOW: PlanHistoryWindow = { planSlug: null, planName: null, historyWindowDays: null };

/**
 * Janela máxima de dias que o plano ATIVO da empresa permite consultar nos relatórios
 * (`billing.module_plans.history_window_days`).
 *
 * - **Nuvem**: quem cruza licença × plano é a API — uma consulta, com JOIN: `GET /billing/plan-window`.
 * - **Loja (LAN)**: o conceito de plano/licença é só da nuvem; devolve `historyWindowDays: null`
 *   (sem limite) sem fazer nenhuma chamada.
 *
 * Sem plano ou sem janela cadastrada, devolve `historyWindowDays: null` — sem restrição. O
 * fallback é permissivo de propósito: bloquear relatório por falta de cadastro puniria o usuário
 * por um problema que não é dele (mesma regra do legado).
 */
export function usePlanHistoryWindow(): UseQueryResult<PlanHistoryWindow> {
  const { backend } = useRuntime();
  const { selection } = useTenant();

  return useQuery<PlanHistoryWindow>({
    queryKey: ["plan-history-window", backend, selection?.companyId ?? null],
    enabled: backend === "lan" || Boolean(selection),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (backend !== "cloud") return UNLIMITED_WINDOW;
      const response = await apiRequest<Envelope<PlanHistoryWindow>>("/billing/plan-window", {
        tenant: selection,
      });
      return response.data;
    },
  });
}
