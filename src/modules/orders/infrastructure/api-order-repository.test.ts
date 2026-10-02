import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiOrderRepository, PRODUCT_IMAGES_MAX_IDS_PER_REQUEST } from "./api-order-repository";
import * as apiClient from "@/shared/http/api-client";

vi.mock("@/shared/http/api-client");

const tenant = { companyId: "company-1", storeId: "store-1" };

beforeEach(() => {
  vi.mocked(apiClient.apiRequest).mockReset();
});

describe("ApiOrderRepository.listOrders", () => {
  it("mapeia a linha da API para o domínio (camelCase) e monta a query de período", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [
        {
          id: "o1",
          barcode: "000123",
          customer_name: "Maria",
          table_name: "5",
          totem_name: null,
          status: "closed",
          fb_sale_id: 42,
          fb_cash_register_id: 3,
          sync_close_pending: false,
          sync_close_attempts: 2,
          sync_close_last_error: null,
          sync_close_requested_at: "2026-09-20T10:00:00Z",
          sync_closed_to_fb_at: "2026-09-20T10:05:00Z",
          tef_cancel_fb_sale_already_closed: true,
          tef_cancel_fb_sale_message: "aviso",
          created_at: "2026-09-20T09:00:00Z",
          updated_at: "2026-09-20T10:05:00Z",
        },
      ],
    });

    const repository = new ApiOrderRepository(tenant);
    const orders = await repository.listOrders({ from: "2026-09-01", to: "2026-09-30" });

    expect(apiClient.apiRequest).toHaveBeenCalledWith("/orders?from=2026-09-01&to=2026-09-30", { tenant });
    expect(orders).toEqual([
      {
        id: "o1",
        barcode: "000123",
        customerName: "Maria",
        tableName: "5",
        totemName: null,
        status: "closed",
        fbSaleId: 42,
        fbCashRegisterId: 3,
        syncClosePending: false,
        syncCloseAttempts: 2,
        syncCloseLastError: null,
        syncCloseRequestedAt: "2026-09-20T10:00:00Z",
        syncClosedToFbAt: "2026-09-20T10:05:00Z",
        tefCancelFbSaleAlreadyClosed: true,
        tefCancelFbSaleMessage: "aviso",
        createdAt: "2026-09-20T09:00:00Z",
        updatedAt: "2026-09-20T10:05:00Z",
      },
    ]);
  });

  it("sem from/to não anexa querystring", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });
    const repository = new ApiOrderRepository(tenant);
    await repository.listOrders({});
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/orders", { tenant });
  });

  it("status desconhecido cai para 'open' (defensivo)", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [{ id: "o1", status: "algo-novo" }],
    });
    const repository = new ApiOrderRepository(tenant);
    const [order] = await repository.listOrders({});
    expect(order?.status).toBe("open");
  });

  it("resposta sem 'data' devolve lista vazia", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({});
    const repository = new ApiOrderRepository(tenant);
    expect(await repository.listOrders({})).toEqual([]);
  });
});

describe("ApiOrderRepository.listOrderItems", () => {
  it("mapeia itens, incluindo image_url quando presente (nuvem)", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [
        {
          id: "i1",
          order_id: "o1",
          product_id: "p1",
          product_name: "Coxinha",
          product_barcode: "789",
          quantity: "2",
          unit_price: "5.50",
          subtotal: "11.00",
          unit_name: "UND",
          origin: "totem",
          status: "active",
          synced_to_fb: false,
          fb_id: null,
          image_url: "https://cdn.example.com/p1.jpg",
        },
      ],
    });

    const repository = new ApiOrderRepository(tenant);
    const items = await repository.listOrderItems({ from: "2026-09-01", to: "2026-09-30" });

    expect(apiClient.apiRequest).toHaveBeenCalledWith("/order-items?from=2026-09-01&to=2026-09-30", { tenant });
    expect(items).toEqual([
      {
        id: "i1",
        orderId: "o1",
        productId: "p1",
        productName: "Coxinha",
        productBarcode: "789",
        quantity: 2,
        unitPrice: 5.5,
        subtotal: 11,
        unitName: "UND",
        origin: "totem",
        status: "active",
        syncedToFb: false,
        fbId: null,
        imageUrl: "https://cdn.example.com/p1.jpg",
      },
    ]);
  });

  it("sem image_url (loja/LAN) mapeia para null", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [{ id: "i1", order_id: "o1", quantity: 1, unit_price: 1, subtotal: 1 }],
    });
    const repository = new ApiOrderRepository(tenant);
    const [item] = await repository.listOrderItems({});
    expect(item?.imageUrl).toBeNull();
  });
});

