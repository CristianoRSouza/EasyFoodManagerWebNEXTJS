import type { ReactNode } from "react";
import { cn } from "@/shared/ui/cn";
import { syncLogStatusIsSuccess } from "@/shared/sync/sync-log-status";

/**
 * Peças visuais compartilhadas do Espelho FB↔PG — porta de
 * `LEGACY/src/components/sync-mirror/mirror-ui.tsx` (as funções `fmt*` foram para
 * `domain/mirror-format.ts`; os avisos, para `MirrorNotices.tsx`).
 *
 * A cor é semântica e vem dos tokens do design system (`success`/`warning`/`destructive`).
 * O tom neutro de propósito NÃO tem cor: é a maioria esmagadora das comparações.
 */

export type Tone = "ok" | "atencao" | "falha" | "neutro";

const TONE_CLASSES: Record<Tone, string> = {
  ok: "border-success/30 bg-success/10 text-success",
  atencao: "border-warning/30 bg-warning/10 text-warning",
  falha: "border-destructive/30 bg-destructive/10 text-destructive",
  neutro: "border-border/60 bg-muted/30 text-muted-foreground",
};

export function Tag({
  tone = "neutro",
  children,
  className,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] font-semibold leading-tight",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Etiqueta de uma linha de `sync_log`: gravou vs. o que pede triagem. */
export function StatusTag({ status }: { status: string | null | undefined }) {
  const ok = syncLogStatusIsSuccess(status);
  return (
    <Tag
      tone={ok ? "ok" : "falha"}
      title={
        ok
          ? "Esta passagem do job escreveu pelo menos uma linha. Passagem sem nada a fazer não vira registro."
          : "Linha de erro ou alarme — é por aqui que a triagem começa."
      }
    >
      {ok ? "GRAVOU" : "ATENÇÃO"}
    </Tag>
  );
}

export function DirectionTag({ direction }: { direction: string }) {
  const toPg = direction === "fb_to_pg";
  return (
    <span
      className={cn("font-mono text-[11px] font-semibold", toPg ? "text-primary" : "text-info")}
      title={toPg ? "Firebird lido, PostgreSQL escrito" : "PostgreSQL na fila, Firebird escrito"}
    >
      {toPg ? "FB▸PG" : "PG▸FB"}
    </span>
  );
}

/** Par rótulo/valor das grades de Saúde. */
export function Measure({
  label,
  value,
  tone = "neutro",
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
  hint?: string;
}) {
  const color =
    tone === "ok" ? "text-success" : tone === "atencao" ? "text-warning" : tone === "falha" ? "text-destructive" : "";
  return (
    <div className="flex items-baseline justify-between gap-3 py-1" title={hint}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono text-sm font-medium tabular-nums", color)}>{value}</dd>
    </div>
  );
}
