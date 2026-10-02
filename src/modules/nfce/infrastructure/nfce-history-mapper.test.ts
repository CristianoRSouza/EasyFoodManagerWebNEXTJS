import { describe, expect, it } from "vitest";
import { toNfceEvent, toNfceLogEntry } from "./nfce-history-mapper";

describe("toNfceLogEntry", () => {
  it("mapeia um registro técnico", () => {
    const log = toNfceLogEntry({
      id: "l1",
      created_at: "2026-04-06T12:00:00.000Z",
      type: "status_change",
      level: "INFO",
      message: "Nota autorizada",
      details: null,
      previous_status: "sending",
      new_status: "authorized",
      return_code: "100",
      protocol: "13526000005224416",
      user_name: null,
    });
    expect(log).toMatchObject({ id: "l1", level: "INFO", previousStatus: "sending", newStatus: "authorized" });
  });

  it("mantém `details` em texto quando a linha já vem como string", () => {
    const log = toNfceLogEntry({
      id: "l2",
      created_at: "2026-04-06T12:00:00.000Z",
      type: "status_change",
      level: "INFO",
      message: "Nota autorizada",
      details: "mensagem simples",
      previous_status: null,
      new_status: null,
      return_code: null,
      protocol: null,
      user_name: null,
    });
    expect(log.details).toBe("mensagem simples");
  });

  it("indenta `details` que chega como JSON numa linha só (nuvem — legado 1.3.12, PR #29)", () => {
    const log = toNfceLogEntry({ id: "l9", created_at: "2026-01-01T00:00:00Z", level: "info", message: "m", details: '{"cStat":"100"}' });
    expect(log.details).toBe('{\n  "cStat": "100"\n}');
  });

  it("formata `details` como JSON quando a coluna jsonb chega como objeto", () => {
    const log = toNfceLogEntry({
      id: "l3",
      created_at: "2026-04-06T12:00:00.000Z",
      type: "status_change",
      level: "ERROR",
      message: "Nota caiu em revisão manual",
      details: { cStat: "225", xMotivo: "Rejeição: Falha no Schema XML" },
      previous_status: "sending",
      new_status: "manual_review",
      return_code: null,
      protocol: null,
      user_name: null,
    });
    expect(log.details).toBe(JSON.stringify({ cStat: "225", xMotivo: "Rejeição: Falha no Schema XML" }, null, 2));
  });
});

describe("toNfceEvent", () => {
  it("mapeia um evento fiscal (ex.: cancelamento)", () => {
    const event = toNfceEvent({
      id: "e1",
      event_type: "cancellation",
      event_description: "Cancelamento",
      event_sequence: 1,
      event_at: "2026-04-06T13:00:00.000Z",
      justification: "Erro de digitação",
      correction: null,
      protocol: "999",
      sefaz_status_code: "135",
      sefaz_status_reason: "Evento registrado",
      registered_at: "2026-04-06T13:00:05.000Z",
      situation: "registered",
      created_at: "2026-04-06T13:00:00.000Z",
    });
    expect(event).toMatchObject({ eventType: "cancellation", sequence: 1, justification: "Erro de digitação" });
  });
});
