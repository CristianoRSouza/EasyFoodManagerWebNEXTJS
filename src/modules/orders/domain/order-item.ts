/** Um lançamento dentro da comanda — o que foi pedido/consumido. */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  productBarcode: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  unitName: string | null;
  /** De onde o item veio — lançado no PDV ou pedido no totem. */
  origin: string;
  status: string;
  /** `true` quando o item já foi espelhado no Firebird do PDV. */
  syncedToFb: boolean;
  fbId: number | null;
  /**
   * URL pública da foto do produto.
   *
   * Só chega preenchida na nuvem — a API resolve o Storage no servidor. Na loja (LAN) fica
   * `null`: a foto é resolvida no cliente por código de barras via `useProductImageUrl`
   * (servidor de imagens local), não por este campo.
   */
  imageUrl: string | null;
}

/** Item cancelado continua na comanda, mas não é venda. */
export function isCancelledItem(item: OrderItem): boolean {
  return item.status === "cancelled";
}
