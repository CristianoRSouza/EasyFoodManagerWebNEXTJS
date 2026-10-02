import type { AgentConfigFormData } from "./agent-config";

/** Igual ao legado (`AgentFormDialog.tsx`): nome do agente vira `NFCE_AGENT_NAME` no `.env`. */
export const AGENT_NAME_REGEX = /^[A-Za-z0-9-]+$/;

export type AgentFormTab = "geral" | "api" | "contingencia" | "sync";

export type AgentFormErrors = Partial<
  Record<
    "agent_name" | "sefaz_timeout_ms" | "retry_max_attempts" | "retry_backoff_ms" | "api_rate_limit",
    string
  >
>;

export interface ValidateAgentFormOptions {
  isEditing: boolean;
  existingNames: string[];
}

/**
 * Porta pura de `AgentFormDialog.tsx#validate` (sem os `setState`/`setActiveTab`, que ficam na
 * UI). O legado não valida os campos de Contingência/Sync — nenhuma mudança de comportamento
 * aqui, só extração.
 */
export function validateAgentForm(
  form: AgentConfigFormData,
  { isEditing, existingNames }: ValidateAgentFormOptions,
): AgentFormErrors {
  const errors: AgentFormErrors = {};

  if (!form.agent_name.trim()) {
    errors.agent_name = "Nome é obrigatório";
  } else if (!AGENT_NAME_REGEX.test(form.agent_name)) {
    errors.agent_name = "Apenas letras, números e hífen. Ex: NFCe-SRV-MATRIZ";
  } else if (!isEditing && existingNames.includes(form.agent_name)) {
    errors.agent_name = "Já existe um agente com este nome";
  }

  if (form.sefaz_timeout_ms < 1000) errors.sefaz_timeout_ms = "Mínimo 1000ms";
  if (form.retry_max_attempts < 1) errors.retry_max_attempts = "Mínimo 1";
  if (form.retry_backoff_ms < 0) errors.retry_backoff_ms = "Mínimo 0";
  if (form.api_rate_limit < 1) errors.api_rate_limit = "Mínimo 1";

  return errors;
}

/** Para qual aba levar o operador quando `validateAgentForm` encontra erro. */
export function firstErrorTab(errors: AgentFormErrors): AgentFormTab {
  return errors.agent_name ? "geral" : "api";
}

export type AgentNameStatus = "invalid" | "duplicate" | "valid" | null;

/** Ícone ao lado do campo "Nome do Agente" enquanto o operador digita. */
export function agentNameStatus(
  agentName: string,
  { isEditing, existingNames }: ValidateAgentFormOptions,
): AgentNameStatus {
  if (!agentName) return null;
  if (!AGENT_NAME_REGEX.test(agentName)) return "invalid";
  if (!isEditing && existingNames.includes(agentName)) return "duplicate";
  return "valid";
}

const API_TAB_FIELDS = new Set(["api_rate_limit", "sefaz_timeout_ms", "retry_max_attempts", "retry_backoff_ms"]);

/** Quais abas mostram o indicador de erro (bolinha vermelha), a partir do mapa de erros. */
export function agentFormErrorTabs(errors: AgentFormErrors): Record<AgentFormTab, boolean> {
  const tabs: Record<AgentFormTab, boolean> = { geral: false, api: false, contingencia: false, sync: false };
  for (const [field, message] of Object.entries(errors)) {
    if (!message) continue;
    if (field === "agent_name") tabs.geral = true;
    else if (API_TAB_FIELDS.has(field)) tabs.api = true;
  }
  return tabs;
}
