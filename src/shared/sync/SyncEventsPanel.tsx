"use client";

/**
 * Painel de eventos de sync (inbox/outbox), compartilhado pelas telas de Sincronização (loja e
 * nuvem). Porta de `LEGACY/src/components/sync/SyncEventsPanel.tsx` (813 linhas), dividida em:
 * `use-sync-events-panel.ts` (estado/carga), `SyncSummaryCards`, `SyncEntityCards`,
 * `SyncFailureCards`, `SyncRecentEventsCard`/`SyncRecentEventRow` e `SyncBadges`. JSX, classes
 * e textos idênticos ao legado.
 *
 * O legado já recebia os dados por `fetchers` (o ramo Electron/Admin API/Supabase ficava em
 * `local-sync-monitor.ts` / `CloudSyncMonitor.tsx`); aqui é igual — cada tela injeta a porta.
 */
import type { ReactNode } from "react";
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { TooltipProvider } from "@/shared/ui/primitives/tooltip";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { SyncSummaryCards } from "./SyncSummaryCards";
import { SyncBacklogCard, SyncByEntityCard } from "./SyncEntityCards";
import { SyncActiveRetriesCard, SyncFailureGroupsCard, SyncRecentFailuresCard } from "./SyncFailureCards";
import { SyncRecentEventsCard } from "./SyncRecentEventsCard";
import { sumRate } from "./sync-events-format";
import { useSyncEventsPanel } from "./use-sync-events-panel";
import type { SyncEventsPanelFetchers } from "./sync-events-types";

export type {
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

export interface SyncEventsPanelProps {
  /** Texto descritivo abaixo do título da aba. */
  description: ReactNode;
  /** "applied" (inbox) ou "dispatched" (outbox). */
  successStatusKey: string;
  /** Label para o KPI de "sucessos". */
  successLabel: string;
  /** Label da janela de taxa (ex.: "Aplicados (60min)" / "Despachados (60min)"). */
  rateLabel: string;
  /** Label do título da seção de últimos eventos. */
  recentTitle: string;
  /** Mensagem de toast no refresh manual. */
  refreshSuccessMsg: string;
  /** Mensagem de loading inicial. */
  loadingLabel: string;
  /** Fetchers normalizados. */
  fetchers: SyncEventsPanelFetchers;
  /**
   * Opcional (inbox local): voltar evento failed/pending em retry para `pending` limpo (reprocessar).
   */
  onResetInboxToPending?: (eventId: string) => Promise<void>;
}

export function SyncEventsPanel({
  description,
  successStatusKey,
  successLabel,
  rateLabel,
  recentTitle,
  refreshSuccessMsg,
  loadingLabel,
  fetchers,
  onResetInboxToPending,
}: SyncEventsPanelProps) {
  const s = useSyncEventsPanel({ fetchers, refreshSuccessMsg, onResetInboxToPending });
  const totalSuccess60min = useMemo(() => sumRate(s.rate), [s.rate]);

  if (s.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-muted-foreground animate-pulse">{loadingLabel}</span>
      </div>
    );
  }

  const requeue = s.requeue;
  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
        <PageRefreshButton onClick={() => s.refresh()} refreshing={s.refreshing} />
      </div>

      {s.error && (
        <Card className="glass-panel border-destructive/40">
          <CardContent className="py-4 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm min-w-0">
              <p className="font-medium text-destructive">Erro ao carregar dados</p>
              <p className="text-muted-foreground break-words">{s.error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {s.summary && (
        <SyncSummaryCards
          summary={s.summary}
          successLabel={successLabel}
          rateLabel={rateLabel}
          rateTotal={totalSuccess60min}
        />
      )}

      <SyncByEntityCard byEntity={s.byEntity} successKey={successStatusKey} />
      <SyncBacklogCard backlog={s.backlog} />
      <SyncActiveRetriesCard retries={s.retries} />
      <SyncFailureGroupsCard failures={s.failures} />
      <SyncRecentFailuresCard recent={s.recent} />

      <SyncRecentEventsCard
        recentTitle={recentTitle}
        successStatusKey={successStatusKey}
        events={s.events}
        expanded={s.expanded}
        onToggle={s.toggleExpand}
        loadingMore={s.loadingMore}
        hasMore={s.hasMore}
        onLoadMore={s.loadMoreEvents}
        onRequeue={onResetInboxToPending ? (id) => void requeue(id) : undefined}
        requeueingId={s.requeueingId}
      />
    </div>
    </TooltipProvider>
  );
}
