"use client";

import { Fragment } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Badge } from "@/shared/ui/primitives/badge";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
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

interface OrdersDesktopTableProps {
  orders: Order[];
  expanded: string | null;
  onToggle: (orderId: string) => void;
  getOrderItems: (orderId: string) => OrderItem[];
  getSubtotal: (orderId: string) => number;
}

/** Desktop/tablet: tabela completa, com detalhe expansível por comanda. */
export function OrdersDesktopTable({ orders, expanded, onToggle, getOrderItems, getSubtotal }: OrdersDesktopTableProps) {
  return (
    <Card className="glass-panel hidden md:block">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Mesa</TableHead>
              <TableHead>Totem</TableHead>
              <TableHead>Venda FB</TableHead>
              <TableHead>Caixa FB</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sync fechamento</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead>Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => {
              const isExpanded = expanded === o.id;
              const items = getOrderItems(o.id);
              const firebirdLinkStatus = getFirebirdLinkStatus(o, items);
              const itemsBlockClose = o.syncClosePending && totemItemsPendingSync(items);
              const tefCancelFbSaleInfo = getOrderTefCancelInfo(o);
              return (
                // Fragment, não `<div className="contents">` como no legado: `<div>` dentro de
                // `<tbody>` é HTML inválido (erro de hidratação no SSR). Mas, no legado, o `<div>`
                // fazia de cada linha um `:last-child`, e o `[&_tr:last-child]:border-0` do
                // `TableBody` zerava a borda de toda linha que fecha o grupo — a comanda recolhida
                // e o detalhe da expandida. O `border-0` abaixo reproduz isso explicitamente
                // (o `cn` do `TableRow` descarta o `border-b` base); sem ele a coluna inteira
                // anda 4px (a `border-l-4` passa a contar) e surge uma linha entre comandas.
                <Fragment key={o.id}>
                  <TableRow
                    className={`cursor-pointer transition-colors ${
                      !isExpanded
                        ? tefCancelFbSaleInfo
                          ? "bg-amber-500/5 hover:bg-amber-500/10 border-0"
                          : "hover:bg-muted/50 border-0"
                        : tefCancelFbSaleInfo
                          ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500"
                          : "bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary shadow-[inset_0_-1px_0_0_hsl(var(--primary)/0.3)]"
                    }`}
                    onClick={() => onToggle(o.id)}
                  >
                    <TableCell>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className={`font-mono font-medium ${isExpanded ? "text-primary" : ""}`}>{o.barcode}</p>
                        <p className="text-xs text-muted-foreground font-mono">order.id: {o.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{o.customerName || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell>{o.tableName}</TableCell>
                    <TableCell>{o.totemName || <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell className="font-mono">{o.fbSaleId ?? <span className="text-muted-foreground italic">—</span>}</TableCell>
                    <TableCell className="font-mono">
                      {o.fbCashRegisterId ?? <span className="text-muted-foreground italic">—</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={firebirdLinkStatus} />
                        {tefCancelFbSaleInfo ? <StatusBadge status="tef_cancel_fb_sale_closed" /> : null}
                        {itemsBlockClose ? <StatusBadge status="items_pending_fb" /> : null}
                        {o.syncClosePending ? (
                          <StatusBadge status="sync_pending" />
                        ) : o.syncClosedToFbAt ? (
                          <StatusBadge status="sync_sent" />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono"><Money value={getSubtotal(o.id)} /></TableCell>
                    <TableCell className="text-sm">{formatDateTime(o.createdAt)}</TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="hover:bg-transparent border-0">
                      <TableCell colSpan={11} className="p-0 border-l-4 border-l-primary bg-primary/5">
                        <div className="relative pl-6 pr-4 pb-4 pt-3">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/40" aria-hidden />
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="bg-primary/15 text-primary border-primary/40 uppercase tracking-wide text-[10px]">
                              Detalhes da comanda
                            </Badge>
                            <span className="font-mono text-sm font-semibold text-primary">{o.barcode}</span>
                            {o.customerName && (
                              <>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-sm text-foreground/80">{o.customerName}</span>
                              </>
                            )}
                            {o.tableName && (
                              <>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-sm text-muted-foreground">Mesa {o.tableName}</span>
                              </>
                            )}
                          </div>
                          <div className="space-y-4">
                            <div className="grid gap-3 rounded-lg border border-primary/20 bg-background/80 p-4 md:grid-cols-2 xl:grid-cols-4">
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ID da comanda</p>
                                <p className="text-sm font-mono break-all">{o.id}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vínculo ORDER_ID no FB</p>
                                <div className="flex flex-wrap gap-2">
                                  <StatusBadge status={firebirdLinkStatus} />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status do fechamento</p>
                                <div className="flex flex-wrap gap-2">
                                  <StatusBadge status={o.status} />
                                  {tefCancelFbSaleInfo ? <StatusBadge status="tef_cancel_fb_sale_closed" /> : null}
                                  {itemsBlockClose ? <StatusBadge status="items_pending_fb" /> : null}
                                  {o.syncClosePending ? (
                                    <StatusBadge status="sync_pending" />
                                  ) : o.syncClosedToFbAt ? (
                                    <StatusBadge status="sync_sent" />
                                  ) : null}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Solicitado em</p>
                                <p className="text-sm">{formatDateTime(o.syncCloseRequestedAt)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fechado no Firebird</p>
                                <p className="text-sm">{formatDateTime(o.syncClosedToFbAt)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tentativas</p>
                                <p className="text-sm font-mono">{o.syncCloseAttempts}</p>
                              </div>
                              {itemsBlockClose ? (
                                <div className="space-y-1 md:col-span-2 xl:col-span-4">
                                  <p className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                    Por que o fechamento fica pendente?
                                  </p>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    O Sync-Service adia o fechamento no Firebird enquanto existir item do totem com{" "}
                                    <span className="font-mono text-foreground/90">synced_to_fb = false</span>. Nesse ciclo são
                                    enviados primeiro os itens (PG→FB) e só depois a venda/fechamento. Se isto persistir,
                                    consulte o log do <span className="font-medium">EasyCommandPay-Sync-Service</span> na etapa{" "}
                                    <span className="font-mono text-[11px]">sync-items-to-fb</span>.
                                  </p>
                                </div>
                              ) : null}
                              {tefCancelFbSaleInfo ? (
                                <div className="md:col-span-2 xl:col-span-4 flex gap-3 rounded-md border border-amber-500/35 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300">
                                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                                  <div>
                                    <p className="font-semibold">Ocorrência de cancelamento TEF</p>
                                    <p className="text-sm leading-relaxed">{tefCancelFbSaleInfo.message}</p>
                                  </div>
                                </div>
                              ) : null}
                              <div className="space-y-1 md:col-span-2 xl:col-span-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Último erro</p>
                                <p className="text-sm text-muted-foreground">{o.syncCloseLastError || "Nenhum erro registrado."}</p>
                              </div>
                              <div className="space-y-1 md:col-span-2 xl:col-span-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Itens vinculados no FB</p>
                                <p className="text-sm font-mono">
                                  {items.filter((item) => item.fbId !== null).length} / {items.length}
                                </p>
                              </div>
                            </div>
                            <div className="rounded-lg border border-primary/20 bg-background/60 overflow-hidden">
                              <div className="px-4 py-2 bg-primary/5 border-b border-primary/20">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Itens da comanda <span className="text-foreground/80">({items.length})</span>
                                </p>
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead>Produto</TableHead>
                                    <TableHead>ID item</TableHead>
                                    <TableHead>Barcode</TableHead>
                                    <TableHead>fb_id</TableHead>
                                    <TableHead className="text-right">Qtd</TableHead>
                                    <TableHead>Unidade</TableHead>
                                    <TableHead className="text-right">Unit.</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead>Origem</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map((item) => {
                                    const isCancelled = item.status === "cancelled";
                                    return (
                                      <TableRow key={item.id} className={isCancelled ? "opacity-50" : ""}>
                                        <TableCell className="flex items-center gap-2">
                                          <OrderItemImage barcode={item.productBarcode} imageUrl={item.imageUrl} />
                                          <span className={isCancelled ? "line-through" : ""}>{item.productName}</span>
                                          {!item.productId && (
                                            <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30 text-[10px]">
                                              Sem cadastro
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className={`font-mono text-xs ${isCancelled ? "line-through" : ""}`}>{item.id}</TableCell>
                                        <TableCell className={`font-mono text-xs ${isCancelled ? "line-through" : ""}`}>
                                          {item.productBarcode}
                                        </TableCell>
                                        <TableCell className={`font-mono text-xs ${isCancelled ? "line-through" : ""}`}>
                                          {item.fbId ?? "—"}
                                        </TableCell>
                                        <TableCell className={`text-right ${isCancelled ? "line-through" : ""}`}>{formatQuantity(item.quantity)}</TableCell>
                                        <TableCell className={isCancelled ? "line-through" : ""}>{item.unitName || "—"}</TableCell>
                                        <TableCell className={`text-right font-mono ${isCancelled ? "line-through" : ""}`}>
                                          <Money value={item.unitPrice} />
                                        </TableCell>
                                        <TableCell className={`text-right font-mono ${isCancelled ? "line-through" : ""}`}>
                                          <Money value={item.subtotal} />
                                        </TableCell>
                                        <TableCell>
                                          <StatusBadge status={item.origin} />
                                        </TableCell>
                                        <TableCell>
                                          <StatusBadge status={item.status} />
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                            <OrderTransactionsPanel orderId={o.id} />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
