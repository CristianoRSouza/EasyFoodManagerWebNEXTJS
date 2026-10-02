"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import type { MirrorJobAggregate, MirrorJobStatsResult, MirrorQueues } from "../domain/sync-mirror";
import { FB_TO_PG_JOBS, PG_TO_FB_JOBS } from "../domain/sync-jobs";
import { buildJobRows, unmappedAggregates } from "../domain/job-rows";
import { JobDirectionCard } from "./JobDirectionCard";
import { CountNotice, UnchangedUnavailableNotice } from "./MirrorNotices";

export interface LiveMirrorPanelProps {
  jobs: MirrorJobAggregate[];
  stats: MirrorJobStatsResult;
  queues: MirrorQueues | null;
  windowMin: number;
  onWindowChange: (min: number) => void;
}

/**
 * Aba "Ao vivo": o espelho propriamente dito — porta de
 * `LEGACY/src/components/sync-mirror/LiveMirrorPanel.tsx`. A divisão em duas colunas por
 * DIREÇÃO é o modelo mental inteiro: cada pista tem origem, destino e modos de falha próprios.
 */
export function LiveMirrorPanel({ jobs, stats, queues, windowMin, onWindowChange }: LiveMirrorPanelProps) {
  const fbPg = useMemo(() => buildJobRows(FB_TO_PG_JOBS, jobs, stats), [jobs, stats]);
  const pgFb = useMemo(() => buildJobRows(PG_TO_FB_JOBS, jobs, stats), [jobs, stats]);
  const unmapped = useMemo(() => unmappedAggregates(jobs), [jobs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="espelho-janela" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Janela
        </label>
        <Select value={String(windowMin)} onValueChange={(v) => onWindowChange(Number(v))}>
          <SelectTrigger id="espelho-janela" className="h-8 w-[170px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">último 1 minuto</SelectItem>
            <SelectItem value="5">últimos 5 minutos</SelectItem>
            <SelectItem value="15">últimos 15 minutos</SelectItem>
            <SelectItem value="60">última 1 hora</SelectItem>
          </SelectContent>
        </Select>
        <CountNotice className="max-w-3xl flex-1 basis-[28rem]" />
      </div>

      {!stats.available && <UnchangedUnavailableNotice />}

      {/* Assimétrica de propósito: FB▸PG tem 7 jobs e 8 colunas; PG▸FB tem 3 e 6. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <JobDirectionCard direction="fb_to_pg" rows={fbPg} />
        <JobDirectionCard direction="pg_to_fb" rows={pgFb} queues={queues} />
      </div>

      {unmapped.length > 0 && (
        <Card className="glass-panel border-warning/30">
          <CardContent className="space-y-1 py-3 text-xs text-muted-foreground">
            <p className="font-medium text-warning">Linhas fora do catálogo de jobs</p>
            <p>
              O serviço gravou pares direção/tabela que este painel não conhece. Aparecem aqui em vez de serem
              descartados em silêncio:{" "}
              <span className="font-mono text-foreground/90">
                {unmapped.map((a) => `${a.direction}/${a.table}`).join(", ")}
              </span>
              .
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
