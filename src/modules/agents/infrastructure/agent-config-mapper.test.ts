import { describe, expect, it } from "vitest";
import { toAgentAuditLog, toAgentConfig } from "./agent-config-mapper";

describe("toAgentConfig", () => {
  it("traduz uma linha completa de nfce_service_agent", () => {
    const row = {
      id: "agent-1",
      agent_name: "NFCe-SRV-MATRIZ",
      is_active: true,
      install_path: "C:/nfce-service",
      api_rate_limit: 100,
      log_level: "info",
      sefaz_timeout_ms: 30000,
      retry_max_attempts: 3,
      retry_backoff_ms: 1000,
      contingency_enabled: false,
      contingency_reason: null,
      contingency_auto_transmit: true,
      contingency_worker_enabled: true,
      contingency_worker_interval_ms: 0,
      contingency_substitution_worker_enabled: true,
      contingency_substitution_worker_interval_ms: 0,
      contingency_substitution_xjust: null,
      contingency_sla_warn_hours: 0,
      contingency_sla_block_hours: 0,
      sync_service_enabled: true,
      sync_service_url: "http://localhost:3000",
      created_at: "2026-01-01T10:00:00Z",
      updated_at: "2026-01-15T08:30:00Z",
    };

    expect(toAgentConfig(row)).toEqual({
      id: "agent-1",
      agent_name: "NFCe-SRV-MATRIZ",
      is_active: true,
      install_path: "C:/nfce-service",
      api_rate_limit: 100,
      log_level: "info",
      sefaz_timeout_ms: 30000,
      retry_max_attempts: 3,
      retry_backoff_ms: 1000,
      contingency_enabled: false,
      contingency_reason: null,
      contingency_auto_transmit: true,
      contingency_worker_enabled: true,
      contingency_worker_interval_ms: 0,
      contingency_substitution_worker_enabled: true,
      contingency_substitution_worker_interval_ms: 0,
      contingency_substitution_xjust: null,
      contingency_sla_warn_hours: 0,
      contingency_sla_block_hours: 0,
      sync_service_enabled: true,
      sync_service_url: "http://localhost:3000",
      created_at: "2026-01-01T10:00:00Z",
      updated_at: "2026-01-15T08:30:00Z",
    });
  });

  it("campos numéricos ausentes viram 0, texto ausente vira null/'info'", () => {
    const agent = toAgentConfig({ id: "agent-2", agent_name: "X" });
    expect(agent.api_rate_limit).toBe(0);
    expect(agent.sefaz_timeout_ms).toBe(0);
    expect(agent.install_path).toBeNull();
    expect(agent.log_level).toBe("info");
    expect(agent.is_active).toBe(false);
  });

  it("aceita numeric/integer do Postgres vindo como texto", () => {
    const agent = toAgentConfig({ id: "agent-3", agent_name: "X", api_rate_limit: "150", sefaz_timeout_ms: "45000" });
    expect(agent.api_rate_limit).toBe(150);
    expect(agent.sefaz_timeout_ms).toBe(45000);
  });
});

describe("toAgentAuditLog", () => {
  it("traduz uma linha de nfce_service_agent_audit", () => {
    const row = {
      id: "audit-1",
      agent_config_id: "agent-1",
      action: "updated",
      changed_fields: ["sefaz_timeout_ms", "is_active"],
      previous_values: { sefaz_timeout_ms: 30000, is_active: true },
      new_values: { sefaz_timeout_ms: 45000, is_active: false },
      performed_by: "admin@local.dev",
      created_at: "2026-01-20T10:00:00Z",
    };

    expect(toAgentAuditLog(row)).toEqual({
      id: "audit-1",
      agent_config_id: "agent-1",
      action: "updated",
      changed_fields: ["sefaz_timeout_ms", "is_active"],
      previous_values: { sefaz_timeout_ms: 30000, is_active: true },
      new_values: { sefaz_timeout_ms: 45000, is_active: false },
      performed_by: "admin@local.dev",
      created_at: "2026-01-20T10:00:00Z",
    });
  });

  it("action desconhecida ou ausente cai em 'updated'; changed_fields ausente vira []", () => {
    const log = toAgentAuditLog({ id: "audit-2", agent_config_id: "agent-1", action: "sabotagem" });
    expect(log.action).toBe("updated");
    expect(log.changed_fields).toEqual([]);
    expect(log.previous_values).toEqual({});
    expect(log.new_values).toEqual({});
    expect(log.performed_by).toBe("admin");
  });
});
