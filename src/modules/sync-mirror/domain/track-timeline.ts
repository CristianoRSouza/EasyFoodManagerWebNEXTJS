import type { FieldChange, MirrorEvent, MirrorRecordChange } from "./sync-mirror";

/**
 * A lista/linha do tempo da aba Alterações — porta da montagem de itens de
 * `LEGACY/src/components/sync-mirror/TrackKeyPanel.tsx`.
 *
 * Duas fontes: as mudanças por REGISTRO (`sync_record_changes`, a principal) e, só com filtro, as
 * mensagens da `sync_log` que citam o termo (conflito, adiamento, aborto — o que não é gravação).
 */

/** Intervalo do ciclo do serviço, para traduzir uma lacuna em "N ciclos sem novidade". */
export const CYCLE_MS = 5000;

export type TimelineItem =
  | {
      kind: "change";
      at: string;
      entity: string;
      key: string;
      op: string;
      direction: string;
      label: string | null;
      fields: string[] | null;
      detail: Record<string, FieldChange> | null;
    }
  | { kind: "event"; at: string; entity: string; status: string; direction: string; message: string };

/**
 * Sem filtro é uma LISTA do que mudou (mais recente primeiro). Com filtro vira LINHA DO TEMPO de
 * uma chave (cronológica, porque a ordem dos acontecimentos é a informação).
 */
export function buildTimeline(
  changes: MirrorRecordChange[],
  events: MirrorEvent[],
  hasTerm: boolean,
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...changes.map<TimelineItem>((m) => ({
      kind: "change",
      at: m.changedAt,
      entity: m.entity,
      key: m.key,
      op: m.op,
      direction: m.direction,
      label: m.label,
      fields: m.fields,
      detail: m.detail,
    })),
    ...events.map<TimelineItem>((e) => ({
      kind: "event",
      at: e.createdAt,
      entity: e.table,
      status: e.status,
      direction: e.direction,
      message: e.message ?? "",
    })),
  ];
  return items.sort((a, b) => {
    const d = new Date(a.at).getTime() - new Date(b.at).getTime();
    return hasTerm ? d : -d;
  });
}

/** Separador de dia: "hoje", "ontem" ou `dd/mm/aaaa` (âncora absoluta para "há 3 d"). */
export function dayLabel(iso: string, now: number = Date.now()): string {
  const d = new Date(iso);
  const today = new Date(now);
  const yesterday = new Date(now - 86_400_000);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "hoje";
  if (sameDay(d, yesterday)) return "ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Ciclos de 5 s que cabem entre dois itens consecutivos. */
export function cyclesBetween(previousIso: string, currentIso: string): { gapMs: number; cycles: number } {
  const gapMs = new Date(currentIso).getTime() - new Date(previousIso).getTime();
  return { gapMs, cycles: Math.round(gapMs / CYCLE_MS) };
}

/** A lacuna "N ciclos lidos sem alteração" só aparece com filtro, no mesmo dia, a partir de 4. */
export const MIN_GAP_CYCLES = 4;
