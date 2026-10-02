import { describe, expect, it } from "vitest";
import { filterAgentAuditLogs, formatAuditValue } from "./agent-audit";
import type { AgentAuditLog } from "./agent-config";

const NOW = new Date("2026-01-20T12:00:00Z");

function log(partial: Partial<AgentAuditLog>): AgentAuditLog {
  return {
    id: "log-1",
    agent_config_id: "agent-1",
    action: "updated",
    changed_fields: [],
    previous_values: {},
    new_values: {},
    performed_by: "admin@local.dev",
    created_at: "2026-01-20T10:00:00Z",
    ...partial,
  };
}

describe("filterAgentAuditLogs", () => {
  const logs: AgentAuditLog[] = [
    log({ id: "hoje", action: "created", created_at: "2026-01-20T08:00:00Z" }),
    log({ id: "5-dias", action: "updated", created_at: "2026-01-15T08:00:00Z" }),
    log({ id: "20-dias", action: "toggled", created_at: "2026-01-01T08:00:00Z" }),
    log({ id: "60-dias", action: "updated", created_at: "2025-11-20T08:00:00Z" }),
  ];

  it("sem filtro, devolve tudo", () => {
    expect(filterAgentAuditLogs(logs, "all", "all", NOW)).toHaveLength(4);
  });

  it("filtra por ação", () => {
    const result = filterAgentAuditLogs(logs, "updated", "all", NOW);
    expect(result.map((l) => l.id)).toEqual(["5-dias", "60-dias"]);
  });

  it("filtra por período 'hoje'", () => {
    const result = filterAgentAuditLogs(logs, "all", "today", NOW);
    expect(result.map((l) => l.id)).toEqual(["hoje"]);
  });

  it("filtra por período '7d'", () => {
    const result = filterAgentAuditLogs(logs, "all", "7d", NOW);
    expect(result.map((l) => l.id)).toEqual(["hoje", "5-dias"]);
  });

  it("filtra por período '30d'", () => {
    const result = filterAgentAuditLogs(logs, "all", "30d", NOW);
    expect(result.map((l) => l.id)).toEqual(["hoje", "5-dias", "20-dias"]);
  });

  it("combina ação e período", () => {
    const result = filterAgentAuditLogs(logs, "updated", "30d", NOW);
    expect(result.map((l) => l.id)).toEqual(["5-dias"]);
  });
});

describe("formatAuditValue", () => {
  it("valor ausente vira travessão", () => {
    expect(formatAuditValue(null)).toBe("—");
    expect(formatAuditValue(undefined)).toBe("—");
  });

  it("booleano vira Sim/Não", () => {
    expect(formatAuditValue(true)).toBe("Sim");
    expect(formatAuditValue(false)).toBe("Não");
  });

  it("outros valores viram texto", () => {
    expect(formatAuditValue(30000)).toBe("30000");
    expect(formatAuditValue("info")).toBe("info");
  });
});
