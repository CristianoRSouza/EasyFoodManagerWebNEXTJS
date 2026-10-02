"use client";

import { useQuery } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useSyncRepository } from "./use-sync-repository";

/**
 * Aba "Log" do monitor da loja (`fetchSyncLogs` do legado). Sem novas tentativas nem recarga
 * ao focar a janela: o legado buscava uma vez na montagem e depois só pelo "Atualizar dados".
 */
export function useSyncLogsQuery() {
  const { companyId, storeId } = useRequiredTenant();
  const repository = useSyncRepository();

  return useQuery({
    queryKey: ["sync", "logs", companyId, storeId],
    queryFn: () => repository.listLogs(),
    retry: false,
    refetchOnWindowFocus: false,
  });
}
