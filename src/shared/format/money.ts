/**
 * Moeda BRL do `Intl`. (O outro formato do legado, `R$ 8.50`, é o componente `ui/Money`.)
 */

/** `R$ 1.234,50`: moeda BRL do `Intl`, com milhar e vírgula decimal (Receitas). */
export function formatBrl(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
