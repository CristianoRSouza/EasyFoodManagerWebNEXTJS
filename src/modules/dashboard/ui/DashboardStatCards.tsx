"use client";

import { Package, ClipboardList, CreditCard, AlertTriangle, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import type { DashboardStats } from "../domain/dashboard-snapshot";

interface StatCardDef {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

interface DashboardStatCardsProps {
  stats: DashboardStats;
  /** "Erros Sync (24h)" depende de `sync_log`, que só existe na loja. */
  showSyncErrors: boolean;
  loading: boolean;
}

export function DashboardStatCards({ stats, showSyncErrors, loading }: DashboardStatCardsProps) {
  const cards: StatCardDef[] = [
    { title: "Produtos Ativos", value: stats.activeProducts, icon: Package, color: "text-primary" },
    { title: "Comandas Abertas", value: stats.openOrders, icon: ClipboardList, color: "text-info" },
    { title: "Transações Hoje", value: stats.todayTransactions, icon: CreditCard, color: "text-success" },
    ...(showSyncErrors
      ? [{ title: "Erros Sync (24h)", value: stats.recentErrors, icon: AlertTriangle, color: "text-destructive" }]
      : []),
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-5 w-5 ${card.color}`} />
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-9 w-20" /> : <div className="text-3xl font-bold font-heading">{card.value}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
