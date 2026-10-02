"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { isSyncMirrorAvailable } from "../domain/sync-mirror-availability";
import { CyclesPanel } from "./CyclesPanel";
import { EventsPanel } from "./EventsPanel";
import { HealthPanel } from "./HealthPanel";
import { LiveMirrorPanel } from "./LiveMirrorPanel";
import { SyncMirrorHeader } from "./SyncMirrorHeader";
import { SyncMirrorUnavailable } from "./SyncMirrorUnavailable";
import { TrackKeyPanel } from "./TrackKeyPanel";
import { useSyncMirrorPage, type MirrorTab } from "./use-sync-mirror-page";

const TABS: readonly MirrorTab[] = ["vivo", "ciclos", "registros", "rastrear", "saude"];

function isMirrorTab(value: string): value is MirrorTab {
  return (TABS as readonly string[]).includes(value);
}

/**
 * Espelho Firebird ↔ PostgreSQL (`/sync/espelho`) — porta de `LEGACY/src/pages/SyncMirror.tsx`.
 *
 * Só no modo loja: o Firebird do PDV e o serviço de sincronização são da loja. Na nuvem a rota
 * mostra o cartão "Disponível apenas na loja" do legado (o menu já esconde o item). Não confundir
 * com `/sync`, que mostra a fila PostgreSQL ↔ Supabase.
 *
 * Sem o aviso "Dados de exemplo" do legado: o conjunto de exemplo (browser sem backend) não existe
 * no Next.
 */
export function SyncMirrorPage(): ReactNode {
  const { backend } = useRuntime();
  if (!isSyncMirrorAvailable(backend)) return <SyncMirrorUnavailable />;
  return <SyncMirrorContent />;
}

function SyncMirrorContent() {
  const state = useSyncMirrorPage();

  return (
    <div className="space-y-5">
      <SyncMirrorHeader
        health={state.healthPanel.health}
        live={state.live}
        onToggleLive={state.toggleLive}
        onRefresh={state.refreshAll}
      />

      <Tabs value={state.tab} onValueChange={(v) => isMirrorTab(v) && state.setTab(v)} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/50 p-1 sm:inline-flex sm:w-auto">
          <TabsTrigger value="vivo" className="text-xs sm:text-sm">
            Ao vivo
          </TabsTrigger>
          <TabsTrigger value="ciclos" className="text-xs sm:text-sm">
            Ciclos
          </TabsTrigger>
          <TabsTrigger value="rastrear" className="text-xs sm:text-sm">
            Alterações
          </TabsTrigger>
          <TabsTrigger value="registros" className="text-xs sm:text-sm">
            Log do serviço
          </TabsTrigger>
          <TabsTrigger value="saude" className="text-xs sm:text-sm">
            Saúde
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vivo" className="mt-4">
          <LiveMirrorPanel {...state.livePanel} />
        </TabsContent>

        <TabsContent value="ciclos" className="mt-4">
          <CyclesPanel {...state.cyclesPanel} />
        </TabsContent>

        <TabsContent value="registros" className="mt-4">
          <EventsPanel {...state.eventsPanel} />
        </TabsContent>

        <TabsContent value="rastrear" className="mt-4">
          <TrackKeyPanel {...state.trackPanel} />
        </TabsContent>

        <TabsContent value="saude" className="mt-4">
          <HealthPanel {...state.healthPanel} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
