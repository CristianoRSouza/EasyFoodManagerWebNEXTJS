"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import type { TransactionDayBucket } from "../domain/dashboard-snapshot";
import { DashboardCharts } from "./DashboardCharts";

export function TransactionsChartPanel({ data }: { data: TransactionDayBucket[] }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-base">Transações (7 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <DashboardCharts variant="transactions" data={data} />
      </CardContent>
    </Card>
  );
}
