import { describe, it, expect } from "vitest";
import type { Order } from "./order";
import type { OrderItem } from "./order-item";
import type { Transaction } from "./transaction";
import {
  filterOrders,
  formatTransactionMethod,
  getFirebirdLinkStatus,
  getOrderTefCancelInfo,
  getTransactionTefCancelInfo,
  groupItemsByOrder,
  sumActiveItemsSubtotal,
  totemItemsPendingSync,
  uniqueProductIds,
  withProductImages,
} from "./order-rules";

function order(partial: Partial<Order> = {}): Order {
  return {
    id: "o1",
    barcode: "000123",
    customerName: null,
    tableName: "5",
    totemName: null,
    status: "open",
    fbSaleId: null,
    fbCashRegisterId: null,
    syncClosePending: false,
    syncCloseAttempts: 0,
    syncCloseLastError: null,
    syncCloseRequestedAt: null,
    syncClosedToFbAt: null,
    tefCancelFbSaleAlreadyClosed: false,
    tefCancelFbSaleMessage: null,
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: "2026-09-20T10:00:00Z",
    ...partial,
  };
}

function item(partial: Partial<OrderItem> = {}): OrderItem {
  return {
    id: "i1",
    orderId: "o1",
    productId: "p1",
    productName: "Coxinha",
    productBarcode: "789",
    quantity: 1,
    unitPrice: 10,
    subtotal: 10,
    unitName: "UND",
    origin: "system",
    status: "active",
    syncedToFb: true,
    fbId: 1,
    imageUrl: null,
    ...partial,
  };
}

function transaction(partial: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    orderIds: ["o1"],
    paymentMethod: "credit",
    amount: 10,
    installments: 1,
    nsu: null,
    status: "approved",
    createdAt: "2026-09-20T10:05:00Z",
    tefResult: null,
    tefCancelFbSaleAlreadyClosed: false,
    tefCancelFbSaleMessage: null,
    ...partial,
  };
}

describe("formatTransactionMethod", () => {
  it("reconhece os métodos conhecidos por substring", () => {
    expect(formatTransactionMethod("credit_card")).toBe("Crédito");
    expect(formatTransactionMethod("debit_card")).toBe("Débito");
    expect(formatTransactionMethod("pix_dynamic")).toBe("PIX");
    expect(formatTransactionMethod("cash")).toBe("Dinheiro");
    expect(formatTransactionMethod("dinheiro")).toBe("Dinheiro");
  });

  it("devolve o texto original (trim) para método desconhecido", () => {
    expect(formatTransactionMethod("  voucher  ")).toBe("voucher");
  });

  it("devolve 'Outro' para método vazio", () => {
    expect(formatTransactionMethod("   ")).toBe("Outro");
  });
});

describe("getTransactionTefCancelInfo", () => {
  it("null quando não houve cancelamento com venda fechada", () => {
    expect(getTransactionTefCancelInfo(transaction())).toBeNull();
  });

  it("usa a mensagem da transação quando presente (flag direta)", () => {
    const t = transaction({ tefCancelFbSaleAlreadyClosed: true, tefCancelFbSaleMessage: "msg da transação" });
    expect(getTransactionTefCancelInfo(t)).toEqual({ message: "msg da transação" });
  });

  it("cai para a mensagem do tef_result quando a flag vem só dele", () => {
    const t = transaction({
      tefResult: { tefCancelFbSaleAlreadyClosed: true, tefCancelAdminMessage: "msg do snapshot" },
    });
    expect(getTransactionTefCancelInfo(t)).toEqual({ message: "msg do snapshot" });
  });

  it("usa a mensagem padrão quando nenhuma das duas fontes tem texto", () => {
    const t = transaction({ tefCancelFbSaleAlreadyClosed: true, tefCancelFbSaleMessage: null });
    expect(getTransactionTefCancelInfo(t)?.message).toBe(
      "TEF cancelado, mas a venda ja estava fechada no Firebird; a comanda foi mantida fechada.",
    );
  });
});

