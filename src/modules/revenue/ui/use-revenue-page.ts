"use client";

import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { keepOnlyFirstPage } from "@/shared/http/keep-only-first-page";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { useToast } from "@/shared/ui/use-toast";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { usePlanHistoryWindow } from "@/shared/plan/use-plan-history-window";
import { minAllowedYmd } from "@/shared/plan/plan-window";
import { useExternalAccess } from "@/shared/layout/external-access";
import { fmtPtBrFromYmd } from "@/shared/date-period/date-period-presets";
import { useRevenueRepository } from "./use-revenue-repository";
import {
  isOutOfWindow,
  isPresetAllowed,
  type DatePreset,
  type ProductRankingBy,
  type RevenueReport,
} from "../domain/revenue";
import { approvedCsvFileName, toApprovedCsv } from "../domain/revenue-csv";

const RECENT_PAGE_SIZE = 50;

/**
 * Estado e ações da tela de Receitas — igual ao `ReceitasPage.tsx` do legado, só que a
 * paginação infinita de `recentApproved` vive no cache do TanStack Query (`useInfiniteQuery`)
 * em vez de um `useState` acumulado à mão.
 */
export function useRevenuePage() {
  const { toast } = useToast();
  const tenant = useRequiredTenant();
  const repository = useRevenueRepository();
  const queryClient = useQueryClient();
  const { data: planWindow } = usePlanHistoryWindow();
  const { openBilling, billingLoading } = useExternalAccess();
  const historyWindowDays = planWindow?.historyWindowDays ?? null;

  const minAllowed = useMemo(() => minAllowedYmd(historyWindowDays), [historyWindowDays]);
  const minAllowedLabel = useMemo(() => (minAllowed ? fmtPtBrFromYmd(minAllowed) : null), [minAllowed]);

  const [from, setFrom] = useState(() => format(subDays(new Date(), 29), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>("30d");
  const [productRankingBy, setProductRankingBy] = useState<ProductRankingBy>("quantity");

  const outOfWindow = isOutOfWindow(minAllowed, from, to);

  const queryKey = useMemo(
    () => ["revenue-report", tenant.companyId, tenant.storeId, from, to] as const,
    [tenant.companyId, tenant.storeId, from, to],
  );

  const query = useInfiniteQuery({
    queryKey,
    enabled: !outOfWindow,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => repository.report({ from, to, recentOffset: pageParam, recentLimit: RECENT_PAGE_SIZE }),
    getNextPageParam: (lastPage) =>
      lastPage.recentApprovedMeta.hasMore ? lastPage.recentApprovedMeta.offset + lastPage.recentApprovedMeta.limit : undefined,
  });

  const pages = useMemo(() => query.data?.pages ?? [], [query.data]);
  const report: RevenueReport | null = pages.length > 0 ? pages[pages.length - 1]! : null;
  const recentRows = useMemo(() => pages.flatMap((p) => p.recentApproved), [pages]);
  const recentHasMore = report?.recentApprovedMeta.hasMore ?? false;

  const { refetch } = query;
  /**
   * "Silencioso" como no legado (`loadFirstPage({ silent: true })`): só a 1ª página volta.
   *
   * Fora da janela do plano, nem chama a API — como `loadFirstPage` do legado
   * (`ReceitasPage.tsx`) — e avisa com o mesmo toast "Período fora do plano" que Comandas e
   * Transações usam. Sem esta guarda, `refetch()` ignora `enabled: !outOfWindow` (o TanStack
   * Query sempre executa um `refetch()` explícito, mesmo com a query desabilitada) e a tela
   * mostrava "Atualizado" para uma consulta que a API deveria bloquear.
   */
  const refresh = useCallback(async () => {
    if (outOfWindow) {
      toast({
        title: "Período fora do plano",
        description: `O seu plano permite consultar a partir de ${minAllowedLabel ?? ""}.`,
        variant: "destructive",
      });
      return;
    }
    keepOnlyFirstPage(queryClient, queryKey);
    const result = await refetch();
    if (result.isError) {
      const msg = result.error instanceof Error ? result.error.message : "Erro ao carregar receitas";
      toast({ title: "Falha", description: msg, variant: "destructive" });
    } else {
      toast({ title: "Atualizado", description: "Receitas recarregadas." });
    }
  }, [outOfWindow, minAllowedLabel, queryClient, queryKey, refetch, toast]);

  const loadMoreRecent = useCallback(() => {
    if (query.isFetchingNextPage || query.isLoading || query.isRefetching || !recentHasMore) return;
    void query.fetchNextPage();
  }, [query, recentHasMore]);

  const applyPreset = useCallback((kind: Exclude<DatePreset, null>) => {
    const n = new Date();
    setSelectedPreset(kind);
    if (kind === "today") {
      const today = format(n, "yyyy-MM-dd");
      setFrom(today);
      setTo(today);
      return;
    }
    if (kind === "7d") {
      setFrom(format(subDays(n, 6), "yyyy-MM-dd"));
      setTo(format(n, "yyyy-MM-dd"));
      return;
    }
    if (kind === "30d") {
      setFrom(format(subDays(n, 29), "yyyy-MM-dd"));
      setTo(format(n, "yyyy-MM-dd"));
      return;
    }
    setFrom(format(startOfMonth(n), "yyyy-MM-dd"));
    setTo(format(endOfMonth(n), "yyyy-MM-dd"));
  }, []);

  const handleFromSelect = useCallback((d?: Date) => {
    if (!d) return;
    const nextFrom = format(d, "yyyy-MM-dd");
    setSelectedPreset(null);
    setFrom(nextFrom);
    setTo((prevTo) => (nextFrom > prevTo ? nextFrom : prevTo));
  }, []);

  const handleToSelect = useCallback((d?: Date) => {
    if (!d) return;
    const nextTo = format(d, "yyyy-MM-dd");
    setSelectedPreset(null);
    setTo(nextTo);
    setFrom((prevFrom) => (nextTo < prevFrom ? nextTo : prevFrom));
  }, []);

  const jumpToMinAllowed = useCallback(() => {
    if (!minAllowed) return;
    setFrom(minAllowed);
    setTo((prevTo) => (prevTo < minAllowed ? format(new Date(), "yyyy-MM-dd") : prevTo));
    setSelectedPreset(null);
  }, [minAllowed]);

  const exportCsv = useCallback(() => {
    if (outOfWindow) {
      toast({
        title: "Período fora do plano",
        description: `Ajuste o intervalo para a partir de ${minAllowedLabel ?? ""} ou faça upgrade do plano.`,
        variant: "destructive",
      });
      return;
    }
    if (!recentRows.length) {
      toast({ title: "Nada para exportar", description: "Não há linhas no período.", variant: "destructive" });
      return;
    }
    const blob = new Blob([toApprovedCsv(recentRows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = approvedCsvFileName(from, to);
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: "CSV gerado", description: "Download iniciado." });
  }, [outOfWindow, recentRows, from, to, toast, minAllowedLabel]);

  const error = query.isError ? (query.error instanceof Error ? query.error.message : "Erro ao carregar receitas") : null;

  return {
    from,
    to,
    selectedPreset,
    productRankingBy,
    setProductRankingBy,
    historyWindowDays,
    planWindow: planWindow ?? null,
    minAllowedYmd: minAllowed,
    minAllowedLabel,
    outOfWindow,
    report,
    recentRows,
    recentHasMore,
    loading: query.isLoading,
    refreshing: query.isRefetching,
    loadingMoreRecent: query.isFetchingNextPage,
    error,
    refresh,
    loadMoreRecent,
    applyPreset,
    handleFromSelect,
    handleToSelect,
    jumpToMinAllowed,
    exportCsv,
    isPresetAllowed: (kind: Exclude<DatePreset, null>) => isPresetAllowed(kind, historyWindowDays),
    openBilling,
    billingLoading,
  };
}

export type RevenuePageState = ReturnType<typeof useRevenuePage>;
