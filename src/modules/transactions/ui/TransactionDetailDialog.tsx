"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/primitives/dialog";
import { Separator } from "@/shared/ui/primitives/separator";
import { hasPixSnapshot, type Transaction } from "../domain/transaction";
import { formatReceiptLines, getTefCancelFbSaleInfo, summarizeAditumConfirmation } from "../domain/transaction-detail";

export interface TransactionDetailDialogProps {
  transaction: Transaction | null;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailDialog({ transaction, onOpenChange }: TransactionDetailDialogProps) {
  const cancelInfo = transaction ? getTefCancelFbSaleInfo(transaction) : null;

  return (
    <Dialog open={transaction != null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da transação</DialogTitle>
          <DialogDescription>
            Transação {transaction?.id?.slice(0, 8)}… · NSU: {transaction?.nsu || "—"} · Método:{" "}
            {transaction?.paymentMethod || "—"}
          </DialogDescription>
        </DialogHeader>
        {transaction ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Status: {transaction.status}</Badge>
              {transaction.pixStatus ? <Badge variant="secondary">PIX: {transaction.pixStatus}</Badge> : null}
              {transaction.nsu ? <Badge variant="outline">NSU: {transaction.nsu}</Badge> : null}
              {cancelInfo ? (
                <Badge
                  variant="outline"
                  className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40"
                >
                  TEF cancelado · venda FB fechada
                </Badge>
              ) : null}
            </div>
            {cancelInfo ? (
              <div className="flex gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Ocorrência de cancelamento TEF</p>
                  <p className="text-sm leading-relaxed">{cancelInfo.message}</p>
                </div>
              </div>
            ) : null}
            <details open={hasPixSnapshot(transaction)} className="rounded-md border border-border p-3">
              <summary className="cursor-pointer font-medium">PIX (materializado)</summary>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <p>
                  <span className="font-medium text-foreground">qrcodeId:</span>{" "}
                  <span className="font-mono">{transaction.pixQrcodeId ?? "—"}</span>
                </p>
                <p>
                  <span className="font-medium text-foreground">status:</span> {transaction.pixStatus ?? "—"}
                </p>
                <p>
                  <span className="font-medium text-foreground">txId:</span>{" "}
                  <span className="font-mono">{transaction.pixTxid ?? "—"}</span>
                </p>
                <p>
                  <span className="font-medium text-foreground">e2eId:</span>{" "}
                  <span className="font-mono">{transaction.pixE2eId ?? "—"}</span>
                </p>
                <p>
                  <span className="font-medium text-foreground">paidAt:</span> {transaction.pixPaidAt ?? "—"}
                </p>
                <p>
                  <span className="font-medium text-foreground">lastPollAt:</span> {transaction.pixLastPollAt ?? "—"}
                </p>
                <p className="sm:col-span-2">
                  <span className="font-medium text-foreground">providerUrl:</span>{" "}
                  <span className="font-mono break-all">{transaction.pixProviderUrl ?? "—"}</span>
                </p>
              </div>
            </details>
            <Separator />
            <details open={Boolean(transaction.tefResult)} className="rounded-md border border-border p-3">
              <summary className="cursor-pointer font-medium">TEF (snapshot)</summary>
              {transaction.tefResult ? (
                <div className="mt-3 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">storedAt:</span>{" "}
                      {transaction.tefResult.storedAt ?? "—"}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Confirmação Aditum:</span>{" "}
                      {summarizeAditumConfirmation(transaction.tefResult.aditumConfirmation)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Via estabelecimento (merchantReceipt)</p>
                    <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto whitespace-pre-wrap font-mono border">
                      {formatReceiptLines(transaction.tefResult.merchantReceipt) || "—"}
                    </pre>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Via cliente (cardholderReceipt)</p>
                    <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto whitespace-pre-wrap font-mono border">
                      {formatReceiptLines(transaction.tefResult.cardholderReceipt) || "—"}
                    </pre>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium text-foreground mb-2">
                      JSON authorizationResponse (bruto)
                    </summary>
                    <pre className="bg-muted/30 p-2 rounded-md overflow-x-auto max-h-48 overflow-y-auto font-mono">
                      {JSON.stringify(transaction.tefResult.authorizationResponse ?? null, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Sem dados TEF para esta transação.</p>
              )}
            </details>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
