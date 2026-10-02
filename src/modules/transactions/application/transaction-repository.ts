import type { Transaction } from "../domain/transaction";
import type { DateRange } from "@/shared/domain/date-range";

export type { DateRange as TransactionDateRange } from "@/shared/domain/date-range";

export interface TransactionRepository {
  /** Transações do período. Sem paginação — a API devolve o período inteiro numa resposta. */
  list(range: DateRange): Promise<Transaction[]>;

  /**
   * Código de barras de cada comanda do período, por id.
   *
   * A transação guarda o identificador da comanda, não o código que a pessoa lê no balcão —
   * esta é a tradução usada na coluna "Comanda" da listagem.
   */
  orderBarcodes(range: DateRange): Promise<Map<string, string>>;
}
