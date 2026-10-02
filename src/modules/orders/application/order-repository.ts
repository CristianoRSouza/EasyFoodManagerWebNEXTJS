import type { Order } from "../domain/order";
import type { OrderItem } from "../domain/order-item";
import type { Transaction } from "../domain/transaction";
import type { DateRange } from "@/shared/domain/date-range";

export type { DateRange } from "@/shared/domain/date-range";

/**
 * Comandas, itens e transações do período.
 *
 * A tela carrega comandas e itens do período inteiro de uma só vez (precisa somar o subtotal
 * de cada linha simultaneamente); transações só são buscadas por comanda, e só quando a linha
 * é expandida — mesmo recorte do legado.
 */
export interface OrderRepository {
  listOrders(range: DateRange): Promise<Order[]>;
  listOrderItems(range: DateRange): Promise<OrderItem[]>;
  listTransactionsByOrderId(orderId: string): Promise<Transaction[]>;
  /**
   * Mapa `product_id → URL pública da foto` (só a nuvem: os itens da EasyFoodAPI não trazem a
   * foto; na loja ela vem do servidor de imagens, por barcode). Mesma rota do legado
   * (`fetchApiProductImages`).
   */
  listProductImages(productIds: string[]): Promise<Map<string, string | null>>;
}
