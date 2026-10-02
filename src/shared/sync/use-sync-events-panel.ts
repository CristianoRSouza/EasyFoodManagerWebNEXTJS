"use client";

/**
 * Estado e carga do `SyncEventsPanel` — o corpo de estado de
 * `LEGACY/src/components/sync/SyncEventsPanel.tsx` (useState/loadData/loadMoreEvents/
 * handleRequeueInbox), sem mudança de regra, toasts ou textos:
 *
 * - carga inicial e "Atualizar dados" disparam as 8 consultas em paralelo (`allSettled`); só a
 *   falha de `summary` vira erro da tela, as demais mantêm o valor anterior;
 * - "últimos eventos" pagina de 50 em 50 (scroll infinito); recarregar volta à 1ª página e
 *   recolhe as linhas abertas;
 * - reenfileirar (só inbox local) recarrega em silêncio, sem o toast "Dados atualizados".
 */
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/shared/ui/use-toast";
import {
  SYNC_ACTIVE_RETRIES_LIMIT,
  SYNC_EVENTS_PAGE_SIZE as PAGE_SIZE,
  SYNC_RECENT_FAILURES_LIMIT,
} from "./sync-events-format";
import type {
  PanelActiveRetry,
  PanelBacklogItem,
  PanelByEntity,
  PanelFailureGroup,
  PanelRatePoint,
  PanelRecentEvent,
  PanelRecentFailure,
  PanelSummary,
  SyncEventsPanelFetchers,
} from "./sync-events-types";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  const msg = (err as { message?: unknown } | null | undefined)?.message;
  return typeof msg === "string" ? msg : String(err);
}

export function useSyncEventsPanel({
  fetchers,
  refreshSuccessMsg,
  onResetInboxToPending,
}: {
  fetchers: SyncEventsPanelFetchers;
  refreshSuccessMsg: string;
  onResetInboxToPending?: (eventId: string) => Promise<void>;
}) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<PanelSummary | null>(null);
  const [byEntity, setByEntity] = useState<PanelByEntity[]>([]);
  const [failures, setFailures] = useState<PanelFailureGroup[]>([]);
  const [retries, setRetries] = useState<PanelActiveRetry[]>([]);
  const [backlog, setBacklog] = useState<PanelBacklogItem[]>([]);
  const [recent, setRecent] = useState<PanelRecentFailure[]>([]);
  const [rate, setRate] = useState<PanelRatePoint[]>([]);
  const [events, setEvents] = useState<PanelRecentEvent[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [requeueingId, setRequeueingId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const loadMoreEvents = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchers.recentAll(PAGE_SIZE, events.length);
      setHasMore(page.length === PAGE_SIZE);
      setEvents((prev) => [...prev, ...page]);
    } catch (err: unknown) {
      toast({ title: "Falha ao carregar eventos", description: errorMessage(err), variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  }, [events.length, hasMore, loadingMore, toast, fetchers]);

  const loadData = useCallback(async (silent = false, suppressSuccessToast = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const [sRes, eRes, fRes, rRes, bRes, lRes, rateRes, evRes] = await Promise.allSettled([
        fetchers.summary(),
        fetchers.byEntity(),
        fetchers.failures(),
        fetchers.activeRetries(SYNC_ACTIVE_RETRIES_LIMIT),
        fetchers.backlog(),
        fetchers.recentFailures(SYNC_RECENT_FAILURES_LIMIT),
        fetchers.rate(),
        fetchers.recentAll(PAGE_SIZE, 0),
      ]);

      if (sRes.status === "fulfilled") setSummary(sRes.value);
      else throw sRes.reason;
      if (eRes.status === "fulfilled") setByEntity(eRes.value);
      if (fRes.status === "fulfilled") setFailures(fRes.value);
      if (rRes.status === "fulfilled") setRetries(rRes.value);
      if (bRes.status === "fulfilled") setBacklog(bRes.value);
      if (lRes.status === "fulfilled") setRecent(lRes.value);
      if (rateRes.status === "fulfilled") setRate(rateRes.value);
      if (evRes.status === "fulfilled") {
        setEvents(evRes.value);
        setHasMore(evRes.value.length === PAGE_SIZE);
        setExpanded(new Set());
      }

      if (silent && !suppressSuccessToast) {
        toast({ title: "Dados atualizados", description: refreshSuccessMsg });
      }
    } catch (err: unknown) {
      const msg = errorMessage(err);
      setError(msg);
      if (silent) toast({ title: "Falha ao atualizar", description: msg, variant: "destructive" });
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, [fetchers, refreshSuccessMsg, toast]);

  const requeue = useCallback(async (eventId: string) => {
    if (!onResetInboxToPending) return;
    setRequeueingId(eventId);
    try {
      await onResetInboxToPending(eventId);
      toast({
        title: "Reenfileirado",
        description: "O evento voltou para pending e será reprocessado pelo serviço de sync.",
      });
      await loadData(true, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Falha ao reenfileirar", description: msg, variant: "destructive" });
    } finally {
      setRequeueingId(null);
    }
  }, [loadData, onResetInboxToPending, toast]);

  /** "Atualizar dados": recarrega em silêncio e mostra o toast de sucesso. */
  const refresh = useCallback(() => loadData(true), [loadData]);

  // Carga inicial só na montagem, como o legado (`useEffect(() => loadData(), [])`).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial na montagem, mesmo comportamento do legado
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na montagem, como o legado; trocar `fetchers` não recarrega
  }, []);

  return {
    loading,
    refreshing,
    error,
    summary,
    byEntity,
    failures,
    retries,
    backlog,
    recent,
    rate,
    events,
    loadingMore,
    hasMore,
    expanded,
    requeueingId,
    toggleExpand,
    loadMoreEvents,
    refresh,
    requeue,
  };
}
