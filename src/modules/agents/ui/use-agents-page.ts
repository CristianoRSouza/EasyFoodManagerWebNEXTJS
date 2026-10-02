"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useToast } from "@/shared/ui/use-toast";
import { useAgentRepository } from "./use-agent-repository";
import type { AgentConfig, AgentConfigFormData } from "../domain/agent-config";

/** O legado atualiza sozinho a cada 30s (`AgentConfigPage.tsx#useCompanyQuery`, `refetchInterval: 30000`). */
const REFRESH_INTERVAL_MS = 30_000;

/**
 * Estado e dados da tela de Agentes de Serviço — mesmo comportamento do legado
 * (`pages/AgentConfigPage.tsx`), com `useQuery` no lugar do `useCompanyQuery` manual e os
 * handlers de criar/editar/ativar centralizados aqui (os diálogos, em `AgentFormDialog`/
 * `AgentAuditDialog`, só chamam de volta).
 */
export function useAgentsPage() {
  const tenant = useRequiredTenant();
  const repository = useAgentRepository();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = useMemo(() => ["service-agents", tenant.companyId, tenant.storeId] as const, [tenant]);

  const { data: agents = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: () => repository.list(),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditAgent, setAuditAgent] = useState<AgentConfig | null>(null);

  const openCreate = useCallback(() => {
    setEditingAgent(null);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((agent: AgentConfig) => {
    setEditingAgent(agent);
    setDialogOpen(true);
  }, []);

  const openAudit = useCallback((agent: AgentConfig) => {
    setAuditAgent(agent);
    setAuditOpen(true);
  }, []);

  const handleCreate = useCallback(
    async (data: AgentConfigFormData) => {
      try {
        await repository.create(data);
      } catch (error) {
        toast({
          title: "Erro ao cadastrar",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
        throw error;
      }
      toast({ title: "Agente cadastrado com sucesso" });
      invalidate();
    },
    [repository, toast, invalidate],
  );

  const handleUpdate = useCallback(
    async (data: AgentConfigFormData) => {
      if (!editingAgent) return;
      try {
        await repository.update(editingAgent.id, data);
      } catch (error) {
        toast({
          title: "Erro ao salvar",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
        throw error;
      }
      toast({ title: "Agente atualizado com sucesso" });
      invalidate();
    },
    [editingAgent, repository, toast, invalidate],
  );

  const handleToggle = useCallback(
    async (agent: AgentConfig, newValue: boolean) => {
      try {
        await repository.setActive(agent.id, newValue);
      } catch (error) {
        toast({
          title: "Erro ao alterar status",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
        return;
      }
      toast({ title: `${agent.agent_name} ${newValue ? "ativado" : "desativado"}` });
      invalidate();
    },
    [repository, toast, invalidate],
  );

  const activeCount = agents.filter((agent) => agent.is_active).length;
  const contingencyCount = agents.filter((agent) => agent.contingency_enabled).length;

  return {
    agents,
    isLoading,
    refetch,
    activeCount,
    contingencyCount,
    dialogOpen,
    setDialogOpen,
    editingAgent,
    openCreate,
    openEdit,
    auditOpen,
    setAuditOpen,
    auditAgent,
    openAudit,
    handleCreate,
    handleUpdate,
    handleToggle,
  };
}
