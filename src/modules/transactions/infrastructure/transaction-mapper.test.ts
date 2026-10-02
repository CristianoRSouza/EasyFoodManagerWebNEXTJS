import { describe, expect, it } from "vitest";
import { mapTransactionRow } from "./transaction-mapper";

describe("mapTransactionRow", () => {
  it("mapeia uma linha completa da API para o domínio (camelCase)", () => {
    const row = {
      id: "t1",
      order_ids: ["o1", "o2"],
      payment_method: "credit_card",
      amount: "123.45",
      installments: 3,
      nsu: "000123",
      authorization_code: "AB12",
      tef_transaction_id: "tef-1",
      status: "approved",
      created_at: "2026-01-01T10:00:00.000Z",
      tef_result: { storedAt: "2026-01-01T10:00:01.000Z" },
      tef_cancel_fb_sale_already_closed: false,
      tef_cancel_fb_sale_message: null,
      pix_qrcode_id: "qr-1",
      pix_status: "paid",
      pix_txid: "tx-1",
      pix_e2e_id: "e2e-1",
      pix_paid_at: "2026-01-01T10:00:02.000Z",
      pix_last_poll_at: "2026-01-01T10:00:03.000Z",
      pix_provider_url: "https://provider.example/qr",
    };

    expect(mapTransactionRow(row)).toEqual({
      id: "t1",
      orderIds: ["o1", "o2"],
      paymentMethod: "credit_card",
      amount: 123.45,
      installments: 3,
      nsu: "000123",
      authorizationCode: "AB12",
      tefTransactionId: "tef-1",
      status: "approved",
      createdAt: "2026-01-01T10:00:00.000Z",
      tefResult: { storedAt: "2026-01-01T10:00:01.000Z" },
      tefCancelFbSaleAlreadyClosed: false,
      tefCancelFbSaleMessage: null,
      pixQrcodeId: "qr-1",
      pixStatus: "paid",
      pixTxid: "tx-1",
      pixE2eId: "e2e-1",
      pixPaidAt: "2026-01-01T10:00:02.000Z",
      pixLastPollAt: "2026-01-01T10:00:03.000Z",
      pixProviderUrl: "https://provider.example/qr",
    });
  });

  it("campos ausentes viram null/valores padrão, sem quebrar", () => {
    const mapped = mapTransactionRow({ id: "t2" });
    expect(mapped).toMatchObject({
      id: "t2",
      orderIds: [],
      paymentMethod: "",
      amount: 0,
      installments: 1,
      nsu: null,
      authorizationCode: null,
      tefTransactionId: null,
      status: "pending",
      tefResult: null,
      // Sempre um boolean definido (nunca `undefined`) — é o que corrige a divergência com o
      // mapeador de Comandas, que já usava `=== true` (ver fase-2-revisao-final.md, I8).
      tefCancelFbSaleAlreadyClosed: false,
    });
  });

  it("tef_cancel_fb_sale_already_closed só é true quando o valor é exatamente `true` (nunca undefined)", () => {
    expect(mapTransactionRow({ id: "t6", tef_cancel_fb_sale_already_closed: true }).tefCancelFbSaleAlreadyClosed).toBe(true);
    expect(mapTransactionRow({ id: "t7", tef_cancel_fb_sale_already_closed: "true" }).tefCancelFbSaleAlreadyClosed).toBe(false);
  });

  it("tef_result como string JSON é decodificado; string inválida vira null", () => {
    expect(mapTransactionRow({ id: "t3", tef_result: '{"storedAt":"x"}' }).tefResult).toEqual({ storedAt: "x" });
    expect(mapTransactionRow({ id: "t4", tef_result: "{invalido" }).tefResult).toBeNull();
  });

  it("amount não numérico e não parseável cai para 0", () => {
    expect(mapTransactionRow({ id: "t5", amount: "abc" }).amount).toBe(0);
  });
});
