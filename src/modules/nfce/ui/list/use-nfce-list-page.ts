"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { keepOnlyFirstPage } from "@/shared/http/keep-only-first-page";
import { useToast } from "@/shared/ui/use-toast";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { usePlanPeriodGuard } from "@/shared/plan/use-plan-period-guard";
import { computePeriodRange, type PeriodPreset } from "@/shared/date-period/date-period-presets";
import { useNfceRepository } from "../use-nfce-repository";
import { parseNfceListUrlFilters } from "./nfce-list-url-filters";
import type { NfceListQuery } from "../../domain/nfce-note";

/** Mesmo tamanho de página do legado (`pages/NfcePage.tsx`). */
const LIMIT = 50;

/**
 * Estado e dados da tela de lista de NFC-e: filtros (com carga inicial pela URL — invariante 3),
 * rolagem infinita da listagem, totais/contagens de atenção do período, e as ações de
 * atualizar/baixar XML/reprocessar. Espelha `use-products-page.ts` (mesmo padrão da Fase 2),
 * trocando a janela de página local por `page`/`limit` (é como a `easyfoodmanagerAPI` pagina
 * `/nfce/notes`, diferente do `from`/`to` de produtos).
 */
export function useNfceListPage() {
  const tenant = useRequiredTenant();
  const repository = useNfceRepository();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Carga única na montagem: os links do Dashboard (`?status=manual_review`, `?status=all&
  // reconcileStatus=failed`, `?status=unusable`) só importam no primeiro render desta tela.
  const [initialUrlFilters] = useState(() => parseNfceListUrlFilters(searchParams));
  const [statusFilter, setStatusFilter] = useState(initialUrlFilters.status);
  const [reconcileFilter, setReconcileFilter] = useState(initialUrlFilters.reconcileStatus);

  // Default: últimos 30 dias, para não varrer o histórico inteiro da loja de cara.
  const initialRange = useMemo(() => computePeriodRange("30d"), []);
  const [periodFilter, setPeriodFilter] = useState<PeriodPreset>("30d");
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [exportingXml, setExportingXml] = useState(false);

  const { planWindow, minAllowed, minAllowedLabel, outOfWindow, openBilling, billingLoading, handleAdjustToMinAllowed } =
    usePlanPeriodGuard({
      period: periodFilter,
      dateFrom,
      dateTo,
      setPeriod: setPeriodFilter,
      setDateFrom,
      setDateTo,
    });

  const filters: NfceListQuery = useMemo(
    () => ({
      status: statusFilter,
      reconcileStatus: reconcileFilter || undefined,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      search: search || undefined,
    }),
    [statusFilter, reconcileFilter, dateFrom, dateTo, search],
  );

  const listQueryKey = useMemo(
    () => ["nfce-notes", tenant.companyId, tenant.storeId, filters] as const,
    [tenant.companyId, tenant.storeId, filters],
  );

  const listQuery = useInfiniteQuery({
    queryKey: listQueryKey,
    queryFn: ({ pageParam }) => repository.list({ ...filters, page: pageParam, limit: LIMIT }),
    initialPageParam: 1,
    // O total da API é uma contagem exata (`COUNT(DISTINCT ...)`), então "ainda falta" é só
    // comparar o que já carregamos com ele — sem heurística de página cheia.
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.data.length, 0);
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled: !outOfWindow,
  });

  /**
   * Totais do período (cards do topo) — SEMPRE do banco, nunca somados das linhas já carregadas.
   * Ver aviso em `NfceSummaryCards`.
   */
  const totalsQuery = useQuery({
    queryKey: ["nfce-totals", tenant.companyId, tenant.storeId, filters],
    queryFn: () => repository.totals(filters),
    enabled: !outOfWindow,
  });

  const attentionQuery = useQuery({
    queryKey: ["nfce-attention-counts", tenant.companyId, tenant.storeId],
    queryFn: () => repository.attentionCounts(),
    enabled: !outOfWindow,
  });

  // Falha na 1ª carga (ou numa página seguinte): mesmo toast do legado, TanStack Query v5 não
  // tem mais `onError` em `useQuery`/`useInfiniteQuery`.
  useEffect(() => {
    if (!listQuery.isLoadingError) return;
    const message = listQuery.error instanceof Error ? listQuery.error.message : undefined;
    toast({ title: "Erro", description: message || "Falha ao carregar NFC-e", variant: "destructive" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à transição para erro, não a `toast` (identidade instável)
  }, [listQuery.isLoadingError, listQuery.error]);

  const data = useMemo(() => listQuery.data?.pages.flatMap((page) => page.data) ?? [], [listQuery.data]);
  const total = listQuery.data?.pages.at(-1)?.total ?? 0;
  const totals = totalsQuery.data ?? null;
  const attentionCounts = attentionQuery.data ?? { manualReview: 0, reconcileFailed: 0, unusable: 0 };

  const loading = !outOfWindow && listQuery.isPending;
  const loadingMore = listQuery.isFetchingNextPage;
  const refreshing = listQuery.isRefetching || totalsQuery.isRefetching || attentionQuery.isRefetching;
  const hasMore = !outOfWindow && (listQuery.hasNextPage ?? false);

  const loadNextPage = useCallback(() => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    void listQuery.fetchNextPage();
  }, [loading, loadingMore, refreshing, hasMore, listQuery]);

  /** Busca só ao clicar "Buscar"/Enter — nunca a cada tecla (mesmo comportamento do legado). */
  const handleSearch = useCallback(() => setSearch(searchInput.trim()), [searchInput]);

  /** Preset não-custom recalcula o intervalo na hora; "Período" mantém o que já estava selecionado. */
  const handlePeriodChange = useCallback((value: PeriodPreset) => {
    setPeriodFilter(value);
    if (value !== "custom") {
      const range = computePeriodRange(value);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, []);

  const handleClear = useCallback(() => {
    setStatusFilter("all");
    setReconcileFilter("");
    setPeriodFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchInput("");
    setSearch("");
  }, []);

  const handleRefresh = useCallback(async () => {
    if (outOfWindow) {
      // Igual ao legado (`NfcePage.tsx`, `loadData({ silent: true })`): avisa a CADA tentativa
      // de atualização enquanto bloqueado, não só na transição (diferente de Comandas — ver
      // `OrdersPage.tsx` — que só avisa uma vez; `usePlanPeriodGuard` já cobre a transição).
      if (minAllowedLabel) {
        toast({
          title: "Período fora do plano",
          description: `O seu plano permite consultar a partir de ${minAllowedLabel}.`,
          variant: "destructive",
        });
      }
      return;
    }
    keepOnlyFirstPage(queryClient, listQueryKey);
    const [listResult, totalsResult, attentionResult] = await Promise.all([
      listQuery.refetch(),
      totalsQuery.refetch(),
      attentionQuery.refetch(),
    ]);
    if (listResult.isError || totalsResult.isError || attentionResult.isError) {
      toast({ title: "Erro", description: "Falha ao carregar NFC-e", variant: "destructive" });
    } else {
      toast({ title: "Dados atualizados", description: "NFC-e recarregadas com sucesso." });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `listQuery`/`totalsQuery`/`attentionQuery` mudam de identidade a cada render
  }, [outOfWindow, minAllowedLabel, queryClient, listQueryKey, toast]);

  const handleReprocess = useCallback(
    async (noteId: string) => {
      try {
        setReprocessingId(noteId);
        const result = await repository.reprocess(noteId);
        if (!result.ok) {
          toast({
            title: "Não foi possível reprocessar",
            description: result.error || "A nota não está elegível para reprocessamento.",
            variant: "destructive",
          });
          return;
        }
        toast({ title: "Reprocessamento solicitado", description: result.message || "A nota foi recolocada na fila." });
        keepOnlyFirstPage(queryClient, listQueryKey);
        // Igual ao legado (`NfcePage.tsx#loadData(1, { append: false })`): refaz lista + totais +
        // attention-counts, não só a lista — senão os cards do topo e o banner de "pendentes de
        // correção" ficam com números velhos até o próximo "Atualizar" (Importante 2 da revisão).
        await Promise.all([listQuery.refetch(), totalsQuery.refetch(), attentionQuery.refetch()]);
      } catch (error) {
        toast({
          title: "Erro no reprocessamento",
          description: error instanceof Error ? error.message : "Falha ao solicitar reprocessamento da NFC-e.",
          variant: "destructive",
        });
      } finally {
        setReprocessingId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `listQuery`/`totalsQuery`/`attentionQuery` mudam de identidade a cada render
    [repository, toast, queryClient, listQueryKey],
  );

  /**
   * Baixa os XML de TODAS as notas do filtro (não só as já roladas na tela) — ver aviso em
   * `application/nfce-repository.ts#downloadXmlArchive`.
   */
  const handleDownloadXml = useCallback(async () => {
    if (outOfWindow) {
      toast({
        title: "Período fora do plano",
        description: `Ajuste o intervalo para a partir de ${minAllowedLabel ?? ""} ou faça upgrade do plano.`,
        variant: "destructive",
      });
      return;
    }
    if (!loading && total === 0 && data.length === 0) {
      toast({ title: "Nada para exportar", description: "Nenhuma NFC-e casa com os filtros atuais.", variant: "destructive" });
      return;
    }
    try {
      setExportingXml(true);
      toast({
        title: "Preparando o download",
        description: "Buscando os XML no banco. Períodos grandes podem levar alguns minutos.",
      });
      const { blob, filename, stats } = await repository.downloadXmlArchive(filters);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({
        title: "Download iniciado",
        description: stats
          ? `${stats.files} arquivo(s) XML de ${stats.notes} nota(s) em ${filename}.`
          : `Arquivo ${filename}. O _RESUMO.txt dentro do .zip lista o que foi exportado.`,
      });
    } catch (error) {
      toast({
        title: "Falha ao baixar os XML",
        description: error instanceof Error ? error.message : "Não foi possível gerar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setExportingXml(false);
    }
  }, [outOfWindow, minAllowedLabel, loading, total, data.length, repository, filters, toast]);

  return {
    data,
    total,
    totals,
    attentionCounts,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    loadNextPage,
    reprocessingId,
    exportingXml,
    statusFilter,
    setStatusFilter,
    periodFilter,
    handlePeriodChange,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchInput,
    setSearchInput,
    handleSearch,
    handleClear,
    handleRefresh,
    handleReprocess,
    handleDownloadXml,
    outOfWindow,
    planWindow,
    minAllowed,
    minAllowedLabel,
    openBilling,
    billingLoading,
    handleAdjustToMinAllowed,
  };
}
