"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox, LayoutDashboard, ScrollText, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { LocalQueuePanel } from "./LocalQueuePanel";
import { SyncLogTab } from "./SyncLogTab";
import { useLocalSyncMonitor } from "./use-local-sync-monitor";
import { useSyncLogView } from "./use-sync-log-view";

type Tab = "log" | "inbox" | "outbox";

const TRIGGER_CLASS = "gap-1 flex flex-col items-center justify-center py-2.5 px-2 sm:px-3 min-h-[3.25rem] text-center";

/**
 * Monitor de Sincronização da loja (`/sync` no modo loja) — porta de
 * `LEGACY/src/pages/SyncMonitor.tsx`. O ramo "Disponível somente no aplicativo desktop" do
 * legado não foi portado: ele só aparecia em modo nuvem, e na nuvem o `/sync` do legado (e do
 * Next) abre o monitor da nuvem, nunca este.
 */
export function LocalSyncMonitorPage() {
  const m = useLocalSyncMonitor();
  const view = useSyncLogView(m.logs);
  const [tab, setTab] = useState<Tab>("log");

  if (m.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-muted-foreground animate-pulse">Carregando monitor de sincronização...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold font-heading">Monitor de Sincronização</h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-snug max-w-2xl">
            <span className="text-foreground/90 font-medium">Log</span>: sincronização{" "}
            <span className="whitespace-nowrap">Firebird → PostgreSQL</span> (serviço local).{" "}
            <span className="text-foreground/90 font-medium">Inbox</span> e{" "}
            <span className="text-foreground/90 font-medium">Outbox</span>: filas{" "}
            <span className="whitespace-nowrap">PostgreSQL ↔ Supabase</span> na base da loja.
          </p>
        </div>
        <div className="self-start sm:self-auto">
          <PageRefreshButton onClick={() => m.refresh()} refreshing={m.refreshing} />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 sm:px-4 py-3 text-xs sm:text-sm text-muted-foreground flex items-start gap-2">
        <LayoutDashboard className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>
          Pasta de instalação, arquivo <code className="text-xs font-mono bg-muted/80 px-1 rounded">.env</code> e o serviço Windows do{" "}
          <span className="whitespace-nowrap">Sync FB → PG</span> gerem-se no{" "}
          <Link href="/" className="text-primary font-medium underline-offset-2 hover:underline">
            Dashboard
          </Link>
          . A aba <strong className="text-foreground font-medium">Log</strong> usa{" "}
          <code className="font-mono text-[11px] bg-muted/80 px-1 rounded">command.sync_log</code>;{" "}
          <strong className="text-foreground font-medium">Inbox</strong> e{" "}
          <strong className="text-foreground font-medium">Outbox</strong> usam{" "}
          <code className="font-mono text-[11px] bg-muted/80 px-1 rounded">ecb_sync.inbox</code> /{" "}
          <code className="font-mono text-[11px] bg-muted/80 px-1 rounded">ecb_sync.outbox</code>{" "}
          (tráfego <span className="whitespace-nowrap">PG ↔ Supabase</span>). O monitor só nuvem usa outra rota.
        </span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex bg-muted/50 h-auto p-1 gap-1">
          <TabsTrigger value="log" className={TRIGGER_CLASS} title="Sincronização Firebird → PostgreSQL (tabela command.sync_log).">
            <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <ScrollText className="h-4 w-4 shrink-0" />
              Log
            </span>
            <span className="text-[10px] sm:text-[11px] font-normal text-muted-foreground leading-tight">FB → PG</span>
          </TabsTrigger>
          <TabsTrigger
            value="inbox"
            className={TRIGGER_CLASS}
            title="Fila na loja: eventos vindos do Supabase para aplicar no PostgreSQL (ecb_sync.inbox)."
          >
            <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Inbox className="h-4 w-4 shrink-0" />
              Inbox
            </span>
            <span className="text-[10px] sm:text-[11px] font-normal text-muted-foreground leading-tight">SB → PG</span>
          </TabsTrigger>
          <TabsTrigger
            value="outbox"
            className={TRIGGER_CLASS}
            title="Fila na loja: eventos do PostgreSQL a enviar ao Supabase (ecb_sync.outbox)."
          >
            <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Send className="h-4 w-4 shrink-0" />
              Outbox
            </span>
            <span className="text-[10px] sm:text-[11px] font-normal text-muted-foreground leading-tight">PG → SB</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4 mt-4">
          <SyncLogTab view={view} />
        </TabsContent>

        <TabsContent value="inbox" className="space-y-4 mt-4">
          <LocalQueuePanel
            queue="inbox"
            panelKey={m.eventsPanelsKey}
            fetchers={m.inboxFetchers}
            onResetInboxToPending={m.resetInboxToPending}
          />
        </TabsContent>

        <TabsContent value="outbox" className="space-y-4 mt-4">
          <LocalQueuePanel queue="outbox" panelKey={m.eventsPanelsKey} fetchers={m.outboxFetchers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
