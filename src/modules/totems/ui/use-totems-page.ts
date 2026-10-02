"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useToast } from "@/shared/ui/use-toast";
import { toast as sonnerToast } from "@/shared/ui/primitives/sonner";
import { buildLicenseLabelMap } from "@/shared/license/license-labels";
import { useTotemRepository } from "./use-totem-repository";
import {
  filterFreeLicenses,
  filterSelectableLicensesForPage,
  isEditingPaidLicense,
  resolveTotemLicensePolicy,
} from "../domain/totem-license-policy";
import { VOUCHER_NOT_PERSISTED_TOAST, voucherChangeNotPersisted } from "../domain/totem-form";
import type { TotemConfig, TotemConfigFormData } from "../domain/totem-config";
import { ApiError } from "@/shared/http/api-error";
import type { TotemSeriesSaveOptions } from "../application/totem-repository";

/**
 * Estado e dados da tela de Totens — porta de `LEGACY/src/pages/TotemConfigPage.tsx`.
 *
 * `licensePoolMode` do legado (`cloudMode || localPgMode`) é sempre `true` no Next (ver
 * `domain/totem-license-policy.ts`) — os dois backends cobrem o "ou" do legado, então o pool de
 * licenças nunca é desligado aqui.
 *
 * A faixa "Dados de demonstração" (mock de navegador) do legado foi removida por decisão da Fase
 * 2 ("Regras que valem para todos" — ramos mock não migram).
 */