describe("ApiOrderRepository.listTransactionsByOrderId", () => {
  it("monta a query com orderId e mapeia o tef_result (objeto)", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [
        {
          id: "t1",
          order_ids: ["o1", "o2"],
          payment_method: "credit",
          amount: "42.50",
          installments: 3,
          nsu: "000111",
          status: "approved",
          created_at: "2026-09-20T10:05:00Z",
          tef_result: { tefCancelFbSaleAlreadyClosed: true, tefCancelAdminMessage: "msg" },
          tef_cancel_fb_sale_already_closed: true,
          tef_cancel_fb_sale_message: null,
        },
      ],
    });

    const repository = new ApiOrderRepository(tenant);
    const transactions = await repository.listTransactionsByOrderId("o1");

    expect(apiClient.apiRequest).toHaveBeenCalledWith("/transactions?orderId=o1", { tenant });
    expect(transactions).toEqual([
      {
        id: "t1",
        orderIds: ["o1", "o2"],
        paymentMethod: "credit",
        amount: 42.5,
        installments: 3,
        nsu: "000111",
        status: "approved",
        createdAt: "2026-09-20T10:05:00Z",
        tefResult: { tefCancelFbSaleAlreadyClosed: true, tefCancelAdminMessage: "msg" },
        tefCancelFbSaleAlreadyClosed: true,
        tefCancelFbSaleMessage: null,
      },
    ]);
  });

  it("tef_result como string JSON também é interpretado", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({
      data: [{ id: "t1", tef_result: '{"tefCancelAdminMessage":"de string"}' }],
    });
    const repository = new ApiOrderRepository(tenant);
    const [t] = await repository.listTransactionsByOrderId("o1");
    expect(t?.tefResult).toEqual({ tefCancelAdminMessage: "de string" });
  });

  it("tef_result inválido (string não-JSON) vira null sem quebrar", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [{ id: "t1", tef_result: "não é json" }] });
    const repository = new ApiOrderRepository(tenant);
    const [t] = await repository.listTransactionsByOrderId("o1");
    expect(t?.tefResult).toBeNull();
  });

  it("orderId em branco não chama a API e devolve lista vazia", async () => {
    const repository = new ApiOrderRepository(tenant);
    const result = await repository.listTransactionsByOrderId("   ");
    expect(result).toEqual([]);
    expect(apiClient.apiRequest).not.toHaveBeenCalled();
  });
});

describe("ApiOrderRepository.listProductImages", () => {
  it("busca as fotos dos produtos de uma vez em /product-images?ids=… e devolve o mapa product_id → URL (homologação, 2026-10-01)", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: { p1: "https://cdn/p1.jpg", p2: "https://cdn/p2.jpg" } });
    const repository = new ApiOrderRepository(tenant);
    const images = await repository.listProductImages(["p1", "p2"]);
    expect(apiClient.apiRequest).toHaveBeenCalledWith("/product-images?ids=p1%2Cp2", { tenant });
    expect(images).toEqual(new Map([["p1", "https://cdn/p1.jpg"], ["p2", "https://cdn/p2.jpg"]]));
  });

  it("sem produtos não chama a API", async () => {
    const repository = new ApiOrderRepository(tenant);
    expect(await repository.listProductImages([])).toEqual(new Map());
    expect(apiClient.apiRequest).not.toHaveBeenCalled();
  });

  it("resposta sem `data` vira mapa vazio", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({});
    const repository = new ApiOrderRepository(tenant);
    expect(await repository.listProductImages(["p1"])).toEqual(new Map());
  });

  it("o limite por chamada é o da EasyFoodAPI: 200 ids (400 too_many_ids acima disso)", () => {
    expect(PRODUCT_IMAGES_MAX_IDS_PER_REQUEST).toBe(200);
  });

  it("acima de 200 ids divide em lotes de no máximo 200 e junta os resultados (validação de produção, período \"Todos\")", async () => {
    const ids = Array.from({ length: 450 }, (_, i) => `p${i}`);
    vi.mocked(apiClient.apiRequest).mockImplementation(async (path: string) => {
      const query = new URLSearchParams(path.slice(path.indexOf("?") + 1));
      const batch = (query.get("ids") ?? "").split(",");
      return { data: Object.fromEntries(batch.map((id) => [id, `https://cdn/${id}.jpg`])) };
    });
    const repository = new ApiOrderRepository(tenant);
    const images = await repository.listProductImages(ids);

    const calls = vi.mocked(apiClient.apiRequest).mock.calls;
    const sizes = calls.map(([path]) =>
      (new URLSearchParams(String(path).slice(String(path).indexOf("?") + 1)).get("ids") ?? "").split(",").length,
    );
    expect(sizes).toEqual([200, 200, 50]);
    for (const [, options] of calls) expect(options).toEqual({ tenant });
    expect(images.size).toBe(450);
    expect(images.get("p0")).toBe("https://cdn/p0.jpg");
    expect(images.get("p449")).toBe("https://cdn/p449.jpg");
  });

  it("exatamente 200 ids cabem numa chamada só", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: {} });
    const repository = new ApiOrderRepository(tenant);
    await repository.listProductImages(Array.from({ length: 200 }, (_, i) => `p${i}`));
    expect(apiClient.apiRequest).toHaveBeenCalledTimes(1);
  });
});
