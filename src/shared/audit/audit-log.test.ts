import { filterAuditLogsByActionAndPeriod, formatAuditValue } from "./audit-log";

const NOW = new Date("2026-01-20T12:00:00");
const logs = [
  { id: "a", action: "created", created_at: "2026-01-20T08:00:00" },
  { id: "b", action: "updated", created_at: "2026-01-15T08:00:00" },
  { id: "c", action: "toggled", created_at: "2025-12-01T08:00:00" },
];

describe("filterAuditLogsByActionAndPeriod", () => {
  it("sem filtro devolve tudo", () => {
    expect(filterAuditLogsByActionAndPeriod(logs, "all", "all", NOW)).toHaveLength(3);
  });
  it("filtra por ação e por período (início do dia de now − N)", () => {
    expect(filterAuditLogsByActionAndPeriod(logs, "updated", "all", NOW).map((l) => l.id)).toEqual(["b"]);
    expect(filterAuditLogsByActionAndPeriod(logs, "all", "today", NOW).map((l) => l.id)).toEqual(["a"]);
    expect(filterAuditLogsByActionAndPeriod(logs, "all", "7d", NOW).map((l) => l.id)).toEqual(["a", "b"]);
    expect(filterAuditLogsByActionAndPeriod(logs, "all", "30d", NOW).map((l) => l.id)).toEqual(["a", "b"]);
  });
});

describe("formatAuditValue", () => {
  it("segue o formatValue do legado", () => {
    expect(formatAuditValue(null)).toBe("—");
    expect(formatAuditValue(true)).toBe("Sim");
    expect(formatAuditValue(false)).toBe("Não");
    expect(formatAuditValue(3)).toBe("3");
  });
});
