import { describe, it, expect } from "vitest";
import { filterAuditLogs, formatAuditValue, formatAuditDateTime, AUDIT_ACTION_LABELS, AUDIT_FIELD_LABELS } from "./totem-audit";
import type { TotemAuditLog } from "./totem-config";

const log = (over: Partial<TotemAuditLog> = {}): TotemAuditLog => ({
  id: "a1",
  totem_config_id: "t1",
  action: "updated",
  changed_fields: [],
  previous_values: {},
  new_values: {},
  performed_by: "admin@local.dev",
  created_at: "2026-01-15T10:00:00Z",
  ...over,
});

describe("filterAuditLogs", () => {
  const now = new Date("2026-01-20T12:00:00Z");
  const logs = [
    log({ id: "created", action: "created", created_at: "2026-01-20T09:00:00Z" }),
    log({ id: "updated-old", action: "updated", created_at: "2026-01-01T09:00:00Z" }),
    log({ id: "toggled-recent", action: "toggled", created_at: "2026-01-18T09:00:00Z" }),
  ];

  it("all/all: devolve tudo", () => {
    expect(filterAuditLogs(logs, "all", "all", now).map((l) => l.id)).toEqual(["created", "updated-old", "toggled-recent"]);
  });

  it("filtra por ação", () => {
    expect(filterAuditLogs(logs, "toggled", "all", now).map((l) => l.id)).toEqual(["toggled-recent"]);
  });

  it("filtra por período (7d)", () => {
    expect(filterAuditLogs(logs, "all", "7d", now).map((l) => l.id)).toEqual(["created", "toggled-recent"]);
  });

  it("combina ação e período", () => {
    expect(filterAuditLogs(logs, "created", "today", now).map((l) => l.id)).toEqual(["created"]);
  });
});

describe("formatAuditValue", () => {
  it("null/undefined -> —", () => {
    expect(formatAuditValue(null)).toBe("—");
    expect(formatAuditValue(undefined)).toBe("—");
  });
  it("boolean -> Sim/Não", () => {
    expect(formatAuditValue(true)).toBe("Sim");
    expect(formatAuditValue(false)).toBe("Não");
  });
  it("outros -> String(value)", () => {
    expect(formatAuditValue(42)).toBe("42");
    expect(formatAuditValue("TOTEM-001")).toBe("TOTEM-001");
  });
});

describe("formatAuditDateTime", () => {
  it("formata sem vírgula, com segundos", () => {
    const formatted = formatAuditDateTime("2026-01-15T10:20:30Z");
    expect(formatted).not.toContain(",");
    expect(formatted).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/);
  });
});

describe("dados estáticos", () => {
  it("AUDIT_ACTION_LABELS cobre as 3 ações", () => {
    expect(Object.keys(AUDIT_ACTION_LABELS)).toEqual(["created", "updated", "toggled"]);
  });
  it("AUDIT_FIELD_LABELS tem os rótulos usados pelo legado", () => {
    expect(AUDIT_FIELD_LABELS.totem_name).toBe("Nome");
    expect(AUDIT_FIELD_LABELS.printer_timeout_ms).toBe("Timeout impressora (ms)");
  });
});
