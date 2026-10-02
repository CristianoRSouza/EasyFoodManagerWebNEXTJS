"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { METHOD_LABEL, PAYMENT_METHODS, type RevenueReport } from "../domain/revenue";
import { CHART_FILL } from "./chart-format";
import { formatBrl } from "@/shared/format/money";

/** Skeletons dos KPIs e indicadores, exibidos enquanto a primeira página carrega. */
export function SummaryCardsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32 mt-2" />
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24 mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface SummaryCardsProps {
  report: RevenueReport;
}

/** KPIs (total + método) e indicadores derivados — igual ao `ReceitasPage.tsx` do legado. */
export function SummaryCards({ report }: SummaryCardsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total no período</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{formatBrl(report.total.amount)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground pt-0">{report.total.count} transação(ões) aprovada(s)</CardContent>
        </Card>
        {PAYMENT_METHODS.map((k) => (
          <Card key={k}>
            <CardHeader className="pb-2">
              <CardDescription>{METHOD_LABEL[k]}</CardDescription>
              <CardTitle className="text-xl tabular-nums" style={{ color: CHART_FILL[k] }}>
                {formatBrl(report.byMethod[k].amount)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground pt-0">{report.byMethod[k].count} venda(s)</CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Indicadores</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Ticket médio</CardDescription>
              <CardTitle className="text-lg tabular-nums">{formatBrl(report.kpis.averageTicket)}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground pt-0">Por transação aprovada (cartão, PIX e voucher)</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Participação crédito</CardDescription>
              <CardTitle className="text-lg tabular-nums text-[hsl(var(--chart-1))]">{report.kpis.shareCredit.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground pt-0">Da receita do período</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Participação débito</CardDescription>
              <CardTitle className="text-lg tabular-nums text-[hsl(var(--chart-2))]">{report.kpis.shareDebit.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground pt-0">Da receita do período</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Participação PIX</CardDescription>
              <CardTitle className="text-lg tabular-nums text-[hsl(var(--chart-4))]">{report.kpis.sharePix.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground pt-0">Da receita do período</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Participação voucher</CardDescription>
              <CardTitle className="text-lg tabular-nums text-[hsl(var(--chart-3))]">{report.kpis.shareVoucher.toFixed(1)}%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground pt-0">Vale refeição + alimentação</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>NFC-e emitidas</CardDescription>
              <CardTitle className="text-lg tabular-nums">{report.kpis.nfceIssuedCount}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground pt-0">Vinculadas a transações do filtro</CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
