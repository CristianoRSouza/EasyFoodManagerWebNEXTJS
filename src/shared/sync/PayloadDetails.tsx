/**
 * Renderiza um payload JSON em formato chave/valor amigável (sem mostrar JSON cru).
 * Suporta objetos aninhados, arrays e valores primitivos.
 *
 * Cópia fiel de `LEGACY/src/components/sync/PayloadDetails.tsx` (JSX, classes e textos);
 * `formatValue`/`isPlainObject` foram para `payload-format.ts`. `data` era `any`; aqui `unknown`.
 */

import { formatPayloadValue, isPlainObject } from "./payload-format";

interface Props {
  data: unknown;
  level?: number;
}

export function PayloadDetails({ data, level = 0 }: Props) {
  if (data === null || data === undefined) {
    return <p className="text-xs text-muted-foreground italic">Sem payload</p>;
  }

  if (typeof data !== "object") {
    return <p className="text-sm">{formatPayloadValue(data)}</p>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="text-xs text-muted-foreground italic">Lista vazia</p>;
    }
    return (
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="border border-border/50 rounded-md p-2 bg-muted/20"
          >
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Item #{idx + 1}
            </p>
            <PayloadDetails data={item} level={level + 1} />
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(data);
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Vazio</p>;
  }

  return (
    <div className={`grid gap-x-4 gap-y-1.5 ${level === 0 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
      {entries.map(([key, value]) => {
        const isComplex = isPlainObject(value) || Array.isArray(value);
        return (
          <div
            key={key}
            className={`flex ${isComplex ? "flex-col col-span-full" : "flex-row items-baseline gap-2"} border-b border-border/30 py-1`}
          >
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
              {key}
            </span>
            {isComplex ? (
              <div className="mt-1 pl-3 border-l-2 border-primary/30">
                <PayloadDetails data={value} level={level + 1} />
              </div>
            ) : (
              <span className="text-sm font-mono break-all">{formatPayloadValue(value)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
