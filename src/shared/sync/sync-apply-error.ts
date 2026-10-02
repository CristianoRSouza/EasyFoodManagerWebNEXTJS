/**
 * Resume erros de apply (Postgres) de forma legível, destacando:
 * - Tipo do erro (FK, unique, not null, schema, etc.)
 * - SQLSTATE
 * - Tabela / coluna / constraint envolvidas
 * - Possíveis dependências faltantes (heurística)
 *
 * Lógica pura extraída de `LEGACY/src/components/sync/ErrorSummary.tsx` (`parseError`),
 * sem mudança de regra. O ícone de cada categoria fica no componente (`ErrorSummary.tsx`).
 */

export type SyncApplyErrorCategory =
  | "foreign_key"
  | "unique"
  | "not_null"
  | "undefined_table"
  | "undefined_column"
  | "check"
  | "permission"
  | "syntax"
  | "unknown";

export interface ParsedSyncApplyError {
  category: SyncApplyErrorCategory;
  categoryLabel: string;
  sqlstate?: string;
  table?: string;
  column?: string;
  constraint?: string;
  referencedTable?: string;
  detail?: string;
  hints: string[];
}

const SQLSTATE_MAP: Record<string, SyncApplyErrorCategory> = {
  "23503": "foreign_key",
  "23505": "unique",
  "23502": "not_null",
  "23514": "check",
  "42P01": "undefined_table",
  "42703": "undefined_column",
  "42501": "permission",
  "42601": "syntax",
};

export const SYNC_APPLY_ERROR_CATEGORY_LABELS: Record<SyncApplyErrorCategory, string> = {
  foreign_key: "Dependência ausente (FK)",
  unique: "Violação de unicidade",
  not_null: "Campo obrigatório nulo",
  check: "Restrição CHECK",
  undefined_table: "Tabela inexistente",
  undefined_column: "Coluna inexistente",
  permission: "Permissão negada (RLS?)",
  syntax: "Erro de sintaxe SQL",
  unknown: "Erro não classificado",
};

export function parseSyncApplyError(raw: string, entityName?: string): ParsedSyncApplyError {
  const text = raw || "";

  // SQLSTATE: typically "(SQLSTATE 23503)" or "code: 23503"
  const sqlstateMatch = text.match(/(?:SQLSTATE|code)[:\s]+([0-9A-Z]{5})/i);
  const sqlstate = sqlstateMatch?.[1];

  let category: SyncApplyErrorCategory = "unknown";
  if (sqlstate && SQLSTATE_MAP[sqlstate]) {
    category = SQLSTATE_MAP[sqlstate];
  } else {
    const lower = text.toLowerCase();
    if (lower.includes("foreign key") || lower.includes("violates foreign key")) category = "foreign_key";
    else if (lower.includes("duplicate key") || lower.includes("unique constraint")) category = "unique";
    else if (lower.includes("null value") && lower.includes("not-null")) category = "not_null";
    else if (lower.includes("does not exist") && lower.includes("relation")) category = "undefined_table";
    else if (lower.includes("does not exist") && lower.includes("column")) category = "undefined_column";
    else if (lower.includes("permission denied") || lower.includes("rls")) category = "permission";
    else if (lower.includes("syntax error")) category = "syntax";
    else if (lower.includes("check constraint")) category = "check";
  }

  // Extrações comuns
  const tableMatch =
    text.match(/relation "([^"]+)"/i) ||
    text.match(/table "([^"]+)"/i) ||
    text.match(/on table "([^"]+)"/i);
  const columnMatch =
    text.match(/column "([^"]+)"/i) ||
    text.match(/null value in column "([^"]+)"/i);
  const constraintMatch =
    text.match(/constraint "([^"]+)"/i) ||
    text.match(/violates [^"]*"([^"]+)"/i);
  const detailMatch = text.match(/DETAIL:\s*(.+?)(?:\n|$)/i) || text.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
  const referencedMatch =
    text.match(/is not present in table "([^"]+)"/i) ||
    text.match(/referenced.+table "([^"]+)"/i);

  const hints: string[] = [];

  if (category === "foreign_key") {
    if (referencedMatch?.[1]) {
      hints.push(
        `Falta sincronizar primeiro a tabela referenciada: ${referencedMatch[1]}.`,
      );
    } else {
      hints.push(
        "Algum registro relacionado ainda não chegou. Verifique a ordem de aplicação dos eventos pais.",
      );
    }
    if (entityName?.includes("certificate_store")) {
      hints.push(
        "nfce.certificate_store costuma depender de nfce.issuer_config (mesmo issuer_id) já estar aplicado.",
      );
    }
    hints.push("O evento será reprocessado quando a dependência estiver presente.");
  }

  if (category === "unique") {
    hints.push(
      "Já existe um registro com a mesma chave única. Pode ser reenvio duplicado ou conflito de UPSERT.",
    );
    if (constraintMatch?.[1]) hints.push(`Constraint violada: ${constraintMatch[1]}.`);
  }

  if (category === "not_null") {
    if (columnMatch?.[1])
      hints.push(`A coluna "${columnMatch[1]}" é obrigatória mas veio vazia no payload.`);
    hints.push("Verifique se o produtor (PG local) está enviando o campo.");
  }

  if (category === "undefined_table" || category === "undefined_column") {
    hints.push(
      "O schema do Supabase está desatualizado em relação ao payload. Aplique a migration correspondente.",
    );
  }

  if (category === "permission") {
    hints.push(
      "Possível bloqueio por RLS ou role sem GRANT. Confira políticas da tabela alvo no Supabase.",
    );
  }

  if (category === "unknown") {
    hints.push("Erro não reconhecido — leia a mensagem completa abaixo.");
  }

  return {
    category,
    categoryLabel: SYNC_APPLY_ERROR_CATEGORY_LABELS[category],
    sqlstate,
    table: tableMatch?.[1],
    column: columnMatch?.[1],
    constraint: constraintMatch?.[1],
    referencedTable: referencedMatch?.[1],
    detail: detailMatch?.[1],
    hints,
  };
}
