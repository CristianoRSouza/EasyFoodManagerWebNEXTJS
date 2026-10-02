"use client";

import { Badge } from "@/shared/ui/primitives/badge";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { useOrderTransactionsQuery } from "./use-order-transactions-query";
import { formatTransactionMethod, getTransactionTefCancelInfo } from "../domain/order-rules";
import { Money } from "@/shared/ui/Money";
import { formatDateTime } from "@/shared/format/date-time";

/** Transações com `orderIds` contendo o UUID da comanda (carrega só com a linha expandida). */
export function OrderTransactionsPanel({ orderId, dense }: { orderId: string; dense?: boolean }) {
  const q = useOrderTransactionsQuery(orderId);
  const txs = q.data ?? [];

  return (
    <div className={`rounded-md border border-primary/20 bg-background/60 ${dense ? "" : "rounded-lg"}`}>
      <div className={`px-3 py-2 bg-primary/5 border-b border-primary/20 ${dense ? "" : "px-4"}`}>
        <p className={`font-semibold uppercase tracking-wide text-muted-foreground ${dense ? "text-[10px]" : "text-xs"}`}>
          Transações da comanda <span className="text-foreground/80">({txs.length})</span>
        </p>
      </div>
      {q.isLoading && (
        <p className={`text-muted-foreground ${dense ? "p-2.5 text-[11px]" : "p-4 text-sm"}`}>Carregando transações…</p>
      )}
      {q.isError && (
        <p className={`text-destructive ${dense ? "p-2.5 text-[11px]" : "p-4 text-sm"}`}>Não foi possível carregar as transações.</p>
      )}
      {!q.isLoading && !q.isError && txs.length === 0 && (
        <p className={`text-muted-foreground ${dense ? "p-2.5 text-[11px]" : "p-4 text-sm"}`}>
          Nenhuma transação vinculada a esta comanda.
        </p>
      )}
      {!q.isLoading && !q.isError && txs.length > 0 && dense && (
        <ul className="divide-y divide-border/60">
          {txs.map((t) => (
            <li key={t.id} className="p-2.5 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium">{formatTransactionMethod(t.paymentMethod)}</span>
                <span className="text-xs font-mono shrink-0"><Money value={t.amount} /></span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">{formatDateTime(t.createdAt)}</p>
              <div className="flex flex-wrap gap-1 items-center">
                <StatusBadge status={t.status} />
                {getTransactionTefCancelInfo(t) ? <StatusBadge status="tef_cancel_fb_sale_closed" /> : null}
                {t.installments > 1 ? (
                  <Badge variant="outline" className="text-[10px]">
                    {t.installments}×
                  </Badge>
                ) : null}
                {t.nsu ? (
                  <span className="text-[10px] text-muted-foreground font-mono" title={t.nsu}>
                    NSU {t.nsu}
                  </span>
                ) : null}
              </div>
              <p className="text-[10px] font-mono text-muted-foreground truncate" title={t.id}>
                {t.id.slice(0, 8)}…{t.id.slice(-4)}
              </p>
              {getTransactionTefCancelInfo(t) ? (
                <p className="rounded border border-amber-500/30 bg-amber-500/10 p-1.5 text-[10px] leading-relaxed text-amber-800 dark:text-amber-300">
                  {getTransactionTefCancelInfo(t)?.message}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {!q.isLoading && !q.isError && txs.length > 0 && !dense && (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Data</TableHead>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Parc.</TableHead>
              <TableHead>NSU</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="font-mono text-xs">ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txs.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-sm whitespace-nowrap">{formatDateTime(t.createdAt)}</TableCell>
                <TableCell className="text-sm">{formatTransactionMethod(t.paymentMethod)}</TableCell>
                <TableCell className="text-right font-mono"><Money value={t.amount} /></TableCell>
                <TableCell className="text-right font-mono">{t.installments > 1 ? `${t.installments}×` : "—"}</TableCell>
                <TableCell className="font-mono text-xs">{t.nsu ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={t.status} />
                  {getTransactionTefCancelInfo(t) ? (
                    <div className="mt-1">
                      <StatusBadge status="tef_cancel_fb_sale_closed" />
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-xs max-w-[120px] truncate" title={t.id}>
                  {t.id.slice(0, 8)}…{t.id.slice(-4)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
