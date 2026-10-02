"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileArchive, FileText, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { PlanWindowNotice } from "@/shared/plan/PlanWindowNotice";
import { NfceSummaryCards } from "../NfceSummaryCards";
import { NfceListFilters } from "./NfceListFilters";
import { NfceMobileList } from "./NfceMobileList";
import { NfceDesktopTable } from "./NfceDesktopTable";
import { useNfceListPage } from "./use-nfce-list-page";

export function NfceListPage() {
  const router = useRouter();
  const {
    data,
    total,
    totals,
    attentionCounts,
    loading,
    loadingMore,
    hasMore,
    loadNextPage,
    refreshing,
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
  } = useNfceListPage();

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const onOpenDetail = (noteId: string) => router.push(`/nfce/${noteId}`);

  useEffect(() => {
    if (!loadMoreRef.current) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadNextPage();
      },
      { root: null, rootMargin: "600px 0px", threshold: 0 },
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loadNextPage]);

  const manualReviewCount = attentionCounts.manualReview;
  const unusableCount = attentionCounts.unusable;
  const reconcileFailedCount = attentionCounts.reconcileFailed;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-foreground truncate">Consulta NFC-e</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {total} {total === 1 ? "nota encontrada" : "notas encontradas"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-9" onClick={handleDownloadXml} disabled={exportingXml || outOfWindow}>
                  {exportingXml ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <FileArchive className="mr-1.5 h-4 w-4" aria-hidden />
                  )}
                  <span className="hidden sm:inline">{exportingXml ? "Gerando .zip..." : "Baixar XML (.zip)"}</span>
                  <span className="sm:hidden">XML</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                Baixa em um .zip os XML de <strong>todas</strong> as notas que casam com os filtros — buscados no banco, não apenas as
                linhas já carregadas na tela.
              </TooltipContent>
            </Tooltip>
            <PageRefreshButton onClick={handleRefresh} refreshing={refreshing} />
          </div>
        </div>

        <NfceSummaryCards totals={totals} dateFrom={dateFrom} dateTo={dateTo} />

        {(manualReviewCount > 0 || reconcileFailedCount > 0 || unusableCount > 0) && (
          <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-sm">
                  {unusableCount > 0 && `${unusableCount} NFC-e em contingência pendente de transmissão. `}
                  {manualReviewCount > 0 && `${manualReviewCount} NFC-e pendente(s) de correção manual. `}
                  {reconcileFailedCount > 0 && `${reconcileFailedCount} NFC-e com falha de reconciliação.`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <NfceListFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          periodFilter={periodFilter}
          onPeriodFilterChange={handlePeriodChange}
          dateFrom={dateFrom}
          onDateFromChange={setDateFrom}
          dateTo={dateTo}
          onDateToChange={setDateTo}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearch={handleSearch}
          onClear={handleClear}
        />

        {outOfWindow && (
          <PlanWindowNotice
            planWindow={planWindow}
            blockedMessage="A consulta de NFC-e foi bloqueada para este intervalo."
            adjustHint="Ajuste o período (data início) para uma data igual ou posterior."
            minAllowedYmd={minAllowed}
            minAllowedLabel={minAllowedLabel}
            onAdjust={handleAdjustToMinAllowed}
            onOpenBilling={() => void openBilling()}
            billingLoading={billingLoading}
          />
        )}

        {!outOfWindow && (
          <Card className="shadow-sm border overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-1 p-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                  ))}
                </div>
              ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                  <div className="rounded-full bg-muted/50 p-4">
                    <FileText className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-medium">Nenhuma NFC-e encontrada</p>
                  <p className="text-xs">Tente ajustar os filtros de busca</p>
                </div>
              ) : (
                <>
                  <NfceMobileList notes={data} reprocessingId={reprocessingId} onReprocess={handleReprocess} onOpenDetail={onOpenDetail} />
                  <NfceDesktopTable notes={data} reprocessingId={reprocessingId} onReprocess={handleReprocess} onOpenDetail={onOpenDetail} />

                  <div className="flex flex-col items-center gap-2 border-t bg-muted/20 px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{data.length}</span> de{" "}
                      {hasMore ? `~${total}` : data.length} notas carregadas
                    </span>
                    {loadingMore && <span className="text-xs text-muted-foreground">Carregando mais notas...</span>}
                    {!hasMore && data.length > 0 && <span className="text-xs text-muted-foreground">Fim da lista</span>}
                    <div ref={loadMoreRef} className="h-2 w-full" aria-hidden />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
