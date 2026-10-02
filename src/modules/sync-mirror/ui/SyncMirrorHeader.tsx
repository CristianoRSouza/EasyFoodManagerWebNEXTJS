"use client";

import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import type { MirrorHealth } from "../domain/sync-mirror";
import { formatDuration, formatSince } from "../domain/mirror-format";
import { Tag } from "./mirror-ui";

/** Abaixo disto (segundos desde o último heartbeat) o serviço está "vivo". */
const ALIVE_S = 30;

/** Título, etiquetas de vida do serviço, Pausar/Retomar e "Atualizar dados" (cabeçalho do legado). */
export function SyncMirrorHeader({
  health,
  live,
  onToggleLive,
  onRefresh,
}: {
  health: MirrorHealth | null;
  live: boolean;
  onToggleLive: () => void;
  onRefresh: () => Promise<unknown>;
}) {
  const since = health?.secondsSincePing ?? null;
  const alive = since != null && since < ALIVE_S;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="font-heading text-xl font-bold sm:text-2xl">Espelho Firebird ↔ PostgreSQL</h1>
        <p className="max-w-2xl text-xs leading-snug text-muted-foreground sm:text-sm">
          O que o serviço de sincronização lê do PDV e escreve no PostgreSQL, e o caminho de volta. Para a fila{" "}
          <span className="whitespace-nowrap">PostgreSQL ↔ Supabase</span> use o{" "}
          <Link href="/sync" className="font-medium text-primary underline-offset-2 hover:underline">
            Monitor de Sincronização
          </Link>
          .
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 self-start">
        <Tag tone={alive ? "ok" : "atencao"} title="Baseado no último heartbeat gravado pelo serviço.">
          {alive ? "serviço vivo" : "sem heartbeat recente"}
          {since != null && ` · há ${formatSince(since)}`}
        </Tag>
        {health?.avgDurationS != null && (
          <Tag tone="neutro" title="Duração média do ciclo na última hora.">
            ciclo {formatDuration(health.avgDurationS)}
          </Tag>
        )}
        <Button variant="outline" size="sm" onClick={onToggleLive}>
          {live ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {live ? "Pausar" : "Retomar"}
        </Button>
        <PageRefreshButton onClick={onRefresh} />
      </div>
    </div>
  );
}
