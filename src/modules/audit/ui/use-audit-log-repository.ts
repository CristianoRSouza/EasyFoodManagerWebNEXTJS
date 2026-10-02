"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { AuditLogRepository } from "../application/audit-log-repository";
import { ApiAuditLogRepository } from "../infrastructure/api-audit-log-repository";

/**
 * O repositório de auditoria, amarrado à empresa/loja selecionada. Só é chamado no modo nuvem por
 * administrador do sistema — `AuditLogsPage` mostra os estado "acesso restrito"
 * antes de montar qualquer coisa que dependa dele.
 */
export function useAuditLogRepository(): AuditLogRepository {
  const tenant = useRequiredTenant();
  return useMemo(
    () => new ApiAuditLogRepository({ companyId: tenant.companyId, storeId: tenant.storeId }),
    [tenant.companyId, tenant.storeId],
  );
}