describe("getOrderTefCancelInfo", () => {
  it("null quando a comanda não tem o alerta", () => {
    expect(getOrderTefCancelInfo(order())).toBeNull();
  });

  it("mensagem da comanda quando presente", () => {
    const o = order({ tefCancelFbSaleAlreadyClosed: true, tefCancelFbSaleMessage: "aviso" });
    expect(getOrderTefCancelInfo(o)).toEqual({ message: "aviso" });
  });

  it("mensagem padrão quando a comanda não tem texto próprio", () => {
    const o = order({ tefCancelFbSaleAlreadyClosed: true });
    expect(getOrderTefCancelInfo(o)?.message).toContain("TEF cancelado");
  });
});

describe("totemItemsPendingSync", () => {
  it("verdadeiro só para item de totem, ativo, ainda não sincronizado", () => {
    expect(totemItemsPendingSync([item({ origin: "totem", status: "active", syncedToFb: false })])).toBe(true);
  });

  it("falso para item de totem cancelado", () => {
    expect(totemItemsPendingSync([item({ origin: "totem", status: "cancelled", syncedToFb: false })])).toBe(false);
  });

  it("falso para item do sistema (PDV)", () => {
    expect(totemItemsPendingSync([item({ origin: "system", status: "active", syncedToFb: false })])).toBe(false);
  });

  it("falso quando já sincronizado", () => {
    expect(totemItemsPendingSync([item({ origin: "totem", status: "active", syncedToFb: true })])).toBe(false);
  });
});

describe("getFirebirdLinkStatus", () => {
  it("vinculada quando a comanda tem venda FB", () => {
    expect(getFirebirdLinkStatus(order({ fbSaleId: 42 }), [])).toBe("fb_linked");
  });

  it("vinculada quando a comanda foi marcada fechada no FB, mesmo sem fb_sale_id", () => {
    expect(getFirebirdLinkStatus(order({ syncClosedToFbAt: "2026-09-20T11:00:00Z" }), [])).toBe("fb_linked");
  });

  it("sem vínculo quando não há itens nem venda FB", () => {
    expect(getFirebirdLinkStatus(order(), [])).toBe("fb_unlinked");
  });

  it("sem vínculo quando nenhum item ativo tem fb_id", () => {
    const items = [item({ status: "active", fbId: null })];
    expect(getFirebirdLinkStatus(order(), items)).toBe("fb_unlinked");
  });

  it("parcial quando só parte dos itens ativos tem fb_id", () => {
    const items = [item({ id: "i1", status: "active", fbId: 1 }), item({ id: "i2", status: "active", fbId: null })];
    expect(getFirebirdLinkStatus(order(), items)).toBe("fb_partial");
  });

  it("vinculada quando todos os itens ativos têm fb_id", () => {
    const items = [item({ id: "i1", status: "active", fbId: 1 }), item({ id: "i2", status: "active", fbId: 2 })];
    expect(getFirebirdLinkStatus(order(), items)).toBe("fb_linked");
  });

  it("usa todos os itens quando nenhum está ativo (evita 'sem vínculo' com item cancelado vinculado)", () => {
    const items = [item({ status: "cancelled", fbId: 1 })];
    expect(getFirebirdLinkStatus(order(), items)).toBe("fb_linked");
  });
});

describe("sumActiveItemsSubtotal", () => {
  it("soma só os itens ativos", () => {
    const items = [item({ subtotal: 10, status: "active" }), item({ subtotal: 25, status: "cancelled" })];
    expect(sumActiveItemsSubtotal(items)).toBe(10);
  });

  it("zero para lista vazia", () => {
    expect(sumActiveItemsSubtotal([])).toBe(0);
  });
});

