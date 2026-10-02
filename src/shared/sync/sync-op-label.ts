/**
 * Mapeia o campo de operação do outbox (insert/update/delete, I/U/D, etc.)
 * para o caractere exibido e o texto do tooltip (PT + EN).
 *
 * Cópia fiel de `LEGACY/src/lib/sync-op-label.ts`.
 */
export function getSyncOpPresentation(
  op: string | null | undefined,
): { short: string; tooltip: string } {
  const raw = (op ?? "").trim();
  if (!raw) {
    return { short: "—", tooltip: "Operação desconhecida" };
  }
  const k = raw.toLowerCase();
  if (k === "upsert") {
    return { short: "M", tooltip: "Upsert (inserir ou substituir)" };
  }
  if (k === "insert" || (k.length === 1 && k === "i")) {
    return { short: "I", tooltip: "Inserção (Insert)" };
  }
  if (k === "update" || (k.length === 1 && k === "u")) {
    return { short: "U", tooltip: "Atualização (Update)" };
  }
  if (k === "delete" || (k.length === 1 && k === "d")) {
    return { short: "D", tooltip: "Eliminação (Delete)" };
  }
  return { short: raw.slice(0, 1).toUpperCase(), tooltip: raw };
}
