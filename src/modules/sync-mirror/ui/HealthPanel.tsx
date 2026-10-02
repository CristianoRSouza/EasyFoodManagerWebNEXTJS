import { Card, CardContent } from "@/shared/ui/primitives/card";
import type { MirrorAlarm, MirrorHealth, MirrorQueues, MirrorRetention } from "../domain/sync-mirror";
import { formatCount, formatDayTime, formatDuration, formatSince } from "../domain/mirror-format";
import { AlarmsCard } from "./AlarmsCard";
import { QueuesCard } from "./QueuesCard";
import { Measure, type Tone } from "./mirror-ui";

/** Sem ping há mais que isto, o serviço não está a cumprir o ciclo de 5 s. */
const PING_WARNING_S = 30;
const PING_FAILURE_S = 120;

function pingTone(s: number | null): Tone {
  if (s == null) return "neutro";
  if (s >= PING_FAILURE_S) return "falha";
  if (s >= PING_WARNING_S) return "atencao";
  return "ok";
}

export interface HealthPanelProps {
  health: MirrorHealth | null;
  queues: MirrorQueues | null;
  alarms: MirrorAlarm[];
  retention: MirrorRetention | null;
}

/** Aba "Saúde" — porta de `LEGACY/src/components/sync-mirror/HealthPanel.tsx`. */
export function HealthPanel({ health, queues, alarms, retention }: HealthPanelProps) {
  const since = health?.secondsSincePing ?? null;
  const cyclesPerMin = health ? health.cyclesLast5Min / 5 : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <QueuesCard queues={queues} />

        <Card className="glass-panel">
          <CardContent className="pt-5">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Serviço</h3>
            <dl className="divide-y divide-border/40">
              <Measure
                label="Último heartbeat"
                value={since == null ? "sem registo" : `há ${formatSince(since)}`}
                tone={pingTone(since)}
                hint="Uma linha em sync_heartbeat por ciclo. A ausência dela é o sintoma real de travamento — não o serviço aparecer parado."
              />
              <Measure
                label="Ciclos por minuto"
                value={cyclesPerMin == null ? "—" : cyclesPerMin.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                hint="Medido nos últimos 5 minutos. O intervalo configurado de 5 s dá ~12/min."
              />
              <Measure label="Duração média (1 h)" value={formatDuration(health?.avgDurationS ?? null)} />
              <Measure
                label="Duração máxima (1 h)"
                value={formatDuration(health?.maxDurationS ?? null)}
                tone={(health?.maxDurationS ?? 0) >= 2 ? "atencao" : "neutro"}
              />
            </dl>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="pt-5">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Janela guardada
            </h3>
            <dl className="divide-y divide-border/40">
              <Measure label="Ciclos em sync_heartbeat" value={formatCount(health?.heartbeatsRetained ?? null)} />
              <Measure label="Mais antigo" value={formatDayTime(health?.windowStart ?? null)} />
              <Measure label="Linhas em sync_log" value={formatCount(retention?.logLines ?? null)} />
              <Measure label="Log mais antigo" value={formatDayTime(retention?.logOldest ?? null)} />
              <Measure
                label="Alterações guardadas"
                value={retention?.changesLines == null ? "—" : formatCount(retention.changesLines)}
                hint="Uma linha por registro realmente gravado, com o de→para. Retenção de 30 dias."
              />
              <Measure
                label="Alteração mais antiga"
                value={formatDayTime(retention?.changesOldest ?? null)}
                hint="Esta é a janela longa do espelho — a sync_log só guarda 48 h."
              />
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {retention?.trigger035Active ? (
                <>
                  <strong className="font-medium text-warning">Retenção curta nesta loja.</strong> O gatilho{" "}
                  <span className="font-mono">trg_sync_log_retain_500</span> ainda está activo: a{" "}
                  <span className="font-mono">sync_log</span> guarda 500 linhas por serviço, cerca de{" "}
                  <strong>4 minutos</strong>. A migração 049, que troca isso por 48 h, ainda não foi aplicada aqui.
                </>
              ) : (
                <>
                  Três janelas diferentes, de propósito: a <span className="font-mono">sync_log</span> retém{" "}
                  <strong>48 h</strong> e o anel de <span className="font-mono">sync_heartbeat</span>, 500 ciclos —
                  cerca de <strong>40 minutos</strong>. Já as <strong>alterações por registro</strong> e os resumos
                  por minuto guardam <strong>30 dias</strong>. Por isso a aba Alterações enxerga muito mais longe que
                  o Log do serviço.
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="pt-5">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              O que esta tela ainda não sabe
            </h3>
            <ul className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <li>
                <strong className="font-medium text-foreground">QUAIS registros ficaram inalterados.</strong> Sabe-se
                quantos foram comparados e descartados, não quais — e isto é escolha, não pendência: guardar cada
                comparação daria cerca de 2 milhões de linhas por dia para dizer, quase sempre, que nada mudou.
              </li>
              <li>
                <strong className="font-medium text-foreground">Fechamento de comandas não diz o que mudou.</strong>{" "}
                Oito dos dez jobs já registram a alteração por registro; faltam os dois de fechamento — comandas
                fechadas indo para o PDV e voltando dele. Eles aparecem no Log do serviço, não em Alterações.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <AlarmsCard alarms={alarms} />
    </div>
  );
}
