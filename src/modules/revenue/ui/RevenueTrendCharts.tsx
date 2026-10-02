"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { cumulativeByDay, rankTopProducts, type ProductRankingBy, type RevenueReport } from "../domain/revenue";
import { CHART_FILL, compactNumber } from "./chart-format";
import { formatBrl } from "@/shared/format/money";

export interface RevenueTrendChartsProps {
  report: RevenueReport;
  productRankingBy: ProductRankingBy;
  setProductRankingBy: (v: ProductRankingBy) => void;
}

/** "Tendência e horários": acumulado, por hora, mês x mês, por totem e top produtos. */
export function RevenueTrendCharts({ report, productRankingBy, setProductRankingBy }: RevenueTrendChartsProps) {
  const cumulative = useMemo(() => cumulativeByDay(report.byDay), [report.byDay]);
  const topProducts = useMemo(() => rankTopProducts(report.byProductTop10, productRankingBy), [report.byProductTop10, productRankingBy]);

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tendência e horários</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="text-base">Receita acumulada</CardTitle>
            <CardDescription>Soma progressiva no período (aprovadas)</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            {cumulative.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sem dados para a linha.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulative} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={compactNumber} />
                  <Tooltip formatter={(value: number) => formatBrl(value)} labelFormatter={(l) => String(l)} />
                  <Legend />
                  <Line type="monotone" dataKey="cumulative" name="Acumulado" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[320px]">
          <CardHeader>
            <CardTitle className="text-base">Receita por hora do dia</CardTitle>
            <CardDescription>Distribuição no relógio (fuso do servidor / BD)</CardDescription>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.byHour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" interval={3} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={compactNumber} />
                <Tooltip formatter={(value: number) => formatBrl(value)} />
                <Legend />
                <Bar dataKey="credit" name="Crédito" stackId="h" fill={CHART_FILL.credit} />
                <Bar dataKey="debit" name="Débito" stackId="h" fill={CHART_FILL.debit} />
                <Bar dataKey="pix" name="PIX" stackId="h" fill={CHART_FILL.pix} />
                <Bar dataKey="voucher" name="Voucher" stackId="h" fill={CHART_FILL.voucher} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-[340px]">
        <CardHeader>
          <CardTitle className="text-base">Comparativo mensal (ano atual x ano anterior)</CardTitle>
          <CardDescription>Mês a mês no período filtrado, comparando com os mesmos meses do ano passado</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          {report.byMonthYoY.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem dados mensais para comparação.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.byMonthYoY} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={compactNumber} />
                <Tooltip formatter={(value: number) => formatBrl(value)} />
                <Legend />
                <Line type="monotone" dataKey="current" name="Ano atual" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name="Ano anterior"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="6 4"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="min-h-[340px]">
        <CardHeader>
          <CardTitle className="text-base">Vendas por totem</CardTitle>
          <CardDescription>Receita aprovada no período por totem (top 12)</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          {report.byTotem.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem dados por totem neste intervalo.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.byTotem} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={compactNumber} />
                <YAxis type="category" dataKey="totem" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => formatBrl(value)}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload as { totem?: string; count?: number } | undefined;
                    const count = row?.count ?? 0;
                    return `${label} · ${count} transação(ões)`;
                  }}
                />
                <Bar dataKey="amount" name="Receita" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="min-h-[340px]">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">Top 10 produtos mais vendidos</CardTitle>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={productRankingBy === "quantity" ? "default" : "secondary"}
                onClick={() => setProductRankingBy("quantity")}
              >
                Quantidade
              </Button>
              <Button
                type="button"
                size="sm"
                variant={productRankingBy === "amount" ? "default" : "secondary"}
                onClick={() => setProductRankingBy("amount")}
              >
                Valor
              </Button>
            </div>
          </div>
          <CardDescription>
            {productRankingBy === "quantity" ? "Ranking por quantidade vendida (valor rateado no tooltip)" : "Ranking por valor rateado das transações aprovadas"}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sem dados de produtos neste intervalo.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  allowDecimals={productRankingBy === "amount"}
                  tickFormatter={(v) => (productRankingBy === "amount" ? compactNumber(v) : String(Math.round(Number(v))))}
                />
                <YAxis type="category" dataKey="product" width={160} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => (productRankingBy === "amount" ? [formatBrl(value), "Valor"] : [Math.round(value), "Qtd"])}
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload as { amount?: number; txCount?: number } | undefined;
                    const amount = row?.amount ?? 0;
                    const txCount = row?.txCount ?? 0;
                    return `${label} · ${formatBrl(amount)} · ${txCount} transação(ões)`;
                  }}
                />
                <Bar
                  dataKey={productRankingBy}
                  name={productRankingBy === "amount" ? "Valor" : "Quantidade"}
                  fill={productRankingBy === "amount" ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))"}
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
