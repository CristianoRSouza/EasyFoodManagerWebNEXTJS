"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useRuntime } from "@/shared/runtime/runtime-context";
import type { AgentRepository } from "../application/agent-repository";
import { ApiAgentRepository } from "../infrastructure/api-agent-repository";

/** O repositório de agentes de serviço, amarrado à loja selecionada. */
export function useAgentRepository(): AgentRepository {
  const tenant = useRequiredTenant();
  const { backend } = useRuntime();
  return useMemo(() => new ApiAgentRepository(tenant, backend), [tenant, backend]);
}
