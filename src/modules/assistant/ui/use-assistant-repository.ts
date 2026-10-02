"use client";

import { useMemo } from "react";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { AssistantRepository } from "../application/assistant-repository";
import { ApiAssistantRepository } from "../infrastructure/api-assistant-repository";

/** O repositório do assistente, amarrado à loja selecionada. */
export function useAssistantRepository(): AssistantRepository {
  const tenant = useRequiredTenant();
  return useMemo(() => new ApiAssistantRepository(tenant), [tenant]);
}
