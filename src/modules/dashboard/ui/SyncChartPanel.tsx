"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import type { SyncHourBucket } from "../domain/dashboard-snapshot";
import { DashboardCharts } from "./DashboardCharts";

/** "Sincronizações (24h)" — só existe na loja (`backend === "lan"`); ver `DashboardPage.tsx`. */
export function SyncChartPanel({ data }: { data: SyncHourBucket[] }) {
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-base">Sincronizações (24h)</CardTitle>
      </CardHeader>
      <CardContent>
        <DashboardCharts variant="sync" data={data} />
      </CardContent>
    </Card>
  );
}
