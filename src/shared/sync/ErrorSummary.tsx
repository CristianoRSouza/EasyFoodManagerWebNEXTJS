/**
 * Resume erros de apply (Postgres) de forma legível.
 * Cópia fiel de `LEGACY/src/components/sync/ErrorSummary.tsx` (JSX, classes e textos);
 * o parser foi para `sync-apply-error.ts`.
 */

import { AlertTriangle, Link2Off, KeyRound, Ban, FileWarning, HelpCircle } from "lucide-react";
import { parseSyncApplyError, type SyncApplyErrorCategory } from "./sync-apply-error";

interface Props {
  error: string;
  entityName?: string;
}

const CATEGORY_ICONS: Record<SyncApplyErrorCategory, typeof AlertTriangle> = {
  foreign_key: Link2Off,
  unique: KeyRound,
  not_null: Ban,
  check: AlertTriangle,
  undefined_table: FileWarning,
  undefined_column: FileWarning,
  permission: Ban,
  syntax: AlertTriangle,
  unknown: HelpCircle,
};

export function ErrorSummary({ error, entityName }: Props) {
  if (!error) return null;
  const p = parseSyncApplyError(error, entityName);
  const Icon = CATEGORY_ICONS[p.category];

  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 overflow-hidden">
      {/* Header com tipo de erro */}
      <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-b border-destructive/30">
        <Icon className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-sm font-semibold text-destructive">{p.categoryLabel}</span>
        {p.sqlstate && (
          <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
            SQLSTATE {p.sqlstate}
          </span>
        )}
      </div>

      {/* Campos extraídos */}
      {(p.table || p.column || p.constraint || p.referencedTable || p.detail) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 px-3 py-2 text-xs border-b border-destructive/20">
          {p.table && (
            <div>
              <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Tabela</p>
              <p className="font-mono break-all">{p.table}</p>
            </div>
          )}
          {p.column && (
            <div>
              <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Coluna</p>
              <p className="font-mono break-all">{p.column}</p>
            </div>
          )}
          {p.constraint && (
            <div>
              <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Constraint</p>
              <p className="font-mono break-all">{p.constraint}</p>
            </div>
          )}
          {p.referencedTable && (
            <div>
              <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Tabela referenciada</p>
              <p className="font-mono break-all text-warning">{p.referencedTable}</p>
            </div>
          )}
          {p.detail && (
            <div className="col-span-full">
              <p className="text-muted-foreground uppercase tracking-wide text-[10px]">Detalhe</p>
              <p className="font-mono break-all">{p.detail}</p>
            </div>
          )}
        </div>
      )}

      {/* Hints / dependências */}
      {p.hints.length > 0 && (
        <div className="px-3 py-2 border-b border-destructive/20 bg-warning/5">
          <p className="text-[10px] uppercase tracking-wide text-warning font-semibold mb-1">
            Possíveis causas / próximos passos
          </p>
          <ul className="space-y-1">
            {p.hints.map((h, i) => (
              <li key={i} className="text-xs flex gap-1.5">
                <span className="text-warning">›</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mensagem original */}
      <details className="px-3 py-2">
        <summary className="text-[10px] uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground">
          Mensagem original do Postgres
        </summary>
        <pre className="mt-2 text-[11px] text-destructive/90 font-mono whitespace-pre-wrap break-all">
          {error}
        </pre>
      </details>
    </div>
  );
}
