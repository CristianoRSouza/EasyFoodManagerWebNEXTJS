/**
 * Formata uma coluna `date` do PostgreSQL (dia de calendário, sem hora) como dd/mm/aaaa. Cópia de
 * `date-only.ts` do legado 1.3.12 (PR #34).
 *
 * ► POR QUE NÃO `formatDate` (`new Date(v).toLocaleDateString()`)
 *
 *   As duas fontes entregam o mesmo dia em formatos diferentes:
 *   - Nuvem (EasyFoodAPI): texto puro, `"2026-01-01"`.
 *   - Loja (easyfoodmanagerAPI): o driver `pg` converte para meia-noite LOCAL, que no JSON vira
 *     `"2026-01-01T03:00:00.000Z"`.
 *
 *   `new Date("2026-01-01")` é meia-noite **UTC** pela especificação do JS; em Brasília isso é
 *   31/12/2025 às 21h. A nuvem mostrava toda vigência um dia antes da loja.
 *
 *   Dia de calendário não tem fuso: o texto "AAAA-MM-DD" é lido como está.
 */
export function formatDateOnlyBR(valor: string | Date | null | undefined): string {
  if (valor == null || valor === "") return "—";
  if (typeof valor === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString("pt-BR");
}
