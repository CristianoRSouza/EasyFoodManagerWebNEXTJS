"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  formatOrderBarcodes,
  hasPixSnapshot,
  hasTefSnapshot,
  paymentMethodKey,
  paymentMethodLabel,
  type Transaction,
} from "../domain/transaction";
import { getTefCancelFbSaleInfo } from "../domain/transaction-detail";
import { PaymentMethodIcon } from "./PaymentMethodIcon";
import { Money } from "@/shared/ui/Money";
import { formatDateTime } from "@/shared/format/date-time";

export interface TransactionMobileListProps {
  rows: Transaction[];
  orderBarcodeById: Map<string, string>;
  onOpenDetail: (transaction: Transaction) => void;
}

export function TransactionMobileList({ rows, orderBarcodeById, onOpenDetail }: TransactionMobileListProps) {
  return (
    <div className="md:hidden space-y-2">
      {rows.map((t, idx) => {
        const pk = paymentMethodKey(t.paymentMethod);
        const tefCancelFbSaleInfo = getTefCancelFbSaleInfo(t);
        const hasTef = hasTefSnapshot(t);
        const hasPix = hasPixSnapshot(t);
        const comanda = formatOrderBarcodes(t.orderIds, orderBarcodeById);
        return (
          <Card key={`m-${idx}-${t.id}`} className="glass-panel">
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <PaymentMethodIcon method={pk} />
                  <span className="text-sm font-medium truncate" title={t.paymentMethod}>
                    {paymentMethodLabel(t.paymentMethod)}
                  </span>
                  {t.installments > 1 && (
                    <span className="text-[11px] text-muted-foreground shrink-0">{t.installments}x</span>
                  )}
                </div>
                <span className="font-mono text-sm font-semibold shrink-0"><Money value={t.amount} /></span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={t.status} />
                {tefCancelFbSaleInfo ? <StatusBadge status="tef_cancel_fb_sale_closed" /> : null}
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(t.createdAt)}
                </span>
              </div>

              {(t.nsu || t.authorizationCode || t.tefTransactionId) && (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  {t.nsu && (
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">NSU</p>
                      <p className="font-mono truncate" title={t.nsu}>
                        {t.nsu}
                      </p>
                    </div>
                  )}
                  {t.authorizationCode && (
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Autorização</p>
                      <p className="font-mono truncate" title={t.authorizationCode}>
                        {t.authorizationCode}
                      </p>
                    </div>
                  )}
                  {t.tefTransactionId && (
                    <div className="min-w-0 col-span-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">ID TEF / Aditum</p>
                      <p className="font-mono truncate" title={t.tefTransactionId}>
                        {t.tefTransactionId}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {t.orderIds.length > 0 && (
                <div className="grid grid-cols-1 gap-1 text-[11px]">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Comanda</p>
                    <p className="font-mono truncate" title={comanda.full || undefined}>
                      {comanda.primary}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Venda</p>
                    <p className="font-mono truncate" title={t.orderIds.join(", ")}>
                      {t.orderIds[0]}
                      {t.orderIds.length > 1 ? ` (+${t.orderIds.length - 1})` : ""}
                    </p>
                  </div>
                </div>
              )}

              {hasPix && (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Status PIX</p>
                    <p className="truncate" title={t.pixStatus ?? ""}>
                      {t.pixStatus ?? "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">QR ID</p>
                    <p className="font-mono truncate" title={t.pixQrcodeId ?? ""}>
                      {t.pixQrcodeId ?? "—"}
                    </p>
                  </div>
                </div>
              )}

              {hasTef && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => onOpenDetail(t)}
                  >
                    Detalhes
                  </Button>
                </div>
              )}

              {tefCancelFbSaleInfo ? (
                <div className="flex gap-2 rounded-md border border-amber-500/35 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{tefCancelFbSaleInfo.message}</span>
                </div>
              ) : null}
              {!hasTef && hasPix && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => onOpenDetail(t)}
                  >
                    Detalhes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
      {rows.length === 0 && (
        <Card className="glass-panel">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma transação encontrada.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
