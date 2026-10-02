"use client";

import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Badge } from "@/shared/ui/primitives/badge";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import type { Order } from "../domain/order";
import type { OrderItem } from "../domain/order-item";
import {
  getFirebirdLinkStatus,
  getOrderTefCancelInfo,
  totemItemsPendingSync,
} from "../domain/order-rules";
import { OrderItemImage } from "./OrderItemImage";
import { OrderTransactionsPanel } from "./OrderTransactionsPanel";
import { Money } from "@/shared/ui/Money";
import { formatDateTime } from "@/shared/format/date-time";
import { formatQuantity } from "@/shared/format/quantity";

interface OrdersMobileListProps {
  orders: Order[];
  expanded: string | null;
  onToggle: (orderId: string) => void;
  getOrderItems: (orderId: string) => OrderItem[];
  getSubtotal: (orderId: string) => number;
}

/** Mobile: cards expansíveis (lista densa otimizada para toque). */
export function OrdersMobileList({ orders, expanded, onToggle, getOrderItems, getSubtotal }: OrdersMobileListProps) {
  return (
    <div className="md:hidden space-y-2">
      {orders.length === 0 && (
        <Card className="glass-panel">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma comanda encontrada.</CardContent>
        </Card>
      )}
      {orders.map((o) => {
        const isExpanded = expanded === o.id;
        const items = getOrderItems(o.id);
        const firebirdLinkStatus = getFirebirdLinkStatus(o, items);
        const itemsBlockClose = o.syncClosePending && totemItemsPendingSync(items);
        const tefCancelFbSaleInfo = getOrderTefCancelInfo(o);
        return (
          <Card
            key={o.id}
            className={`glass-panel overflow-hidden transition-colors ${
              tefCancelFbSaleInfo
                ? "border-l-4 border-l-amber-500 bg-amber-500/5"
                : isExpanded
                  ? "border-l-4 border-l-primary"
                  : "border-l-4 border-l-transparent"
            }`}
          >
            <button type="button" className="w-full text-left p-3 active:bg-muted/40" onClick={() => onToggle(o.id)}>
              <div className="flex items-start gap-2">
                <div className="mt-0.5 shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-mono text-sm font-semibold truncate ${isExpanded ? "text-primary" : ""}`}>{o.barcode}</p>
                    <span className="font-mono text-sm font-semibold shrink-0"><Money value={getSubtotal(o.id)} /></span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="truncate">{o.customerName || <span className="italic">Sem cliente</span>}</span>
                    {o.tableName && (
                      <>
                        <span>·</span>
                        <span>Mesa {o.tableName}</span>
                      </>
                    )}
                    {o.totemName && (
                      <>
                        <span>·</span>
                        <span className="truncate">{o.totemName}</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={o.status} />
                    <StatusBadge status={firebirdLinkStatus} />
                    {tefCancelFbSaleInfo ? <StatusBadge status="tef_cancel_fb_sale_closed" /> : null}
                    {itemsBlockClose ? <StatusBadge status="items_pending_fb" /> : null}
                    {o.syncClosePending ? (
                      <StatusBadge status="sync_pending" />
                    ) : o.syncClosedToFbAt ? (
                      <StatusBadge status="sync_sent" />
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(o.createdAt)}</p>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-primary/20 bg-primary/5 p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-0.5 col-span-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">ID da comanda</p>
                    <p className="font-mono text-[11px] break-all">{o.id}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Venda FB</p>
                    <p className="font-mono">{o.fbSaleId ?? "—"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Caixa FB</p>
                    <p className="font-mono">{o.fbCashRegisterId ?? "—"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Solicitado em</p>
                    <p>{formatDateTime(o.syncCloseRequestedAt)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Fechado FB</p>
                    <p>{formatDateTime(o.syncClosedToFbAt)}</p>
                  </div>
                  <div className="space-y-0.5 col-span-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Itens vinculados FB</p>
                    <p className="font-mono">
                      {items.filter((i) => i.fbId !== null).length} / {items.length} · Tentativas: {o.syncCloseAttempts}
                    </p>
                  </div>
                  {o.syncCloseLastError && (
                    <div className="space-y-0.5 col-span-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Último erro</p>
                      <p className="text-muted-foreground break-words">{o.syncCloseLastError}</p>
                    </div>
                  )}
                </div>

                {itemsBlockClose && (
                  <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                    Fechamento aguardando Sync-Service enviar itens do totem (PG→FB).
                  </p>
                )}

                {tefCancelFbSaleInfo ? (
                  <div className="flex gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{tefCancelFbSaleInfo.message}</span>
                  </div>
                ) : null}

                <div className="rounded-md border border-primary/20 bg-background/60">
                  <div className="px-3 py-2 bg-primary/5 border-b border-primary/20">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Itens ({items.length})</p>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {items.map((item) => {
                      const isCancelled = item.status === "cancelled";
                      return (
                        <li key={item.id} className={`p-2.5 flex gap-2 ${isCancelled ? "opacity-50" : ""}`}>
                          <OrderItemImage barcode={item.productBarcode} imageUrl={item.imageUrl} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-xs font-medium truncate ${isCancelled ? "line-through" : ""}`}>{item.productName}</p>
                              <span className={`text-xs font-mono shrink-0 ${isCancelled ? "line-through" : ""}`}>
                                <Money value={item.subtotal} />
                              </span>
                            </div>
                            <p className={`text-[10px] text-muted-foreground font-mono ${isCancelled ? "line-through" : ""}`}>
                              {formatQuantity(item.quantity)} {item.unitName || "un"} × <Money value={item.unitPrice} />
                            </p>
                            <div className="flex flex-wrap gap-1">
                              <StatusBadge status={item.origin} />
                              <StatusBadge status={item.status} />
                              {!item.productId && (
                                <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 text-[10px]">
                                  Sem cadastro
                                </Badge>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <OrderTransactionsPanel orderId={o.id} dense />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
