/**
 * Indicadores da classificação tributária IBS/CBS (`cbs_tax_class_ibscbs_indicator`,
 * `cbs_cst_ibscbs_indicator`). Cópia de `ibscbs-indicator.ts` do legado 1.3.12 (PRs #32/#43/#45).
 *
 * ► POR QUE NÃO BASTA `valor ? "Sim" : "Não"`
 *
 *   As duas fontes entregam o mesmo dado em formatos diferentes:
 *   - Loja: o caractere cru da API do governo — `"0"`/`"1"` nos grupos, `"0"`/`"S"`/vazio no
 *     redutor de BC. `"0"` é verdadeiro em JS: a tela mostrava "Sim" para as classificações que
 *     o governo marca explicitamente como NÃO.
 *   - Nuvem (EasyFoodAPI): boolean no redutor, e `'S'`/`null` nos grupos.
 *
 *   Nas duas, ausência é "não participa". Tratar null como "Não" é o que faz as duas telas dizerem
 *   a mesma coisa.
 */
export function indicadorLigado(valor: unknown): boolean {
  if (typeof valor === "boolean") return valor;
  if (typeof valor === "number") return valor === 1;
  if (typeof valor !== "string") return false;
  const v = valor.trim().toUpperCase();
  return v === "1" || v === "S" || v === "TRUE";
}

export const indicadorSimNao = (valor: unknown): "Sim" | "Não" => (indicadorLigado(valor) ? "Sim" : "Não");