export function useTotemsPage() {
  const tenant = useRequiredTenant();
  const { backend } = useRuntime();
  const repository = useTotemRepository();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTotem, setEditingTotem] = useState<TotemConfig | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditTotem, setAuditTotem] = useState<TotemConfig | null>(null);
  const [reactivateTotem, setReactivateTotem] = useState<TotemConfig | null>(null);

  const policy = resolveTotemLicensePolicy(backend);

  const totemsKey = useMemo(() => ["totems", tenant.companyId, tenant.storeId] as const, [tenant]);
  const totemsQuery = useQuery({
    queryKey: totemsKey,
    queryFn: () => repository.list(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });
  const totems = useMemo(() => totemsQuery.data ?? [], [totemsQuery.data]);

  const licensesKey = useMemo(
    () => ["totem-available-licenses", editingTotem?.id ?? "new", backend, tenant.companyId, tenant.storeId] as const,
    [editingTotem?.id, backend, tenant],
  );
  const licensesQuery = useQuery({
    queryKey: licensesKey,
    queryFn: () => repository.availableLicenses(editingTotem?.id ?? null),
    staleTime: 30_000,
  });
  const allLicenses = useMemo(() => licensesQuery.data ?? [], [licensesQuery.data]);

  const labelingKey = useMemo(() => ["totem-licenses-for-labeling", tenant.companyId, tenant.storeId] as const, [tenant]);
  const labelingQuery = useQuery({
    queryKey: labelingKey,
    queryFn: () => repository.licensesForLabeling(),
    staleTime: 30_000,
  });

  const seriesKey = useMemo(() => ["totem-series-status", tenant.companyId, tenant.storeId] as const, [tenant]);
  const seriesQuery = useQuery({
    queryKey: seriesKey,
    queryFn: () => repository.seriesStatus(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const selectableLicenses = useMemo(
    () => filterSelectableLicensesForPage(allLicenses, policy.localPgOnly),
    [allLicenses, policy.localPgOnly],
  );
  const freeLicenses = useMemo(() => filterFreeLicenses(selectableLicenses), [selectableLicenses]);
  const licenseLabelMap = useMemo(() => buildLicenseLabelMap(labelingQuery.data ?? []), [labelingQuery.data]);
  const editingPaidLicense = isEditingPaidLicense(editingTotem);
  const activeCount = totems.filter((t) => t.is_active).length;

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: totemsKey });
    queryClient.invalidateQueries({ queryKey: labelingKey });
    queryClient.invalidateQueries({ queryKey: seriesKey });
    queryClient.invalidateQueries({ queryKey: ["totem-available-licenses"] });
  }, [queryClient, totemsKey, labelingKey, seriesKey]);

  const errorMessage = (e: unknown): string =>
    e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro desconhecido";

  const handleCreate = useCallback(
    async (data: TotemConfigFormData, licenseId?: string | null, opts?: TotemSeriesSaveOptions) => {
      try {
        const result = await repository.create(data, licenseId, opts);
        // Fallback igual ao legado (`TotemConfigPage.tsx#handleCreate`): só no LAN, e só quando o
        // servidor não devolveu `sync_hint` próprio.
        const fallbackDescription = policy.localPgOnly
          ? "Enfileirado na outbox local. Inicie o EasyCommandPay-Sync-PG-SB-Service se não estiver rodando; depois vincule a licença no portal web (mesmo UUID)."
          : undefined;
        toast({
          title: "Totem cadastrado com sucesso",
          description: result.syncHint ?? fallbackDescription,
          variant: policy.localPgOnly && result.syncHint?.includes("não está ativo") ? "destructive" : undefined,
        });
        invalidate();
      } catch (e) {
        const message = errorMessage(e);
        toast({ title: "Erro ao cadastrar", description: message, variant: "destructive" });
        throw e;
      }
    },
    [repository, toast, invalidate, policy.localPgOnly],
  );

  const handleUpdate = useCallback(
    async (data: TotemConfigFormData, licenseId?: string | null, opts?: TotemSeriesSaveOptions) => {
      if (!editingTotem) return;
      try {
        await repository.update(editingTotem.id, data, licenseId, opts);
        toast({ title: "Totem atualizado com sucesso" });
        // Desvio deliberado do legado (ver `VOUCHER_NOT_PERSISTED_TOAST`). Vai pelo Sonner porque o
        // Toaster do shadcn mostra um toast por vez e apagaria o sucesso acima.
        if (voucherChangeNotPersisted(editingTotem, data)) {
          sonnerToast.warning(VOUCHER_NOT_PERSISTED_TOAST.title, { description: VOUCHER_NOT_PERSISTED_TOAST.description });
        }
        invalidate();
      } catch (e) {
        const message = errorMessage(e);
        toast({ title: "Erro ao salvar", description: message, variant: "destructive" });
        throw e;
      }
    },
    [editingTotem, repository, toast, invalidate],
  );

  const handleToggle = useCallback(
    async (id: string, totemName: string, newValue: boolean, licenseId?: string | null): Promise<boolean> => {
      if (newValue && !licenseId) {
        const totem = totems.find((x) => x.id === id) ?? null;
        if (totem) {
          await licensesQuery.refetch();
          setReactivateTotem(totem);
        }
        return false;
      }
      try {
        await repository.setActive(id, newValue, licenseId ?? null);
        toast({
          title: `${totemName} ${newValue ? "ativado" : "desativado"}`,
          description: newValue ? undefined : "Licença liberada para uso em outro totem.",
        });
        invalidate();
        return true;
      } catch (e) {
        toast({ title: "Erro ao alterar status", description: errorMessage(e), variant: "destructive" });
        invalidate();
        return false;
      }
    },
    [totems, licensesQuery, repository, toast, invalidate],
  );

  const handleReactivateConfirm = useCallback(
    async (licenseId: string): Promise<boolean> => {
      if (!reactivateTotem) return false;
      const ok = await handleToggle(reactivateTotem.id, reactivateTotem.totem_name, true, licenseId);
      if (ok) setReactivateTotem(null);
      return ok;
    },
    [reactivateTotem, handleToggle],
  );

  /** Dono da série NFC-e antes de salvar (legado 1.3.13, PR #56) — só LAN; `null` na nuvem. */
  const lookupSeriesOwner = useCallback(
    (serie: number, environment: number, totemId: string | null) => repository.seriesOwner(serie, environment, totemId),
    [repository],
  );

  const handleRequeueSync = useCallback(
    async (totem: TotemConfig) => {
      try {
        const r = await repository.requeueSync(totem.id);
        // Textos por backend, igual ao legado (`TotemConfigPage.tsx#handleRequeueSync`): no LAN é
        // a outbox local PG→nuvem (`requeueLocalTotemSyncToCloud`); na nuvem é a reentrega
        // nuvem→PG local (`reenfileirarTotemApi`) — direções opostas, textos diferentes.
        if (policy.cloudMode) {
          toast({
            title: `${totem.totem_name} reenfileirado`,
            description: `Totem + ${r.licensesRequeued} licença(s) na outbox. O sync vai reentregar ao PG local.`,
          });
        } else {
          // Legado: Sync PG-SB parado (recomendação ou heartbeat) vira aviso destrutivo.
          const needsSync =
            r.syncDiagnostics?.recommendation === "start_sync_service" || !r.syncDiagnostics?.syncServiceLikelyRunning;
          toast({
            title: needsSync ? `${totem.totem_name}: inicie o Sync PG-SB` : `${totem.totem_name} na outbox (PG → nuvem)`,
            description: (r.outboxInserted ? "" : "Já havia evento recente na fila. ") + r.syncHint,
            variant: needsSync ? "destructive" : undefined,
          });
        }
        invalidate();
      } catch (e) {
        toast({ title: "Falha ao reenfileirar", description: errorMessage(e), variant: "destructive" });
      }
    },
    [repository, toast, invalidate, policy.cloudMode],
  );

  const openEdit = useCallback((totem: TotemConfig) => {
    setEditingTotem(totem);
    setDialogOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    setEditingTotem(null);
    setDialogOpen(true);
  }, []);

  const openAudit = useCallback((totem: TotemConfig) => {
    setAuditTotem(totem);
    setAuditOpen(true);
  }, []);

  return {
    backend,
    totems,
    isLoading: totemsQuery.isPending,
    refetch: totemsQuery.refetch,
    activeCount,

    dialogOpen,
    setDialogOpen,
    editingTotem,
    auditOpen,
    setAuditOpen,
    auditTotem,
    reactivateTotem,
    setReactivateTotem,

    policy,
    selectableLicenses,
    freeLicenses,
    editingPaidLicense,
    licenseLabelMap,
    totemSeriesStatuses: seriesQuery.data ?? [],

    openEdit,
    openCreate,
    openAudit,
    handleCreate,
    handleUpdate,
    handleToggle,
    handleReactivateConfirm,
    handleRequeueSync,
    lookupSeriesOwner,
  };
}
