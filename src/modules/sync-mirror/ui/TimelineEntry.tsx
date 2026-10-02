import { describeChange } from "../domain/field-labels";
import { formatCount, formatDayTime, formatGap, formatRelative } from "../domain/mirror-format";
import { MIN_GAP_CYCLES, cyclesBetween, dayLabel, type TimelineItem } from "../domain/track-timeline";
import { DirectionTag, StatusTag, Tag } from "./mirror-ui";
import { NoDetailNote, RecordChangeDiff } from "./RecordChangeDiff";

/**
 * Um item da lista/linha do tempo da aba Alterações, com o separador de dia e a lacuna de
 * ciclos — corpo do `itens.map` de `LEGACY/src/components/sync-mirror/TrackKeyPanel.tsx`.
 */
export function TimelineEntry({
  item,
  previous,
  hasTerm,
}: {
  item: TimelineItem;
  previous: TimelineItem | null;
  hasTerm: boolean;
}) {
  const { gapMs, cycles } = previous ? cyclesBetween(previous.at, item.at) : { gapMs: 0, cycles: 0 };
  const day = dayLabel(item.at);
  const opensDay = !previous || dayLabel(previous.at) !== day;

  return (
    <div>
      {opensDay && (
        <div className="flex items-center gap-2 px-2 pb-1 pt-3 first:pt-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{day}</span>
          <span className="h-px flex-1 bg-border/60" aria-hidden />
        </div>
      )}

      {hasTerm && previous && !opensDay && cycles >= MIN_GAP_CYCLES && (
        <div className="flex items-center gap-2 py-1 pl-[5.5rem] text-xs italic text-muted-foreground/80">
          <span className="h-px w-5 flex-none bg-border" aria-hidden />
          {formatCount(cycles)} ciclos lidos sem alteração
          <span className="not-italic text-muted-foreground/60">({formatGap(gapMs)})</span>
        </div>
      )}

      <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 rounded px-2 py-2 hover:bg-muted/30">
        <span className="font-mono text-xs tabular-nums text-muted-foreground" title={formatDayTime(item.at)}>
          {formatRelative(item.at)}
        </span>

        <div className="min-w-0 space-y-1">
          {item.kind === "change" ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {item.label ? (
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                ) : (
                  <span className="font-mono text-sm text-foreground">{item.key}</span>
                )}
                {item.label && <span className="font-mono text-xs text-muted-foreground">{item.key}</span>}
                {item.op === "insert" && (
                  <Tag tone="ok" title="Registro criado agora no destino.">
                    CRIADO
                  </Tag>
                )}
                <span className="ml-auto flex items-baseline gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">{item.entity}</span>
                  <DirectionTag direction={item.direction} />
                </span>
              </div>

              {item.fields && item.fields.length > 0 ? (
                <div title={describeChange(item.entity, item.fields, item.detail)}>
                  <RecordChangeDiff entity={item.entity} fields={item.fields} detail={item.detail} />
                </div>
              ) : item.op === "insert" ? null : (
                <NoDetailNote />
              )}
            </>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <StatusTag status={item.status} />
              <span className="min-w-0 flex-1 basis-[18rem] text-xs leading-snug text-muted-foreground">
                {item.message}
              </span>
              <span className="ml-auto flex items-baseline gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">{item.entity}</span>
                <DirectionTag direction={item.direction} />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
