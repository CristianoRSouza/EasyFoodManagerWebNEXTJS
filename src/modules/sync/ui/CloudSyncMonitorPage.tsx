"use client";

import { useMemo } from "react";
import { Cloud, Inbox, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { SyncEventsPanel } from "@/shared/sync/SyncEventsPanel";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useSyncRepository } from "./use-sync-repository";

/**
 * Monitor de Sincronização da nuvem (`/sync` no modo nuvem) — porta de
 * `LEGACY/src/pages/CloudSyncMonitor.tsx`, JSX, classes e textos idênticos (inclusive as setas
 * dos rótulos das abas, que o legado escreveu assim).
 *
 * Dados: no legado em produção vinham das RPC `cloud_sync_{inbox,outbox}_*` do Supabase; aqui
 * vêm das rotas equivalentes da EasyFoodAPI (`/v1/sync/<fila>/*`, as que
 * `LEGACY/src/lib/cloud-sync-*.ts` usa no modo API). Sem "reenfileirar": o legado nunca o
 * ofereceu na nuvem. Os painéis são remontados ao trocar de loja (`key` = loja).
 */
export function CloudSyncMonitorPage() {
  const { storeId } = useRequiredTenant();
  const repository = useSyncRepository();
  const inboxFetchers = useMemo(() => repository.queueFetchers("inbox"), [repository]);
  const outboxFetchers = useMemo(() => repository.queueFetchers("outbox"), [repository]);

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold font-heading flex items-center gap-2">
          <Cloud className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <span className="truncate">Monitor de Sincronização</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Acompanhe os eventos em ambas as direções: do PG local para o Supabase (Inbox) e do PG local para o Supabase via Outbox.
        </p>
      </div>

      <Tabs defaultValue="inbox" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <Inbox className="h-4 w-4" />
            Inbox (PG → SB)
          </TabsTrigger>
          <TabsTrigger value="outbox" className="gap-2">
            <Send className="h-4 w-4" />
            Outbox (SB → PG)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <SyncEventsPanel
            key={`cloud-inbox-${storeId}`}
            description={
              <>
                Fila <code className="font-mono text-xs bg-muted/80 px-1.5 py-0.5 rounded">ecb_sync.inbox</code>:
                eventos recebidos do PG local e aplicados no Supabase.
              </>
            }
            successStatusKey="applied"
            successLabel="Aplicados"
            rateLabel="Aplicados (60min)"
            recentTitle="Últimos eventos do inbox"
            refreshSuccessMsg="Monitor de inbox recarregado."
            loadingLabel="Carregando inbox..."
            fetchers={inboxFetchers}
          />
        </TabsContent>

        <TabsContent value="outbox">
          <SyncEventsPanel
            key={`cloud-outbox-${storeId}`}
            description={
              <>
                Fila <code className="font-mono text-xs bg-muted/80 px-1.5 py-0.5 rounded">ecb_sync.outbox</code>:
                eventos pendentes no PG local aguardando despacho para o Supabase.
              </>
            }
            successStatusKey="dispatched"
            successLabel="Despachados"
            rateLabel="Despachados (60min)"
            recentTitle="Últimos eventos do outbox"
            refreshSuccessMsg="Monitor de outbox recarregado."
            loadingLabel="Carregando outbox..."
            fetchers={outboxFetchers}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
