"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { pieChartRows, type ProductRankingBy, type RevenueReport } from "../domain/revenue";
import { RevenueTrendCharts } from "./RevenueTrendCharts";
import { CHART_FILL, compactNumber } from "./chart-format";
import { formatBrl } from "@/shared/format/money";

/** Fallback dos gráficos, exibido enquanto o chunk do recharts carrega. */
export function RevenueChartsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="min-h-[320px]">
          <CardHeader>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[240px] w-full rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export interface RevenueChartsProps {
  report: RevenueReport;
  productRankingBy: ProductRankingBy;
  setProductRankingBy: (v: ProductRankingBy) => void;
}

/** Os seis gráficos de Receitas (recharts) — igual ao `ReceitasCharts.tsx` do legado. */
export function RevenueCharts({ report, productRankingBy, setProductRankingBy }: RevenueChartsProps) {
  const pieRows = useMemo(() => pieChartRows(report), [report]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[360px]">
          <CardHeader>
            <CardTitle className="text-base">Receita por dia</CardTitle>
            <CardDescription>
              {report.period.from} — {report.period.to}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {report.byDay.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sem transações aprovadas neste intervalo.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={compactNumber} />
                  <Tooltip
                    formatter={(value: number) => formatBrl(value)}
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload as { day?: string } | undefined;
                      return p?.day ?? "";
                    }}
                  />
                  <Legend />
                  <Bar dataKey="credit" name="Crédito" stackId="r" fill={CHART_FILL.credit} />
                  <Bar dataKey="debit" name="Débito" stackId="r" fill={CHART_FILL.debit} />
                  <Bar dataKey="pix" name="PIX" stackId="r" fill={CHART_FILL.pix} />
                  <Bar dataKey="voucher" name="Voucher" stackId="r" fill={CHART_FILL.voucher} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[360px]">
          <CardHeader>
            <CardTitle className="text-base">Distribuição por forma de pagamento</CardTitle>
            <CardDescription>Valores absolutos (aprovadas)</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-center justify-center">
            {report.total.amount <= 0 ? (
              <p className="text-muted-foreground text-sm">Sem valores para mostrar no gráfico.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieRows}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={96}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieRows.map((entry) => (
                      <Cell key={entry.key} fill={CHART_FILL[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatBrl(value)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <RevenueTrendCharts report={report} productRankingBy={productRankingBy} setProductRankingBy={setProductRankingBy} />
    </>
  );
}
