/**
 * Comanda — a conta de uma mesa ou totem, aberta no PDV e fechada pelo Sync-Service no
 * Firebird (PG → FB).
 *
 * `syncClosePending` é o campo que importa na operação: quando verdadeiro, a comanda foi
 * paga mas o fechamento ainda não chegou ao PDV — é a situação que exige alguém olhar.
 */
export interface Order {
  id: string;
  barcode: string;
  customerName: string | null;
  tableName: string;
  totemName: string | null;
  status: OrderStatus;
  fbSaleId: number | null;
  fbCashRegisterId: number | null;
  syncClosePending: boolean;
  syncCloseAttempts: number;
  syncCloseLastError: string | null;
  syncCloseRequestedAt: string | null;
  syncClosedToFbAt: string | null;
  /** `true` quando um TEF foi cancelado mas a venda já estava fechada no Firebird. */
  tefCancelFbSaleAlreadyClosed: boolean;
  tefCancelFbSaleMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = "open" | "closed" | "cancelled";

export type OrderStatusFilter = "all" | OrderStatus;
