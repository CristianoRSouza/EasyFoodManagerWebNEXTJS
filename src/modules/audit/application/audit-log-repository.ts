import type { UnifiedAuditLog } from "../domain/unified-audit-log";

/**
 * Trilha de auditoria unificada da empresa do tenant amarrado no construtor da implementação.
 * Só existe no modo nuvem e para administrador do sistema — quem chama já garantiu as duas
 * coisas antes de montar o repositório (ver `ui/AuditLogsPage.tsx`).
 */
export interface AuditLogRepository {
  listUnified(): Promise<UnifiedAuditLog[]>;
}