describe("filterOrders", () => {
  const orders = [
    order({ id: "a", barcode: "111", status: "open", customerName: "Maria" }),
    order({ id: "b", barcode: "222", status: "closed", customerName: "João" }),
    order({ id: "c", barcode: "333", status: "cancelled", customerName: null }),
  ];

  it("'all' devolve tudo", () => {
    expect(filterOrders(orders, { search: "", status: "all" })).toHaveLength(3);
  });

  it("filtra por status", () => {
    expect(filterOrders(orders, { search: "", status: "closed" }).map((o) => o.id)).toEqual(["b"]);
  });

  it("busca por barcode (case-insensitive)", () => {
    expect(filterOrders(orders, { search: "111", status: "all" }).map((o) => o.id)).toEqual(["a"]);
  });

  it("busca por nome do cliente", () => {
    expect(filterOrders(orders, { search: "joão", status: "all" }).map((o) => o.id)).toEqual(["b"]);
  });

  it("não quebra quando customerName é null", () => {
    expect(filterOrders(orders, { search: "sem-match", status: "all" })).toHaveLength(0);
  });
});

describe("formatTransactionMethod — voucher (legado 1.3.12)", () => {
  it("na Comanda o voucher sai cru, como no Orders.tsx do legado (só Transações/Receitas traduzem)", () => {
    expect(formatTransactionMethod("meal_voucher")).toBe("meal_voucher");
    expect(formatTransactionMethod("food_voucher")).toBe("food_voucher");
    expect(formatTransactionMethod("credit")).toBe("Crédito");
  });
});

describe("groupItemsByOrder (legado 1.3.12, PR #27)", () => {
  it("agrupa por comanda e ordena alfabeticamente (pt-BR, sem diferenciar maiúsculas/acentos)", () => {
    const grupos = groupItemsByOrder([
      item({ id: "a", orderId: "o1", productName: "Suco" }),
      item({ id: "b", orderId: "o2", productName: "Água" }),
      item({ id: "c", orderId: "o1", productName: "água com gás" }),
      item({ id: "d", orderId: "o1", productName: "Coxinha" }),
    ]);
    expect(grupos.get("o1")!.map((i) => i.id)).toEqual(["c", "d", "a"]);
    expect(grupos.get("o2")!.map((i) => i.id)).toEqual(["b"]);
  });

  it("empate no nome desempata pelo fb_id (sem fb_id vai por último) e depois pelo id", () => {
    const grupos = groupItemsByOrder([
      item({ id: "z", productName: "Coxinha", fbId: null }),
      item({ id: "y", productName: "Coxinha", fbId: 7 }),
      item({ id: "x", productName: "Coxinha", fbId: 3 }),
      item({ id: "b", productName: "Coxinha", fbId: null }),
    ]);
    expect(grupos.get("o1")!.map((i) => i.id)).toEqual(["x", "y", "b", "z"]);
  });
});

describe("uniqueProductIds / withProductImages (homologação, 2026-10-01)", () => {
  const base = { orderId: "o1", productName: "x", productBarcode: "1", quantity: 1, unitPrice: 1, subtotal: 1, unitName: null, origin: "totem", status: "active", syncedToFb: true, fbId: 1, imageUrl: null } as const;
  const items: OrderItem[] = [
    { ...base, id: "i1", productId: "p1" },
    { ...base, id: "i2", productId: "p1" },
    { ...base, id: "i3", productId: null },
    { ...base, id: "i4", productId: "p2" },
  ];

  it("ids únicos, sem vazios, na ordem em que aparecem", () => {
    expect(uniqueProductIds(items)).toEqual(["p1", "p2"]);
  });

  it("sem mapa (loja, ou fotos ainda carregando), devolve os mesmos itens", () => {
    expect(withProductImages(items, undefined)).toBe(items);
  });

  it("com mapa, a foto de cada item é a do produto — e nada para quem não tem produto ou foto", () => {
    const result = withProductImages(items, new Map([["p1", "https://cdn/p1.jpg"]]));
    expect(result.map((i) => i.imageUrl)).toEqual(["https://cdn/p1.jpg", "https://cdn/p1.jpg", null, null]);
  });
});
