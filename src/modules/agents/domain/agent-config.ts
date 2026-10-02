/**
 * Agente de serviço — o `nfce-service` que roda na loja emitindo NFC-e e falando com a SEFAZ.
 *
 * Tipos em `snake_case`, não `camelCase` + mapper: a tela (`ui/AgentsPage.tsx`,
 * `ui/AgentFormDialog.tsx` etc.) é cópia fiel do JSX do legado
 * (`easyfoodmanagerWEB/src/pages/AgentConfigPage.tsx`, `components/agent/*`), que referencia estes
 * mesmos nomes de campo (`a.agent_name`, `form.sefaz_timeout_ms`, …). Um mapper para camelCase
 * seria uma tradução sem necessidade e afastaria os componentes do "cópia fiel" pedido pela regra
 * de paridade da Fase 4. (O `pixnopdv`, com só 9 campos, passou a camelCase + mapper na integração
 * da Fase 4; aqui são ~20 campos espalhados por 4 abas de formulário copiadas do legado — ver
 * `fase-4-integracao-report.md`.) A resposta HTTP ainda passa por `agent-config-mapper.ts`
 * (validação de tipo, não tradução de vocabulário).
 */
export interface AgentConfig {
  id: string;
  agent_name: string;
  is_active: boolean;

  /** Legado: coluna na PG; não editável no admin (gestão do serviço fora desta app). */
  install_path: string | null;

  // API / Log
  api_rate_limit: number;
  log_level: string;

  // SEFAZ / Retry
  sefaz_timeout_ms: number;
  retry_max_attempts: number;
  retry_backoff_ms: number;

  // Contingência
  contingency_enabled: boolean;
  contingency_reason: string | null;
  contingency_auto_transmit: boolean;
  contingency_worker_enabled: boolean;
  contingency_worker_interval_ms: number;
  contingency_substitution_worker_enabled: boolean;
  contingency_substitution_worker_interval_ms: number;
  contingency_substitution_xjust: string | null;
  contingency_sla_warn_hours: number;
  contingency_sla_block_hours: number;

  // Sync
  sync_service_enabled: boolean;
  sync_service_url: string | null;

  // Auditoria
  created_at: string;
  updated_at: string;
}

export type AgentConfigFormData = Omit<AgentConfig, "id" | "created_at" | "updated_at" | "install_path">;

/** Uma alteração registrada na trilha de auditoria de um agente. */
export interface AgentAuditLog {
  id: string;
  agent_config_id: string;
  action: "created" | "updated" | "toggled";
  changed_fields: string[];
  previous_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  performed_by: string;
  created_at: string;
}

/** Igual ao legado (`AgentFormDialog.tsx#createAgentFormDefaults`): valores de um agente novo. */
export function createAgentFormDefaults(): AgentConfigFormData {
  return {
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
  };
}

/**
 * Campos que a EasyFood API aceita na escrita de agente — espelho de `CAMPOS_EDITAVEIS_AGENTE` do
 * legado 1.3.12 (`cloud-api-data.ts`, PR #52), que por sua vez espelha `camposEditaveis` em
 * EasyFoodAPI/src/contract/agent-write.schema.ts. O schema é `.strict()`: UM campo a mais e a
 * requisição inteira volta 400 — no legado a linha da listagem (`company_id`/`store_id`) vazava
 * para o PATCH e "salvar não fazia nada". Por isso o corpo da nuvem é montado por LISTA BRANCA.
 */
export const AGENT_CLOUD_EDITABLE_FIELDS = [
  "is_active",
  "install_path",
  "api_rate_limit",
  "log_level",
  "sefaz_timeout_ms",
  "retry_max_attempts",
  "retry_backoff_ms",
  "contingency_enabled",
  "contingency_reason",
  "contingency_auto_transmit",
  "contingency_worker_enabled",
  "contingency_worker_interval_ms",
  "contingency_substitution_worker_enabled",
  "contingency_substitution_worker_interval_ms",
  "contingency_substitution_xjust",
  "contingency_sla_warn_hours",
  "contingency_sla_block_hours",
  "sync_service_enabled",
  "sync_service_url",
] as const;

