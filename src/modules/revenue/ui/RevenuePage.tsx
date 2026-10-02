"use client";

import { TrendingUp } from "lucide-react";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { PlanWindowNotice } from "@/shared/plan/PlanWindowNotice";
import { useRevenuePage } from "./use-revenue-page";
import { PeriodCard } from "./PeriodCard";
import { SummaryCards, SummaryCardsSkeleton } from "./SummaryCards";
import { RevenueCharts } from "./RevenueCharts";
import { RecentTransactionsCard } from "./RecentTransactionsCard";

/** Tela Receitas — igual ao `ReceitasPage.tsx` do legado, sobre a API (não mais Supabase/mock). */
export function RevenuePage() {
  const screen = useRevenuePage();

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" aria-hidden />
            Receitas
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Soma das transações <strong className="text-foreground font-medium">aprovadas</strong>, por{" "}
            <strong className="text-foreground font-medium">crédito</strong>,{" "}
            <strong className="text-foreground font-medium">débito</strong>,{" "}
            <strong className="text-foreground font-medium">PIX</strong> e{" "}
            <strong className="text-foreground font-medium">voucher</strong>. Pagamentos em dinheiro não entram neste resumo.
          </p>
        </div>
        <PageRefreshButton refreshing={screen.refreshing || screen.loading} onClick={() => void screen.refresh()} />
      </div>

      <PeriodCard screen={screen} />

      {screen.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{screen.error}</div>
      )}

      {screen.outOfWindow ? (
        <PlanWindowNotice
          planWindow={screen.planWindow}
          blockedMessage="A consulta e a exportação foram bloqueadas para este intervalo."
          adjustHint={
            <>
              Ajuste o campo <strong>De</strong> para uma data igual ou posterior.
            </>
          }
          minAllowedYmd={screen.minAllowedYmd}
          minAllowedLabel={screen.minAllowedLabel}
          onAdjust={screen.jumpToMinAllowed}
          onOpenBilling={() => void screen.openBilling()}
          billingLoading={screen.billingLoading}
        />
      ) : screen.loading && !screen.report ? (
        <SummaryCardsSkeleton />
      ) : screen.report ? (
        <>
          <SummaryCards report={screen.report} />
          <RevenueCharts report={screen.report} productRankingBy={screen.productRankingBy} setProductRankingBy={screen.setProductRankingBy} />
          <RecentTransactionsCard screen={screen} />
        </>
      ) : null}
    </div>
  );
}
