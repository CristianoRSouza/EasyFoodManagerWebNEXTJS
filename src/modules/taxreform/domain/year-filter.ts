/**
 * Filtro por "ano de vigência" da tela Configuração fiscal — cópia do comportamento de
 * `NfceIssuerFiscalPage.tsx` (legado), extraída para função pura testável.
 */

/** Lê o ano de uma data (string ISO ou `Date`), evitando o salto de fuso UTC→local. */
export function extractYear(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})/);
    return match ? Number(match[1]) : null;
  }
  return value.getUTCFullYear();
}

/**
 * `filterYear === "all"` aceita qualquer linha. Senão, aceita se QUALQUER campo de data da linha
 * cair no ano filtrado (uma linha pode ter várias datas — referência, vigência de/até).
 */
export function matchesYear(filterYear: string, dateFields: Array<string | Date | null | undefined>): boolean {
  if (filterYear === "all") return true;
  const year = Number(filterYear);
  return dateFields.some((field) => extractYear(field) === year);
}

/** Ano atual + 1 até ano atual - 5, decrescente — mesma janela do legado. */
export function yearFilterOptions(currentYear: number): string[] {
  const years: string[] = [];
  for (let year = currentYear + 1; year >= currentYear - 5; year--) years.push(String(year));
  return years;
}
