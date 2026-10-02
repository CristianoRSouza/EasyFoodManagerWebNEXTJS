"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { TooltipProvider } from "@/shared/ui/primitives/tooltip";
import { useToast } from "@/shared/ui/use-toast";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { usePlanPeriodGuard } from "@/shared/plan/use-plan-period-guard";
import { PlanWindowNotice } from "@/shared/plan/PlanWindowNotice";
import { computePeriodRange, type PeriodPreset } from "@/shared/date-period/date-period-presets";
import {
  computeApprovedTotals,
  filterTransactions,
  type Transaction,
  type TransactionMethodFilter,
  type TransactionStatusFilter,
} from "../domain/transaction";
import { useTransactionRepository } from "./use-transaction-repository";
import { useInfiniteReveal } from "./use-infinite-reveal";
import { TransactionSummaryCards } from "./TransactionSummaryCards";
import { TransactionFilters } from "./TransactionFilters";
import { TransactionMobileList } from "./TransactionMobileList";
import { TransactionTable } from "./TransactionTable";
import { TransactionDetailDialog } from "./TransactionDetailDialog";

const EMPTY_BARCODES = new Map<string, string>();

export function TransactionsPage() {
  const tenant = useRequiredTenant();
  const { toast } = useToast();
  const initialRange = useMemo(() => computePeriodRange("30d"), []);
  const [periodFilter, setPeriodFilter] = useState<PeriodPreset>("30d");
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [methodFilter, setMethodFilter] = useState<TransactionMethodFilter>("all");
  const [statusFilter, setStatusFilter] = useState<TransactionStatusFilter>("all");
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);

  const {
    planWindow,
    minAllowed,
    minAllowedLabel,
    outOfWindow,
    openBilling,
    billingLoading,
    handleAdjustToMinAllowed,
  } = usePlanPeriodGuard({
    period: periodFilter,
    dateFrom,
    dateTo,
    setPeriod: setPeriodFilter,
    setDateFrom,
    setDateTo,
  });

  const range = useMemo(() => ({ from: dateFrom || undefined, to: dateTo || undefined }), [dateFrom, dateTo]);
  const repository = useTransactionRepository();

  const transactionsQuery = useQuery({
    queryKey: ["transactions", tenant.companyId, tenant.storeId, range.from, range.to],
    queryFn: () => repository.list(range),
    enabled: !outOfWindow,
  });

  const orderBarcodesQuery = useQuery({
    queryKey: ["transactions-order-barcodes", tenant.companyId, tenant.storeId, range.from, range.to],
    queryFn: () => repository.orderBarcodes(range),
    enabled: !outOfWindow,
    staleTime: 60_000,
  });

  const transactions = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);
  const orderBarcodeById = orderBarcodesQuery.data ?? EMPTY_BARCODES;

  const filtered = useMemo(
    () => filterTransactions(transactions, { method: methodFilter, status: statusFilter }),
    [transactions, methodFilter, statusFilter],
  );
  const totals = useMemo(() => computeApprovedTotals(transactions), [transactions]);
  const { visibleRows, hasMore, sentinelRef } = useInfiniteReveal(
    filtered,
    `${methodFilter}|${statusFilter}|${dateFrom}|${dateTo}`,
  );

  const handleRefresh = async () => {
    if (outOfWindow) {
      if (minAllowedLabel) {
        toast({
          title: "Período fora do plano",
          description: `O seu plano permite consultar a partir de ${minAllowedLabel}.`,
          variant: "destructive",
        });
      }
      return;
    }
    // Como o legado (`loadData(true)`): recarrega a lista de transações; o mapa de comandas segue
    // o próprio `staleTime`.
    const result = await transactionsQuery.refetch();
    if (result.isError) {
      toast({
        title: "Falha ao atualizar",
        description: "Não foi possível recarregar as transações.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Dados atualizados", description: "Transações atualizadas." });
    }
  };

  if (transactionsQuery.isLoading && !outOfWindow) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-muted-foreground animate-pulse">Carregando transações...</span>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold font-heading">Transações</h1>
          <PageRefreshButton onClick={handleRefresh} />
        </div>

        <TransactionSummaryCards totals={totals} />

        <TransactionFilters
          methodFilter={methodFilter}
          onMethodFilterChange={setMethodFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          period={periodFilter}
          onPeriodChange={setPeriodFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />

        {outOfWindow && (
          <PlanWindowNotice
            planWindow={planWindow}
            blockedMessage="A consulta de transações foi bloqueada para este intervalo."
            adjustHint="Ajuste o período (data início) para uma data igual ou posterior."
            minAllowedYmd={minAllowed}
            minAllowedLabel={minAllowedLabel}
            onAdjust={handleAdjustToMinAllowed}
            onOpenBilling={() => void openBilling()}
            billingLoading={billingLoading}
          />
        )}

        {!outOfWindow && (
          <>
            <TransactionMobileList
              rows={visibleRows}
              orderBarcodeById={orderBarcodeById}
              onOpenDetail={setDetailTransaction}
            />
            <TransactionTable
              rows={visibleRows}
              orderBarcodeById={orderBarcodeById}
              onOpenDetail={setDetailTransaction}
            />

            {filtered.length > 0 && (
              <div ref={sentinelRef} className="flex justify-center py-4 text-xs text-muted-foreground">
                {hasMore ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Carregando mais ({visibleRows.length} de {filtered.length})…
                  </span>
                ) : (
                  <span>
                    {filtered.length} {filtered.length === 1 ? "transação" : "transações"} · fim da lista
                  </span>
                )}
              </div>
            )}
          </>
        )}

        <TransactionDetailDialog
          transaction={detailTransaction}
          onOpenChange={(open) => !open && setDetailTransaction(null)}
        />
      </div>
    </TooltipProvider>
  );
}
