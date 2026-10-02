/**
 * Valor em reais no formato do legado: `R$ 8.50` (duas casas, ponto decimal) — Produtos,
 * Comandas, Transações.
 *
 * É um componente, não uma função que devolve texto, de propósito: o legado escreve
 * `R$ {valor.toFixed(2)}` no JSX, que vira DOIS nós de texto. O navegador posiciona os glifos de
 * forma levemente diferente quando é um nó só (`"R$ 8.50"`), e a comparação pixel a pixel acusa.
 */
export function Money({ value }: { value: number }) {
  return <>R$ {value.toFixed(2)}</>;
}
