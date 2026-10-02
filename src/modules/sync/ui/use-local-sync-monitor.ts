"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/shared/ui/use-toast";
import type { SyncLog } from "../domain/sync-log";
import { useSyncLogsQuery } from "./use-sync-logs-query";
import { useSyncRepository } from "./use-sync-repository";

const NO_LOGS: SyncLog[] = [];

/**
 * Estado do monitor da loja — porta de `loadData` do `LEGACY/src/pages/SyncMonitor.tsx`.
 *
 * - Carga inicial: só o log; os painéis de Inbox/Outbox carregam sozinhos ao abrir a aba.
 * - Falha na carga inicial não mostra erro (o legado só registrava no console): a tela abre
 *   com o log vazio.
 * - "Atualizar dados": recarrega o log e, se der certo, remonta os dois painéis (troca da `key`,
 *   o `eventsPanelsKey` do legado) e mostra o toast; se falhar, só o toast de falha.
 */
export function useLocalSyncMonitor() {
  const repository = useSyncRepository();
  const logsQuery = useSyncLogsQuery();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [eventsPanelsKey, setEventsPanelsKey] = useState(0);

  const inboxFetchers = useMemo(() => repository.queueFetchers("inbox"), [repository]);
  const outboxFetchers = useMemo(() => repository.queueFetchers("outbox"), [repository]);
  const resetInboxToPending = useMemo(() => (eventId: string) => repository.resetInboxToPending(eventId), [repository]);

  const refresh = async () => {
    setRefreshing(true);
    const result = await logsQuery.refetch();
    setRefreshing(false);
    if (result.isError) {
      toast({
        title: "Falha ao atualizar",
        description: "Não foi possível recarregar o monitor de sincronização.",
        variant: "destructive",
      });
      return;
    }
    setEventsPanelsKey((k) => k + 1);
    toast({
      title: "Dados atualizados",
      description: "Log (FB→PG) e painéis Inbox/Outbox (PG↔SB) foram recarregados.",
    });
  };

  return {
    loading: logsQuery.isLoading,
    logs: logsQuery.data ?? NO_LOGS,
    refreshing,
    refresh,
    eventsPanelsKey,
    inboxFetchers,
    outboxFetchers,
    resetInboxToPending,
  };
}
