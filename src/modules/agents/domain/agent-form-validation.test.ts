import { describe, expect, it } from "vitest";
import { createAgentFormDefaults } from "./agent-config";
import {
  agentFormErrorTabs,
  agentNameStatus,
  firstErrorTab,
  validateAgentForm,
  type AgentFormErrors,
} from "./agent-form-validation";
import type { AgentConfigFormData } from "./agent-config";

function form(partial: Partial<AgentConfigFormData> = {}): AgentConfigFormData {
  return { ...createAgentFormDefaults(), agent_name: "NFCe-SRV-MATRIZ", ...partial };
}

describe("validateAgentForm", () => {
  it("aceita um formulário válido, sem erros", () => {
    expect(validateAgentForm(form(), { isEditing: false, existingNames: [] })).toEqual({});
  });

  it("exige nome", () => {
    const errors = validateAgentForm(form({ agent_name: "   " }), { isEditing: false, existingNames: [] });
    expect(errors.agent_name).toBe("Nome é obrigatório");
  });

  it("rejeita nome com caractere fora de letras/números/hífen", () => {
    const errors = validateAgentForm(form({ agent_name: "NFCe SRV" }), { isEditing: false, existingNames: [] });
    expect(errors.agent_name).toMatch(/letras, números e hífen/);
  });

  it("rejeita nome duplicado só ao criar (não ao editar)", () => {
    const existentes = ["NFCe-SRV-MATRIZ"];
    const criando = validateAgentForm(form(), { isEditing: false, existingNames: existentes });
    expect(criando.agent_name).toBe("Já existe um agente com este nome");

    const editando = validateAgentForm(form(), { isEditing: true, existingNames: existentes });
    expect(editando.agent_name).toBeUndefined();
  });

  it("valida os mínimos numéricos", () => {
    const errors = validateAgentForm(
      form({ sefaz_timeout_ms: 999, retry_max_attempts: 0, retry_backoff_ms: -1, api_rate_limit: 0 }),
      { isEditing: false, existingNames: [] },
    );
    expect(errors).toEqual({
      sefaz_timeout_ms: "Mínimo 1000ms",
      retry_max_attempts: "Mínimo 1",
      retry_backoff_ms: "Mínimo 0",
      api_rate_limit: "Mínimo 1",
    });
  });

  it("não valida nada nas abas Contingência/Sync — igual ao legado", () => {
    const errors = validateAgentForm(
      form({ contingency_enabled: true, contingency_reason: null, sync_service_enabled: true, sync_service_url: null }),
      { isEditing: false, existingNames: [] },
    );
    expect(errors).toEqual({});
  });
});

describe("firstErrorTab", () => {
  it("vai para 'geral' quando o nome tem erro", () => {
    expect(firstErrorTab({ agent_name: "Nome é obrigatório" })).toBe("geral");
  });

  it("vai para 'api' para qualquer outro erro", () => {
    expect(firstErrorTab({ api_rate_limit: "Mínimo 1" })).toBe("api");
  });
});

describe("agentNameStatus", () => {
  it("null quando vazio", () => {
    expect(agentNameStatus("", { isEditing: false, existingNames: [] })).toBeNull();
  });

  it("invalid quando foge do padrão", () => {
    expect(agentNameStatus("nome com espaço", { isEditing: false, existingNames: [] })).toBe("invalid");
  });

  it("duplicate ao criar com nome já existente", () => {
    expect(agentNameStatus("X", { isEditing: false, existingNames: ["X"] })).toBe("duplicate");
  });

  it("valid quando editando com o mesmo nome de sempre", () => {
    expect(agentNameStatus("X", { isEditing: true, existingNames: ["X"] })).toBe("valid");
  });
});

describe("agentFormErrorTabs", () => {
  it("marca 'geral' e 'api' de acordo com os campos com erro", () => {
    const errors: AgentFormErrors = { agent_name: "Nome é obrigatório", retry_backoff_ms: "Mínimo 0" };
    expect(agentFormErrorTabs(errors)).toEqual({ geral: true, api: true, contingencia: false, sync: false });
  });

  it("sem erros, nenhuma aba marcada", () => {
    expect(agentFormErrorTabs({})).toEqual({ geral: false, api: false, contingencia: false, sync: false });
  });
});
