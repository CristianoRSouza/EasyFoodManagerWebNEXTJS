import type { AgentAuditLog, AgentConfig, AgentConfigFormData } from "../domain/agent-config";

/**
 * Porta de acesso aos agentes de serviço.
 *
 * A UI depende deste contrato, nunca de uma implementação. `ui/use-agent-repository.ts` decide
 * qual implementação usar. Métodos de escrita lançam `ApiError` (mensagem em PT-BR) em caso de
 * falha — quem chama decide como mostrar (toast), igual ao `IssuerRepository#update`.
 */
export interface AgentRepository {
  list(): Promise<AgentConfig[]>;
  create(data: AgentConfigFormData): Promise<void>;
  update(id: string, data: AgentConfigFormData): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<void>;
  auditLogs(agentId: string): Promise<AgentAuditLog[]>;
}
