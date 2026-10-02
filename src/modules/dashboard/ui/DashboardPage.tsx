"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { useToast } from "@/shared/ui/use-toast";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { EMPTY_DASHBOARD_SNAPSHOT } from "../domain/dashboard-snapshot";
import { useDashboardSnapshotQuery } from "./use-dashboard-snapshot-query";
import { DashboardStatCards } from "./DashboardStatCards";
import { ServiceHealthGrid } from "./ServiceHealthGrid";
import { NfceAttentionPanel } from "./NfceAttentionPanel";
import { SyncChartPanel } from "./SyncChartPanel";
import { TransactionsChartPanel } from "./TransactionsChartPanel";
import { RecentSyncErrorsPanel } from "./RecentSyncErrorsPanel";
import { formatDateTime } from "@/shared/format/date-time";

function errorMessageOf(error: unknown): string | null {
  if (!error) return null;
  return error instanceof Error ? error.message : "Erro ao carregar dados do dashboard";
}

/**
 * Porta 1:1 de `easyfoodmanagerWEB/src/pages/Dashboard.tsx` (+ `DashboardCharts.tsx`).
 *
 * Sem `return` antecipado: o layout aparece de imediato com skeletons/zeros enquanto os dados
 * chegam — mesma escolha do legado para não piscar "Carregando…" antes do primeiro paint.
 *
 * Os blocos que dependem de `sync_log`/`sync_heartbeat` (grelha de serviços, gráfico de
 * sincronizações, últimos erros, e o card "Erros Sync (24h)") só existem quando
 * `backend === "lan"` — essas tabelas só existem no PostgreSQL da loja. Na nuvem o repositório
 * nem chega a pedir esses dados (`ApiDashboardRepository`); aqui é só a UI escondendo o que não
 * viria preenchido, mesma decisão que o legado toma com `cloudMode`.
 */
export function DashboardPage() {
  const { backend } = useRuntime();
  const { toast } = useToast();
  const { data, isLoading, isFetching, error, refetch } = useDashboardSnapshotQuery();
  const snapshot = data ?? EMPTY_DASHBOARD_SNAPSHOT;
  const isLanBackend = backend === "lan";
  const errorMessage = errorMessageOf(error);

  const handleRefresh = async () => {
    const result = await refetch();
    if (result.isError) {
      toast({ title: "Falha ao atualizar", description: "Não foi possível recarregar o dashboard.", variant: "destructive" });
    } else {
      toast({ title: "Dados atualizados", description: "Dashboard recarregado com sucesso." });
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <Card className="bg-destructive/10 border-destructive/30 border">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
        <div className="flex items-center gap-3">
          {isLanBackend && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>
                Último sync:{" "}
                {snapshot.stats.lastSuccessSync
                  ? formatDateTime(snapshot.stats.lastSuccessSync.createdAt)
                  : "N/A"}
              </span>
            </div>
          )}
          <PageRefreshButton onClick={handleRefresh} refreshing={isFetching && !isLoading} />
        </div>
      </div>

      {isLanBackend && <ServiceHealthGrid stats={snapshot.stats} />}

      <DashboardStatCards stats={snapshot.stats} showSyncErrors={isLanBackend} loading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NfceAttentionPanel attention={snapshot.nfceAttention} />
        {isLanBackend && <SyncChartPanel data={snapshot.syncByHour} />}
        <TransactionsChartPanel data={snapshot.transactionsByDay} />
      </div>

      {isLanBackend && <RecentSyncErrorsPanel errors={snapshot.recentErrors} />}
    </div>
  );
}
