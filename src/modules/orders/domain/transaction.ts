import type { Transaction as SharedTransaction, TefResultSnapshot } from "@/shared/domain/transaction";

export type { TefResultSnapshot };

/**
 * Recorte do tipo compartilhado (`src/shared/domain/transaction.ts`) com só os campos que a
 * tela de Comandas usa — evita reimplementar o tipo (e o mapeador) inteiro só para um subconjunto
 * de campos.
 */
export type Transaction = Pick<
  SharedTransaction,
  | "id"
  | "orderIds"
  | "paymentMethod"
  | "amount"
  | "installments"
  | "nsu"
  | "status"
  | "createdAt"
  | "tefResult"
  | "tefCancelFbSaleAlreadyClosed"
  | "tefCancelFbSaleMessage"
>;
