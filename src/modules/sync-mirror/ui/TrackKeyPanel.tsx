"use client";

import { Search } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import type { MirrorEvent, MirrorRecordChangesResult } from "../domain/sync-mirror";
import { buildTimeline } from "../domain/track-timeline";
import { formatCount } from "../domain/mirror-format";
import { TimelineEntry } from "./TimelineEntry";

export interface TrackKeyPanelProps {
  term: string;
  onTermChange: (v: string) => void;
  /** Mudanças por REGISTRO (migração 053) — a fonte principal. */
  changes: MirrorRecordChangesResult | null;
  /** Linhas de job que citam o termo na mensagem — complemento, para erro e adiamento. */
  events: MirrorEvent[];
}

/**
 * Aba "Alterações": o que mudou, em ordem — e a linha do tempo de UMA chave quando se filtra.
 * Porta de `LEGACY/src/components/sync-mirror/TrackKeyPanel.tsx` (363 linhas, dividido em
 * `RecordChangeDiff` e `TimelineEntry`). Abre com a lista, não com um campo vazio: ninguém sabe
 * qual código de barras procurar antes de ver quais mudaram.
 */
export function TrackKeyPanel({ term, onTermChange, changes, events }: TrackKeyPanelProps) {
  const hasTerm = term.trim().length > 0;
  const total = changes?.rows.length ?? 0;
  const items = buildTimeline(changes?.rows ?? [], events, hasTerm);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="espelho-rastrear"
            value={term}
            onChange={(e) => onTermChange(e.target.value)}
            placeholder="7891234560017, 4471, fb_id=18344…"
            className="h-9 w-[22rem] pl-8 font-mono text-sm"
          />
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
          {hasTerm ? (
            <>
              Filtrando por <strong className="font-medium text-foreground">início</strong> da chave. Com o filtro
              ativo entram também as mensagens do serviço que citam o termo (conflito, adiamento, aborto).
            </>
          ) : (
            <>
              As últimas <strong className="font-medium text-foreground">alterações reais</strong> — um registro por
              linha, com a chave que identifica cada um. Digite o começo de um código de barras ou o número de uma
              comanda para ver só a linha do tempo dele.
            </>
          )}
        </p>
      </div>

      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatCount(total)} alteração(ões){hasTerm ? " no filtro" : " mais recentes"} · retenção de 30 dias
        </p>
      )}

      {changes && !changes.available && (
        <Card className="glass-panel border-warning/30">
          <CardContent className="py-3 text-xs text-muted-foreground">
            <strong className="font-medium text-warning">Registro por chave indisponível.</strong> A migração 053 (
            <span className="font-mono">sync_record_changes</span>) ainda não foi aplicada nesta loja — só aparecem as
            mensagens do serviço, sem as gravações.
          </CardContent>
        </Card>
      )}

      {items.length === 0 && !hasTerm ? (
        <Card className="glass-panel">
          <CardContent className="space-y-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma alteração na janela guardada.</p>
            <p className="mx-auto max-w-xl text-xs leading-relaxed text-muted-foreground">
              Não é falha: só entra aqui registro que foi de facto gravado. Numa loja com o catálogo parado e sem
              comandas, o número honesto é zero — altere um preço no PDV e a linha aparece em até dois ciclos.
            </p>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card className="glass-panel">
          <CardContent className="space-y-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nada com <span className="font-mono text-foreground">{term}</span> na janela guardada.
            </p>
            <p className="mx-auto max-w-xl text-xs leading-relaxed text-muted-foreground">
              Isto não quer dizer que a chave não foi sincronizada — quer dizer que ela foi lida e{" "}
              <em>descartada por não ter mudado</em>, ou que o registro já saiu da retenção de 30 dias.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-panel">
          <CardContent className="space-y-0.5 py-3">
            {items.map((item, i) => (
              <TimelineEntry
                key={`${item.kind === "change" ? "mudanca" : "evento"}-${item.at}-${i}`}
                item={item}
                previous={i > 0 ? (items[i - 1] ?? null) : null}
                hasTerm={hasTerm}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
