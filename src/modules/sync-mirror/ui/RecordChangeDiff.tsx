import type { FieldChange } from "../domain/sync-mirror";
import { fieldLabel, formatFieldValue } from "../domain/field-labels";

/**
 * O de→para de uma alteração — `Diferenca` de `LEGACY/src/components/sync-mirror/TrackKeyPanel.tsx`.
 *
 * Duas formas, e a diferença é de segurança: com `detail`, mostra `Campo  de → para`; só com
 * `fields`, mostra os nomes e explica por quê. O segundo caso é o das entidades que guardam
 * segredo cifrado (emitente, credenciais PIX): o serviço nunca manda o valor delas.
 */
export function RecordChangeDiff({
  entity,
  fields,
  detail,
}: {
  entity: string;
  fields: string[] | null;
  detail: Record<string, FieldChange> | null;
}) {
  if (!fields || fields.length === 0) return null;

  if (!detail) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-xs">
        <span className="text-muted-foreground">alterou</span>
        {fields.map((c) => {
          const { text, technical } = fieldLabel(entity, c);
          return (
            <span key={c} className={technical ? "font-mono text-foreground/80" : "font-medium text-foreground/80"}>
              {text}
            </span>
          );
        })}
        <span className="text-muted-foreground/70">· valor omitido, a tabela guarda segredo cifrado</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {fields.map((c) => {
        const d = detail[c];
        const { text, technical } = fieldLabel(entity, c);
        return (
          <div key={c} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
            <span className={technical ? "font-mono text-muted-foreground" : "text-muted-foreground"}>{text}</span>
            <span className="text-muted-foreground/80 line-through decoration-muted-foreground/40">
              {formatFieldValue(entity, c, d?.from)}
            </span>
            <span className="text-muted-foreground/50" aria-hidden>
              →
            </span>
            <span className="font-medium text-success">{formatFieldValue(entity, c, d?.to)}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Linha registrada antes de o serviço saber gravar o diff por coluna (migração 054). Sem esta
 * nota a linha pareceria uma que falhou.
 */
export function NoDetailNote() {
  return (
    <p className="text-xs italic text-muted-foreground/70">
      registrada antes de o serviço guardar o detalhe por coluna
    </p>
  );
}
