/**
 * Quantidade (estoque, item) para exibição, decidida pela unidade — não pelo driver. Cópia de
 * `quantity-format.ts` do legado 1.3.12 (PR #30).
 *
 *   - Unidade fracionária (KG, L…): sempre 3 casas — `1.250`, `2.000`.
 *   - Unidade inteira (UND…): sem casas — `-388`. Se o dado vier com fração mesmo assim,
 *     ela aparece (até 3 casas) em vez de ser arredondada e esconder o problema.
 *   - Unidade desconhecida (`null`/`undefined`): mesmo critério da inteira.
 *
 * Separador decimal com ponto, sem agrupamento de milhar — o mesmo formato do preço na tela de
 * Produtos (`toFixed`). Aceita string porque a API ainda pode mandar `numeric` como texto
 * (`"-388.0000"`).
 */
export function formatQuantity(value: number | string | null | undefined, isFractional?: boolean | null): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (isFractional === true) return (n === 0 ? 0 : n).toFixed(3);
  if (Number.isInteger(n)) return String(n === 0 ? 0 : n);
  return String(Number(n.toFixed(3)));
}

/** `true` quando a quantidade é zero — aceita o `"0.0000"` que a API ainda pode mandar. */
export function isZeroQuantity(value: number | string | null | undefined): boolean {
  return value != null && value !== "" && Number(value) === 0;
}
