"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { DatePeriodPresetControls } from "@/shared/date-period/DatePeriodPresetControls";
import { computePeriodRange, type PeriodPreset } from "@/shared/date-period/date-period-presets";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { useToast } from "@/shared/ui/use-toast";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { usePlanPeriodGuard } from "@/shared/plan/use-plan-period-guard";
import { PlanWindowNotice } from "@/shared/plan/PlanWindowNotice";
import { Search } from "lucide-react";
import { useOrdersQuery } from "./use-orders-query";
import { useOrderItemsQuery } from "./use-order-items-query";
import { useOrderItemImagesQuery } from "./use-order-item-images-query";
import type { OrderStatusFilter } from "../domain/order";
import {
  filterOrders,
  groupItemsByOrder,
  sumActiveItemsSubtotal,
  uniqueProductIds,
  withProductImages,
} from "../domain/order-rules";
import { OrdersMobileList } from "./OrdersMobileList";
import { OrdersDesktopTable } from "./OrdersDesktopTable";

const WINDOW_THRESHOLD = 200;
const PAGE_SIZE = 100;

export function OrdersPage() {
  const tenant = useRequiredTenant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const initialRange = useMemo(() => computePeriodRange("30d"), []);
  const [periodFilter, setPeriodFilter] = useState<PeriodPreset>("30d");
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast } = useToast();

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

  const rangeOpts = useMemo(() => ({ from: dateFrom || undefined, to: dateTo || undefined }), [dateFrom, dateTo]);

  const ordersQuery = useOrdersQuery(rangeOpts, !outOfWindow);
  const itemsQuery = useOrderItemsQuery(rangeOpts, !outOfWindow);

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const allItems = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const loading = !outOfWindow && ordersQuery.isLoading;
  const refreshing = ordersQuery.isFetching || itemsQuery.isFetching;

  const refresh = async () => {
    // Sem toast aqui: igual ao legado (`Orders.tsx`), que só avisa "Período fora do plano" na
    // TRANSIÇÃO para o estado bloqueado (efeito de `usePlanPeriodGuard`, acima) — clicar em
    // Atualizar enquanto bloqueado não repete o aviso (diferente de NFC-e/Transações, que avisam
    // a cada tentativa; ver `fase-3-integracao-report.md`).
    if (outOfWindow) return;
    // `refetch()`, não `invalidateQueries()`: invalidar nunca lança erro (o TanStack Query v5
    // engole a falha do refetch em segundo plano), então o antigo `catch` nunca rodava e o
    // toast de sucesso aparecia mesmo com a API fora do ar.
    const [ordersResult, itemsResult] = await Promise.all([ordersQuery.refetch(), itemsQuery.refetch()]);
    await queryClient.invalidateQueries({ queryKey: ["order-transactions", tenant.companyId, tenant.storeId] });
    if (ordersResult.isError || itemsResult.isError) {
      toast({ title: "Falha ao atualizar", description: "Não foi possível recarregar as comandas.", variant: "destructive" });
    } else {
      toast({ title: "Dados atualizados", description: "Comandas recarregadas com sucesso." });
    }
  };

  // Indexação O(1): pré-agrupa itens por comanda uma única vez, já em ordem alfabética (legado 1.3.12).
  const productIds = useMemo(() => uniqueProductIds(allItems), [allItems]);
  const productImages = useOrderItemImagesQuery(productIds).data;
  const itemsByOrderId = useMemo(
    () => groupItemsByOrder(withProductImages(allItems, productImages)),
    [allItems, productImages],
  );

  const subtotalByOrderId = useMemo(() => {
    const map = new Map<string, number>();
    for (const [orderId, items] of itemsByOrderId) map.set(orderId, sumActiveItemsSubtotal(items));
    return map;
  }, [itemsByOrderId]);

  const filtered = useMemo(() => filterOrders(orders, { search, status: statusFilter }), [orders, search, statusFilter]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const shouldWindow = filtered.length > WINDOW_THRESHOLD;
  const visibleOrders = useMemo(() => (shouldWindow ? filtered.slice(0, visibleCount) : filtered), [filtered, visibleCount, shouldWindow]);
  const remaining = shouldWindow ? filtered.length - visibleOrders.length : 0;

  // Filtro/busca (ou novos dados) recomeçam a janela: manter a contagem antiga mostraria um
  // "carregar mais" que não corresponde ao que está na tela. Ajuste feito durante a
  // renderização (não em efeito) — é o padrão recomendado para "reagir a uma mudança de props/
  // estado resetando outro estado", e evita o refetch em cascata de um `setState` em `useEffect`.
  const [resetTracker, setResetTracker] = useState({ search, statusFilter, orders });
  if (resetTracker.search !== search || resetTracker.statusFilter !== statusFilter || resetTracker.orders !== orders) {
    setResetTracker({ search, statusFilter, orders });
    setVisibleCount(PAGE_SIZE);
  }

  const getOrderItems = (orderId: string) => itemsByOrderId.get(orderId) ?? [];
  const getSubtotal = (orderId: string) => subtotalByOrderId.get(orderId) ?? 0;
  const toggleExpanded = (orderId: string) => setExpanded((current) => (current === orderId ? null : orderId));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-muted-foreground animate-pulse">Carregando comandas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold font-heading">Comandas</h1>
        <PageRefreshButton onClick={refresh} refreshing={refreshing} />
      </div>

      <div className="flex gap-3 flex-col lg:flex-row lg:flex-wrap lg:items-end">
        <div className="relative flex-1 min-w-0 lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por barcode ou cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="space-y-1 w-full sm:w-auto">
          <label className="text-xs text-muted-foreground block">Situação</label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatusFilter)}>
            <SelectTrigger className="w-full sm:w-[150px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="open">Abertas</SelectItem>
              <SelectItem value="closed">Fechadas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DatePeriodPresetControls
          period={periodFilter}
          onPeriodChange={setPeriodFilter}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          className="w-full lg:w-auto lg:flex-1"
        />
      </div>

      {outOfWindow && (
        <PlanWindowNotice
          planWindow={planWindow}
          blockedMessage="A consulta de comandas foi bloqueada para este intervalo."
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
          <OrdersMobileList
            orders={visibleOrders}
            expanded={expanded}
            onToggle={toggleExpanded}
            getOrderItems={getOrderItems}
            getSubtotal={getSubtotal}
          />
          <OrdersDesktopTable
            orders={visibleOrders}
            expanded={expanded}
            onToggle={toggleExpanded}
            getOrderItems={getOrderItems}
            getSubtotal={getSubtotal}
          />
          {remaining > 0 && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)} className="w-full sm:w-auto">
                Mostrar mais {Math.min(PAGE_SIZE, remaining)} de {remaining} restantes
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
