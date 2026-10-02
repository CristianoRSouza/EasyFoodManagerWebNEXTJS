"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { cycleRange, type CycleRangeId } from "../domain/cycle-rules";
import type { EventStatusFilter } from "../domain/sync-mirror";
import { SYNC_MIRROR_KEYS as K, isSyncMirrorKey, syncMirrorKey } from "./sync-mirror-query-keys";
import { useSyncMirrorRepository } from "./use-sync-mirror-repository";

export const EVENTS_PAGE_SIZE = 100;
/** Mesmo intervalo do ciclo do serviço: atualizar mais rápido não traz linha nova. */
export const LIVE_INTERVAL_MS = 5000;

function toStatusFilter(value: string): EventStatusFilter | null {
  return value === "error" || value === "success" ? value : null;
}

export type MirrorTab = "vivo" | "ciclos" | "registros" | "rastrear" | "saude";

/**
 * Estado e consultas da tela — o corpo de `LEGACY/src/pages/SyncMirror.tsx` antes do JSX, com as
 * mesmas consultas, parâmetros e ritmos. Só é montado no modo loja (o gate fica na página).
 *
 * Como no legado, uma consulta que falha não derruba a tela: o painel dela mostra o estado vazio.
 */
export function useSyncMirrorPage() {
  const tenant = useRequiredTenant();
  const repository = useSyncMirrorRepository();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<MirrorTab>("vivo");
  const [live, setLive] = useState(true);
  const [windowMin, setWindowMin] = useState(5);
  const [range, setRange] = useState<CycleRangeId>("detalhe");

  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState("all");
  const [table, setTable] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [trackTerm, setTrackTerm] = useState("");

  const polling = live ? LIVE_INTERVAL_MS : false;
  const rangeDef = cycleRange(range);
  const trimmedTerm = trackTerm.trim();

  const health = useQuery({
    queryKey: syncMirrorKey(K.health, tenant),
    queryFn: () => repository.health(),
    refetchInterval: polling,
  });
  const jobs = useQuery({
    queryKey: syncMirrorKey(K.jobs, tenant, windowMin),
    queryFn: () => repository.jobs(windowMin),
    refetchInterval: polling,
  });
  // Rollup lido/gravado/inalterado (migração 050): `available: false` sem a migração.
  const stats = useQuery({
    queryKey: syncMirrorKey(K.jobs, tenant, "stats", windowMin),
    queryFn: () => repository.jobStats(windowMin),
    refetchInterval: polling,
  });
  const queues = useQuery({
    queryKey: syncMirrorKey(K.jobs, tenant, "filas"),
    queryFn: () => repository.queues(),
    refetchInterval: polling,
  });
  const cycles = useQuery({
    queryKey: syncMirrorKey(K.cycles, tenant),
    queryFn: () => repository.cycles(120),
    refetchInterval: polling,
  });
  // Histórico longo (migração 052): só quando a faixa não é a detalhada.
  const history = useQuery({
    queryKey: syncMirrorKey(K.cycles, tenant, "historico", rangeDef.id),
    queryFn: () => repository.cycleHistory(rangeDef.hours, rangeDef.bucketMin),
    enabled: range !== "detalhe",
    refetchInterval: polling,
  });
  // Só o "Log do serviço" consome isto — por isso o `enabled` preso à aba.
  const events = useQuery({
    queryKey: syncMirrorKey(K.events, tenant, page, search, direction, table, status),
    queryFn: () =>
      repository.events({
        limit: EVENTS_PAGE_SIZE,
        offset: page * EVENTS_PAGE_SIZE,
        direction: direction === "all" ? null : direction,
        table: table === "all" ? null : table,
        status: toStatusFilter(status),
        q: search.trim() || null,
      }),
    enabled: tab === "registros",
    refetchInterval: polling,
  });
  const trackEvents = useQuery({
    queryKey: syncMirrorKey(K.events, tenant, "rastreio", trackTerm),
    queryFn: () => repository.events({ limit: 300, q: trimmedTerm }),
    enabled: trimmedTerm.length > 0,
  });
  // A aba Alterações ABRE com as últimas alterações — sem `enabled` pelo termo, de propósito.
  const changes = useQuery({
    queryKey: syncMirrorKey(K.events, tenant, "mudancas", trackTerm),
    queryFn: () => repository.changes({ limit: 200, q: trimmedTerm || null }),
    refetchInterval: polling,
  });
  const alarms = useQuery({
    queryKey: syncMirrorKey(K.alarms, tenant),
    queryFn: () => repository.alarms(24),
  });
  const retention = useQuery({
    queryKey: syncMirrorKey(K.retention, tenant),
    queryFn: () => repository.retention(),
  });

  const refreshAll = async () => {
    await queryClient.invalidateQueries({ predicate: (q) => isSyncMirrorKey(q.queryKey) });
  };

  /** Filtro do Log mudou: volta à primeira página. */
  const withFirstPage = (set: (v: string) => void) => (v: string) => {
    set(v);
    setPage(0);
  };

  return {
    tab,
    setTab,
    live,
    toggleLive: () => setLive((v) => !v),
    refreshAll,
    livePanel: {
      jobs: jobs.data ?? [],
      stats: stats.data ?? { available: false, rows: [] },
      queues: queues.data ?? null,
      windowMin,
      onWindowChange: setWindowMin,
    },
    cyclesPanel: {
      cycles: cycles.data ?? [],
      history: history.data ?? null,
      range,
      onRangeChange: setRange,
    },
    eventsPanel: {
      events: events.data ?? [],
      page,
      pageSize: EVENTS_PAGE_SIZE,
      search,
      direction,
      table,
      status,
      onSearchChange: withFirstPage(setSearch),
      onDirectionChange: withFirstPage(setDirection),
      onTableChange: withFirstPage(setTable),
      onStatusChange: withFirstPage(setStatus),
      onPageChange: setPage,
    },
    trackPanel: {
      term: trackTerm,
      onTermChange: setTrackTerm,
      changes: changes.data ?? null,
      events: trackEvents.data ?? [],
    },
    healthPanel: {
      health: health.data ?? null,
      queues: queues.data ?? null,
      alarms: alarms.data ?? [],
      retention: retention.data ?? null,
    },
  };
}

export type SyncMirrorPageState = ReturnType<typeof useSyncMirrorPage>;
