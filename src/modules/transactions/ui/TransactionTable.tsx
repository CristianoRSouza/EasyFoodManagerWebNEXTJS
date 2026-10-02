"use client";

import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  formatOrderBarcodes,
  formatOrderIds,
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

export interface TransactionTableProps {
  rows: Transaction[];
  orderBarcodeById: Map<string, string>;
  onOpenDetail: (transaction: Transaction) => void;
}

export function TransactionTable({ rows, orderBarcodeById, onOpenDetail }: TransactionTableProps) {
  return (
    <Card className="glass-panel hidden md:block">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Comanda</TableHead>
              <TableHead>Venda</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Parc.</TableHead>
              <TableHead>NSU</TableHead>
              <TableHead>Autorização</TableHead>
              <TableHead className="min-w-[120px]">ID TEF / Aditum</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t, idx) => {
              const pk = paymentMethodKey(t.paymentMethod);
              const venda = formatOrderIds(t.orderIds);
              const comanda = formatOrderBarcodes(t.orderIds, orderBarcodeById);
              const tefCancelFbSaleInfo = getTefCancelFbSaleInfo(t);
              const hasTef = hasTefSnapshot(t);
              const hasPix = hasPixSnapshot(t);
              return (
                <TableRow
                  key={`d-${idx}-${t.id}`}
                  className={tefCancelFbSaleInfo ? "border-l-4 border-l-amber-500 bg-amber-500/5" : undefined}
                >
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDateTime(t.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[150px] truncate" title={comanda.full || undefined}>
                    {comanda.primary}
                    {t.orderIds.length > 1 ? ` (+${t.orderIds.length - 1})` : ""}
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[180px] truncate" title={venda.full || undefined}>
                    {venda.primary}
                    {t.orderIds.length > 1 ? ` (+${t.orderIds.length - 1})` : ""}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PaymentMethodIcon method={pk} />
                      <span className="max-w-[140px] truncate" title={t.paymentMethod}>
                        {paymentMethodLabel(t.paymentMethod)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium whitespace-nowrap">
                    <Money value={t.amount} />
                  </TableCell>
                  <TableCell className="text-right">{t.installments}x</TableCell>
                  <TableCell className="font-mono text-sm max-w-[100px] truncate" title={t.nsu ?? ""}>
                    {t.nsu || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm max-w-[100px] truncate" title={t.authorizationCode ?? ""}>
                    {t.authorizationCode || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[140px] truncate" title={t.tefTransactionId ?? ""}>
                    {t.tefTransactionId || "—"}
                  </TableCell>
                  <TableCell>
                    {hasTef || hasPix ? (
                      <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => onOpenDetail(t)}>
                        Ver
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                    {tefCancelFbSaleInfo ? (
                      <div className="mt-1">
                        <StatusBadge status="tef_cancel_fb_sale_closed" />
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
