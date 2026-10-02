import type { MirrorJobAggregate, MirrorJobStatsResult } from "./sync-mirror";
import { SYNC_JOBS, jobOwns, type SyncJobDef } from "./sync-jobs";

/**
 * Uma linha da aba "Ao vivo": o que o job fez na janela. Porta de `montarLinhas` em
 * `LEGACY/src/components/sync-mirror/LiveMirrorPanel.tsx`.
 */
export interface JobRow {
  job: SyncJobDef;
  /** O job deixou rastro na janela (linha na `sync_log` ou ciclo no rollup). */
  present: boolean;
  lines: number;
  affected: number;
  errors: number;
  last: string | null;
  /** Do rollup `sync_job_stats`; `null` quando a migração 050 falta ou o job não sabe medir. */
  unchanged: number | null;
  /** Execuções na janela, do rollup — o número que PROVA que o job rodou. */
  cycles: number | null;
  read: number | null;
}

function latest<T>(items: T[], pick: (item: T) => string | null): string | null {
  return items.reduce<string | null>((acc, item) => {
    const value = pick(item);
    return !acc || (value && value > acc) ? value : acc;
  }, null);
}

function sum<T>(items: T[], pick: (item: T) => number): number {
  return items.reduce((acc, item) => acc + pick(item), 0);
}

export function buildJobRows(
  jobs: readonly SyncJobDef[],
  aggregates: MirrorJobAggregate[],
  stats: MirrorJobStatsResult,
): JobRow[] {
  return jobs.map((job) => {
    // `unchanged`/`read` só existem para quem o serviço sabe medir. Para os demais fica `null` —
    // "não sei" é diferente de zero.
    const myStats = stats.available ? stats.rows.filter((l) => jobOwns(job, l.direction, l.table)) : [];
    const measures = job.semantics === "written" && myStats.length > 0;
    const unchanged = measures ? sum(myStats, (l) => l.unchanged) : null;
    const cycles = myStats.length > 0 ? sum(myStats, (l) => l.cycles) : null;
    const read = measures ? sum(myStats, (l) => l.read) : null;

    const mine = aggregates.filter((a) => jobOwns(job, a.direction, a.table));
    if (mine.length === 0) {
      // Sem linha na `sync_log`, mas o rollup pode provar que o job RODOU e nada mudou.
      return {
        job,
        present: (cycles ?? 0) > 0,
        lines: 0,
        affected: 0,
        errors: 0,
        last: latest(myStats, (l) => l.lastMinute),
        unchanged,
        cycles,
        read,
      };
    }
    return {
      job,
      present: true,
      lines: sum(mine, (m) => m.lines),
      affected: sum(mine, (m) => m.recordsAffected),
      errors: sum(mine, (m) => m.errors),
      last: latest(mine, (m) => m.last),
      unchanged,
      cycles,
      read,
    };
  });
}

/** Pares direção/tabela que o serviço gravou e que o catálogo não conhece. */
export function unmappedAggregates(aggregates: MirrorJobAggregate[]): MirrorJobAggregate[] {
  return aggregates.filter((a) => !SYNC_JOBS.some((j) => jobOwns(j, a.direction, a.table)));
}