/**
 * Corpo da escrita de agente na nuvem (`corpoAgente` do legado): só os campos aceitos; `undefined`
 * fica de fora (ausente = não mexe) e `null` vai (limpar um campo é edição válida). Na criação o
 * nome entra; na edição não (chave única — o serviço da loja se reconhece por ele).
 */
export function agentCloudBody(data: Record<string, unknown>, { withName }: { withName: boolean }): Record<string, unknown> {
  const keys: readonly string[] = withName ? ["agent_name", ...AGENT_CLOUD_EDITABLE_FIELDS] : AGENT_CLOUD_EDITABLE_FIELDS;
  const body: Record<string, unknown> = {};
  for (const k of keys) if (data[k] !== undefined) body[k] = data[k];
  return body;
}

/** `1000ms` → `"1.0s"`; abaixo de 1s mostra em ms. Igual ao legado (usado no card e no formulário). */
export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

/**
 * O que o formulário de edição carrega a partir de um agente existente — igual ao legado
 * (`AgentFormDialog.tsx`, `useEffect`: `const { id, created_at, updated_at, install_path: _ip,
 * ...rest } = agent;`). Construído campo a campo (em vez de desestruturar e descartar) para não
 * deixar variável não usada — mesma convenção de `modules/issuer/domain/issuer-edit-draft.ts
 * #draftFromConfig`.
 */
export function agentConfigToFormData(agent: AgentConfig): AgentConfigFormData {
  return {
    agent_name: agent.agent_name,
    is_active: agent.is_active,
    api_rate_limit: agent.api_rate_limit,
    log_level: agent.log_level,
    sefaz_timeout_ms: agent.sefaz_timeout_ms,
    retry_max_attempts: agent.retry_max_attempts,
    retry_backoff_ms: agent.retry_backoff_ms,
    contingency_enabled: agent.contingency_enabled,
    contingency_reason: agent.contingency_reason,
    contingency_auto_transmit: agent.contingency_auto_transmit,
    contingency_worker_enabled: agent.contingency_worker_enabled,
    contingency_worker_interval_ms: agent.contingency_worker_interval_ms,
    contingency_substitution_worker_enabled: agent.contingency_substitution_worker_enabled,
    contingency_substitution_worker_interval_ms: agent.contingency_substitution_worker_interval_ms,
    contingency_substitution_xjust: agent.contingency_substitution_xjust,
    contingency_sla_warn_hours: agent.contingency_sla_warn_hours,
    contingency_sla_block_hours: agent.contingency_sla_block_hours,
    sync_service_enabled: agent.sync_service_enabled,
    sync_service_url: agent.sync_service_url,
  };
}

/**
 * O corpo do `PATCH /v1/service-agents/:id` — os mesmos campos de `AgentConfigFormData` sem
 * `agent_name` (chave de identificação, nunca editável; nem o Admin API nem a Cloud API aceitam
 * renomear um agente já criado).
 */
export function agentConfigFormDataWithoutName(
  data: AgentConfigFormData,
): Omit<AgentConfigFormData, "agent_name"> {
  return {
    is_active: data.is_active,
    api_rate_limit: data.api_rate_limit,
    log_level: data.log_level,
    sefaz_timeout_ms: data.sefaz_timeout_ms,
    retry_max_attempts: data.retry_max_attempts,
    retry_backoff_ms: data.retry_backoff_ms,
    contingency_enabled: data.contingency_enabled,
    contingency_reason: data.contingency_reason,
    contingency_auto_transmit: data.contingency_auto_transmit,
    contingency_worker_enabled: data.contingency_worker_enabled,
    contingency_worker_interval_ms: data.contingency_worker_interval_ms,
    contingency_substitution_worker_enabled: data.contingency_substitution_worker_enabled,
    contingency_substitution_worker_interval_ms: data.contingency_substitution_worker_interval_ms,
    contingency_substitution_xjust: data.contingency_substitution_xjust,
    contingency_sla_warn_hours: data.contingency_sla_warn_hours,
    contingency_sla_block_hours: data.contingency_sla_block_hours,
    sync_service_enabled: data.sync_service_enabled,
    sync_service_url: data.sync_service_url,
  };
}
