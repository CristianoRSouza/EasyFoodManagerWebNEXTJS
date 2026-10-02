import { describe, expect, it } from "vitest";
import {
  AGENT_CLOUD_EDITABLE_FIELDS, agentCloudBody, agentConfigFormDataWithoutName, agentConfigToFormData, createAgentFormDefaults, formatMs,
} from "./agent-config";
import type { AgentConfig } from "./agent-config";

describe("createAgentFormDefaults", () => {
  it("devolve os mesmos padrões do formulário do legado", () => {
    expect(createAgentFormDefaults()).toEqual({
      agent_name: "",
      is_active: true,
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
      sync_service_url: null,
    });
  });

  it("cada chamada devolve um objeto novo (sem mutação compartilhada)", () => {
    const a = createAgentFormDefaults();
    a.agent_name = "mudou";
    expect(createAgentFormDefaults().agent_name).toBe("");
  });
});

describe("formatMs", () => {
  it("mostra segundos com uma casa decimal a partir de 1000ms", () => {
    expect(formatMs(1000)).toBe("1.0s");
    expect(formatMs(1500)).toBe("1.5s");
    expect(formatMs(30000)).toBe("30.0s");
  });

  it("mostra milissegundos abaixo de 1000ms", () => {
    expect(formatMs(999)).toBe("999ms");
    expect(formatMs(0)).toBe("0ms");
  });
});

const FULL_AGENT: AgentConfig = {
  id: "agent-1",
  agent_name: "NFCe-SRV-MATRIZ",
  is_active: true,
  install_path: "C:/nfce-service",
  api_rate_limit: 100,
  log_level: "info",
  sefaz_timeout_ms: 30000,
  retry_max_attempts: 3,
  retry_backoff_ms: 1000,
  contingency_enabled: true,
  contingency_reason: "SEFAZ fora do ar",
  contingency_auto_transmit: true,
  contingency_worker_enabled: true,
  contingency_worker_interval_ms: 60000,
  contingency_substitution_worker_enabled: true,
  contingency_substitution_worker_interval_ms: 300000,
  contingency_substitution_xjust: "Substituição de contingência",
  contingency_sla_warn_hours: 4,
  contingency_sla_block_hours: 24,
  sync_service_enabled: true,
  sync_service_url: "http://localhost:3000",
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-01-15T08:30:00Z",
};

describe("agentConfigToFormData", () => {
  it("copia todos os campos editáveis e descarta id/created_at/updated_at/install_path", () => {
    const form = agentConfigToFormData(FULL_AGENT);
    expect(form).toEqual({
      agent_name: "NFCe-SRV-MATRIZ",
      is_active: true,
      api_rate_limit: 100,
      log_level: "info",
      sefaz_timeout_ms: 30000,
      retry_max_attempts: 3,
      retry_backoff_ms: 1000,
      contingency_enabled: true,
      contingency_reason: "SEFAZ fora do ar",
      contingency_auto_transmit: true,
      contingency_worker_enabled: true,
      contingency_worker_interval_ms: 60000,
      contingency_substitution_worker_enabled: true,
      contingency_substitution_worker_interval_ms: 300000,
      contingency_substitution_xjust: "Substituição de contingência",
      contingency_sla_warn_hours: 4,
      contingency_sla_block_hours: 24,
      sync_service_enabled: true,
      sync_service_url: "http://localhost:3000",
    });
    expect(form).not.toHaveProperty("id");
    expect(form).not.toHaveProperty("install_path");
  });
});

describe("agentConfigFormDataWithoutName", () => {
  it("mantém todos os campos, exceto agent_name", () => {
    const form = agentConfigToFormData(FULL_AGENT);
    const patch = agentConfigFormDataWithoutName(form);
    expect(patch).not.toHaveProperty("agent_name");
    expect(patch.sefaz_timeout_ms).toBe(30000);
    expect(patch.contingency_reason).toBe("SEFAZ fora do ar");
  });
});

describe("agentCloudBody (legado 1.3.12, corpoAgente — PR #52)", () => {
  const LINHA = {
    id: "ad49c2f6",
    company_id: "6d3622b9",
    store_id: "ad5c0141",
    agent_name: "NFCe-SRV-MATRIZ",
    is_active: true,
    log_level: "info",
    sefaz_timeout_ms: 30000,
    sync_service_url: null,
    created_at: "2026-09-29T12:28:39Z",
    updated_at: "2026-09-30T23:54:24Z",
  };

  it("edição: sem company_id, store_id, id, datas nem nome", () => {
    const corpo = agentCloudBody(LINHA, { withName: false });
    for (const proibido of ["company_id", "store_id", "id", "created_at", "updated_at", "agent_name"]) {
      expect(corpo).not.toHaveProperty(proibido);
    }
    expect(Object.keys(corpo).every((k) => (AGENT_CLOUD_EDITABLE_FIELDS as readonly string[]).includes(k))).toBe(true);
    expect(corpo.sefaz_timeout_ms).toBe(30000);
  });

  it("criação: leva o nome, e nada de tenant", () => {
    const corpo = agentCloudBody(LINHA, { withName: true });
    expect(corpo.agent_name).toBe("NFCe-SRV-MATRIZ");
    expect(corpo).not.toHaveProperty("company_id");
    expect(corpo).not.toHaveProperty("store_id");
  });

  it("campo ausente fica ausente; null é enviado", () => {
    expect(agentCloudBody({ log_level: "debug" }, { withName: false })).toEqual({ log_level: "debug" });
    expect(agentCloudBody({ sync_service_url: null }, { withName: false })).toEqual({ sync_service_url: null });
  });
});
