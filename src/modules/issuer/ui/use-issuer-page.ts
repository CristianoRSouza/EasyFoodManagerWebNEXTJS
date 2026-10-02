"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useToast } from "@/shared/ui/use-toast";
import { useIssuerRepository } from "./use-issuer-repository";
import { buildIssuerUpdatePayload, draftFromConfig, type IssuerEditDraft } from "../domain/issuer-edit-draft";
import type { NfceIssuerConfig } from "../domain/nfce-issuer-config";

/**
 * Estado e dados da tela do Emitente NFC-e — mesmo comportamento do legado
 * (`pages/NfceIssuerConfigPage.tsx#loadData`/`startEditing`/`handleSave`), com `useQuery` no lugar
 * do `useState`/`useEffect` manual.
 *
 * Igual ao legado: uma falha na carga inicial não vira uma tela de erro própria — cai no mesmo
 * card "Nenhuma configuração de emitente encontrada." do estado vazio (o legado só loga no
 * console e segue com `configs = []`). Só o refresh (silencioso) e o salvamento mostram toast de
 * falha.
 *
 * `canEdit` substitui o `isElectron()` do legado: lá, só o Electron desktop podia gravar
 * diretamente; aqui, é o backend "lan" (a mesma easyfoodmanagerAPI, pelo mesmo
 * `PATCH /v1/nfce/issuer-config/:id`) — a nuvem ainda não tem essa gravação confirmada (ver
 * relatório).
 */
export function useIssuerPage() {
  const tenant = useRequiredTenant();
  const { backend } = useRuntime();
  const repository = useIssuerRepository();
  const { toast } = useToast();

  const queryKey = useMemo(() => ["nfce-issuer-config", tenant.companyId, tenant.storeId] as const, [tenant]);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const [configs, acbrConfigs] = await Promise.all([repository.list(), repository.acbrConfig()]);
      return { configs, acbrConfigs };
    },
  });

  const { refetch } = query;
  const handleRefresh = useCallback(async () => {
    const result = await refetch();
    if (result.isError) {
      toast({ title: "Falha ao atualizar", variant: "destructive" });
    } else {
      toast({ title: "Dados atualizados", description: "Cadastro do emitente recarregado." });
    }
  }, [refetch, toast]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<IssuerEditDraft>({});
  const [saving, setSaving] = useState(false);

  const startEditing = useCallback((config: NfceIssuerConfig) => {
    setEditingId(config.id);
    setDraft(draftFromConfig(config));
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setDraft({});
  }, []);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const payload = buildIssuerUpdatePayload(draft);
      await repository.update(editingId, payload);
      toast({ title: "Salvo com sucesso", description: "Configuração do emitente atualizada." });
      setEditingId(null);
      setDraft({});
      await refetch();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Falha ao salvar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [editingId, draft, repository, toast, refetch]);

  return {
    configs: query.data?.configs ?? [],
    acbrConfigs: query.data?.acbrConfigs ?? [],
    loading: query.isPending,
    refreshing: query.isRefetching,
    cloudMode: backend === "cloud",
    canEdit: backend === "lan",
    handleRefresh,
    editingId,
    draft,
    saving,
    startEditing,
    cancelEditing,
    handleFieldChange,
    handleSave,
  };
}
