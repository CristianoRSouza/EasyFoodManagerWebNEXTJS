"use client";

import { SyncEventsPanel } from "@/shared/sync/SyncEventsPanel";
import type { SyncEventsPanelFetchers } from "@/shared/sync/sync-events-types";
import type { SyncQueue } from "../domain/sync-queue";

interface LocalQueuePanelProps {
  queue: SyncQueue;
  /** Troca a cada "Atualizar dados" bem-sucedido do topo: remonta o painel (recarrega tudo). */
  panelKey: number;
  fetchers: SyncEventsPanelFetchers;
  /** Só inbox: mostra o botão de reenfileirar. */
  onResetInboxToPending?: (eventId: string) => Promise<void>;
}

/**
 * Abas "Inbox" e "Outbox" do monitor da loja — texto introdutório + `SyncEventsPanel`, com JSX,
 * classes e textos de `LEGACY/src/pages/SyncMonitor.tsx`.
 */
export function LocalQueuePanel({ queue, panelKey, fetchers, onResetInboxToPending }: LocalQueuePanelProps) {
  if (queue === "inbox") {
    return (
      <>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Tráfego <span className="text-foreground/90 font-medium">Supabase → PostgreSQL</span> na loja —{" "}
          <code className="font-mono text-xs bg-muted/80 px-1 rounded">ecb_sync.inbox</code>. O painel abaixo replica o
          monitor na nuvem: resumo, tabelas e <strong className="text-foreground font-medium">últimos eventos</strong> com
          expansão e payload em chave/valor. Em modo Supabase no browser, o equivalente agregado está em «Monitor (Nuvem)» (
          <code className="font-mono text-xs bg-muted/80 px-1 rounded">/sync</code>).
        </p>
        <SyncEventsPanel
          key={`local-inbox-${panelKey}`}
          description={
            <>
              Fila <code className="font-mono text-xs bg-muted/80 px-1.5 py-0.5 rounded">ecb_sync.inbox</code> (PG local): eventos vindos do Supabase para aplicar no PostgreSQL.
            </>
          }
          successStatusKey="applied"
          successLabel="Aplicados"
          rateLabel="Aplicados (60min)"
          recentTitle="Últimos eventos do inbox"
          refreshSuccessMsg="Monitor de inbox recarregado."
          loadingLabel="Carregando inbox..."
          fetchers={fetchers}
          onResetInboxToPending={onResetInboxToPending}
        />
      </>
    );
  }

  return (
    <>
      <p className="text-xs sm:text-sm text-muted-foreground">
        Tráfego <span className="text-foreground/90 font-medium">PostgreSQL → Supabase</span> na loja —{" "}
        <code className="font-mono text-xs bg-muted/80 px-1 rounded">ecb_sync.outbox</code>. Mesmo layout que na nuvem:
        ao expandir um evento, o <strong className="text-foreground font-medium">payload</strong> aparece formatado (não JSON cru).
      </p>
      <SyncEventsPanel
        key={`local-outbox-${panelKey}`}
        description={
          <>
            Fila <code className="font-mono text-xs bg-muted/80 px-1.5 py-0.5 rounded">ecb_sync.outbox</code> (PG local): eventos a despachar para o Supabase.
          </>
        }
        successStatusKey="dispatched"
        successLabel="Despachados"
        rateLabel="Despachados (60min)"
        recentTitle="Últimos eventos do outbox"
        refreshSuccessMsg="Monitor de outbox recarregado."
        loadingLabel="Carregando outbox..."
        fetchers={fetchers}
      />
    </>
  );
}
