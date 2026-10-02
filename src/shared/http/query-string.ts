/**
 * Monta a query string ignorando o que não foi informado (`null`, `undefined`, `""`) — e, por
 * padrão, também `"all"`, valor-padrão dos selects de filtro. Única implementação: Comandas,
 * Produtos e Transações repetiam esta mesma função (`toRangeQuery`/`buildQuery`/`toQueryString`),
 * e o Espelho FB↔PG tinha a sua (sem o descarte de `"all"`, que lá é termo de busca válido — use
 * `{ dropAll: false }`).
 */
export function toQueryString(
  params: Record<string, string | number | null | undefined>,
  { dropAll = true }: { dropAll?: boolean } = {},
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    if (dropAll && value === "all") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
