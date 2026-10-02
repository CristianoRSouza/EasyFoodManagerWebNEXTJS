"use client";

import { Eye, RotateCw } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { formatCurrency, formatDate } from "../../domain/nfce-formatters";
import { NfceStatusBadge } from "../NfceStatusBadge";
import { NfcePaymentBadge } from "../NfcePaymentBadge";
import { canReprocessNfce, type NfceNote } from "../../domain/nfce-note";

export interface NfceMobileListProps {
  notes: NfceNote[];
  reprocessingId: string | null;
  onReprocess: (noteId: string) => void;
  onOpenDetail: (noteId: string) => void;
}

/** Cartões da lista de NFC-e em telas estreitas (< md) — cópia fiel de `LEGACY/src/pages/NfcePage.tsx`. */
export function NfceMobileList({ notes, reprocessingId, onReprocess, onOpenDetail }: NfceMobileListProps) {
  return (
    <div className="md:hidden divide-y divide-border">
      {notes.map((n) => {
        const isCancelled = n.status === "cancelled";
        const isUnusable = n.status === "unusable";
        const isInutilized = n.status === "inutilized";
        const isRejected = n.status === "rejected";
        const dimmed = isCancelled || isUnusable || isInutilized;
        const crossed = isCancelled || isRejected;
        return (
          // `<div role="button">`, não `<button>`: as ações (Reprocessar/Ver detalhes) já são
          // `<button>` do shadcn — aninhar botão em botão é HTML inválido e o React 19 recusa a
          // renderizar (o legado aninha porque roda fora do SSR estrito do Next).
          <div
            key={n.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenDetail(n.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenDetail(n.id);
              }
            }}
            className={`w-full text-left p-3 active:bg-muted/40 transition-colors cursor-pointer ${dimmed ? "opacity-80" : ""}`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0 flex-1">
                <div className={`font-mono text-sm font-semibold ${crossed ? "line-through decoration-muted-foreground/75" : ""}`}>
                  {String(n.number).padStart(9, "0")}
                  <span className="text-muted-foreground mx-1">/</span>
                  {String(n.serie).padStart(3, "0")}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{formatDate(n.issuedAt)}</div>
              </div>
              <NfceStatusBadge status={n.statusText || n.status} />
            </div>
            <div className="flex items-end justify-between gap-2 mt-2">
              <div className="min-w-0 flex-1">
                {n.recipientDocument ? (
                  <div className="text-[11px]">
                    <span className="font-mono">{n.recipientDocument.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}</span>
                    {n.recipientName && <span className="text-muted-foreground block truncate">{n.recipientName}</span>}
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground italic">Consumidor</span>
                )}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {n.paymentMethods.map((code) => (
                    <NfcePaymentBadge key={code} code={code} />
                  ))}
                  <span className="inline-flex h-5 items-center rounded-full bg-muted/60 px-2 text-[10px] font-medium">
                    {n.itemCount} {n.itemCount === 1 ? "item" : "itens"}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-sm font-bold tabular-nums">{formatCurrency(n.totalValue)}</div>
                <div className="flex items-center justify-end gap-1 mt-1">
                  {canReprocessNfce(n) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-amber-500/10 hover:text-amber-700"
                      aria-label="Reprocessar"
                      disabled={reprocessingId === n.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReprocess(n.id);
                      }}
                    >
                      <RotateCw className={`h-4 w-4 ${reprocessingId === n.id ? "animate-spin" : ""}`} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                    aria-label="Ver detalhes"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail(n.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            {(n.returnReason || n.returnCode) && (
              <div className="mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-start gap-2">
                <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded shrink-0">{n.returnCode ?? "—"}</span>
                {n.returnReason && <span className="line-clamp-2">{n.returnReason}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
