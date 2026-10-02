/** Filtro de período (`AAAA-MM-DD`) comum às consultas de Comandas, Transações e Produtos. */
export interface DateRange {
  from?: string;
  to?: string;
}
