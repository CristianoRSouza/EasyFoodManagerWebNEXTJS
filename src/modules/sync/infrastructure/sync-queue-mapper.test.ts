import { describe, expect, it } from "vitest";
import {
  normalizeSyncPayload,
  toPanelActiveRetry,
  toPanelBacklogItem,
  toPanelByEntity,
  toPanelFailureGroup,
  toPanelRatePoint,
  toPanelRecentEvent,
  toPanelRecentFailure,
  toPanelSummary,
} from "./sync-queue-mapper";

describe("toPanelSummary", () => {
  it("inbox: applied_total vira success_total (objeto, como a API da loja devolve)", () => {
    expect(
      toPanelSummary("inbox", { pending_novos: 2, pending_em_retry: 1, applied_total: 40, failed_terminal: 3, total: 46 }),
    ).toEqual({ pending_novos: 2, pending_em_retry: 1, success_total: 40, failed_terminal: 3, total: 46 });
  });

  it("outbox: dispatched_total vira success_total; aceita a linha dentro de um array (formato da RPC)", () => {
    expect(
      toPanelSummary("outbox", [{ pending_novos: "1", pending_em_retry: 0, dispatched_total: "9", failed_terminal: 0, total: 10 }]),
    ).toEqual({ pending_novos: 1, pending_em_retry: 0, success_total: 9, failed_terminal: 0, total: 10 });
  });

  it("resposta vazia/null zera tudo em vez de quebrar", () => {
    const zero = { pending_novos: 0, pending_em_retry: 0, success_total: 0, failed_terminal: 0, total: 0 };
    expect(toPanelSummary("inbox", null)).toEqual(zero);
    expect(toPanelSummary("outbox", [])).toEqual(zero);
  });
});

describe("toPanelByEntity", () => {
  it("lê o status da coluna de cada fila, com `status` como alternativa", () => {
    const base = { entity_name: "orders", qtd: 5, em_retry: 1, max_retry: 2, mais_antigo: "2024-01-01T08:00:00Z", mais_recente: null };
    expect(toPanelByEntity("inbox", { ...base, apply_status: "applied" }).status).toBe("applied");
    expect(toPanelByEntity("outbox", { ...base, dispatch_status: "dispatched" }).status).toBe("dispatched");
    expect(toPanelByEntity("inbox", { ...base, status: "pending" })).toEqual({
      entity_name: "orders",
      status: "pending",
      qtd: 5,
      em_retry: 1,
      max_retry: 2,
      mais_antigo: "2024-01-01T08:00:00Z",
      mais_recente: null,
    });
  });
});

describe("listas de falha/backlog", () => {
  it("toPanelFailureGroup", () => {
    expect(
      toPanelFailureGroup({ entity_name: "products", erro_resumido: null, qtd: "4", retries_gastos: 5, primeiro: null, ultimo: "2024-01-01T09:00:00Z" }),
    ).toEqual({ entity_name: "products", erro_resumido: "", qtd: 4, retries_gastos: 5, primeiro: null, ultimo: "2024-01-01T09:00:00Z" });
  });

  it("toPanelBacklogItem", () => {
    expect(toPanelBacklogItem({ entity_name: "units", pendentes_nunca_tentados: 7, mais_antigo: null })).toEqual({
      entity_name: "units",
      pendentes_nunca_tentados: 7,
      mais_antigo: null,
    });
  });

  it("toPanelActiveRetry: no outbox a data vem em changed_at", () => {
    const row = { event_id: "e1", entity_name: "orders", op: "UPDATE", retry_count: 0, next_retry_after: null, ultimo_erro: "x" };
    expect(toPanelActiveRetry("outbox", { ...row, changed_at: "2024-01-01T10:00:00Z" }).received_at).toBe("2024-01-01T10:00:00Z");
    expect(toPanelActiveRetry("inbox", { ...row, received_at: "2024-01-01T11:00:00Z" })).toEqual({
      event_id: "e1",
      entity_name: "orders",
      op: "UPDATE",
      retry_count: 0,
      next_retry_after: null,
      ultimo_erro: "x",
      received_at: "2024-01-01T11:00:00Z",
    });
  });

  it("toPanelRecentFailure: no outbox a data vem em changed_at; erro ausente vira vazio", () => {
    expect(
      toPanelRecentFailure("outbox", { event_id: "e2", entity_name: "orders", op: "INSERT", retry_count: 0, changed_at: "2024-01-01T12:00:00Z" }),
    ).toEqual({ event_id: "e2", entity_name: "orders", op: "INSERT", retry_count: 0, received_at: "2024-01-01T12:00:00Z", erro: "" });
  });
});

describe("toPanelRatePoint", () => {
  it("inbox usa aplicados_por_minuto; outbox, despachados_por_minuto", () => {
    expect(toPanelRatePoint("inbox", { minuto: "2024-01-01T10:00:00Z", aplicados_por_minuto: 3 })).toEqual({
      minuto: "2024-01-01T10:00:00Z",
      por_minuto: 3,
    });
    expect(toPanelRatePoint("outbox", { minuto: "m", despachados_por_minuto: "8" }).por_minuto).toBe(8);
  });
});

describe("toPanelRecentEvent", () => {
  it("inbox: apply_status/applied_at/received_at/apply_error", () => {
    expect(
      toPanelRecentEvent("inbox", {
        event_id: "e3",
        entity_name: "orders",
        entity_id: 77,
        op: "UPDATE",
        apply_status: "failed",
        retry_count: 2,
        applied_at: null,
        received_at: "2024-01-01T08:00:00Z",
        apply_error: "boom",
        payload: { id: 1 },
      }),
    ).toEqual({
      event_id: "e3",
      entity_name: "orders",
      entity_id: "77",
      op: "UPDATE",
      status: "failed",
      retry_count: 2,
      applied_at: null,
      received_at: "2024-01-01T08:00:00Z",
      apply_error: "boom",
      payload: { id: 1 },
    });
  });

  it("outbox: dispatch_status/dispatched_at/changed_at/dispatch_error e payload em texto JSON", () => {
    expect(
      toPanelRecentEvent("outbox", {
        event_id: "e4",
        entity_name: "transactions",
        entity_id: "t1",
        op: "INSERT",
        dispatch_status: "dispatched",
        retry_count: 0,
        dispatched_at: "2024-01-01T09:00:00Z",
        changed_at: "2024-01-01T08:59:00Z",
        dispatch_error: "",
        payload: '{"amount": 10}',
      }),
    ).toEqual({
      event_id: "e4",
      entity_name: "transactions",
      entity_id: "t1",
      op: "INSERT",
      status: "dispatched",
      retry_count: 0,
      applied_at: "2024-01-01T09:00:00Z",
      received_at: "2024-01-01T08:59:00Z",
      apply_error: "",
      payload: { amount: 10 },
    });
  });
});

describe("normalizeSyncPayload", () => {
  it("texto JSON vira objeto; texto comum e JSON inválido ficam como texto; vazio vira null", () => {
    expect(normalizeSyncPayload('[1,2]')).toEqual([1, 2]);
    expect(normalizeSyncPayload("  ")).toBeNull();
    expect(normalizeSyncPayload(null)).toBeNull();
    expect(normalizeSyncPayload("abc")).toBe("abc");
    expect(normalizeSyncPayload("{quebrado")).toBe("{quebrado");
    expect(normalizeSyncPayload("{quebrado}")).toBe("{quebrado}");
    const obj = { a: 1 };
    expect(normalizeSyncPayload(obj)).toBe(obj);
  });
});
