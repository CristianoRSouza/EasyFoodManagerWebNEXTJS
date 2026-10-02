"use client";

import { Eye, RotateCw } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { formatCurrency, formatDate } from "../../domain/nfce-formatters";
import { NfceStatusBadge } from "../NfceStatusBadge";
import { NfcePaymentBadge } from "../NfcePaymentBadge";
import { canReprocessNfce, type NfceNote } from "../../domain/nfce-note";

/** Frase da coluna "Motivo operacional" — mesmas regras do legado, na mesma ordem de prioridade. */
function operationalReasonOf(note: NfceNote): string {
  const reconcileStatus = (note.reconcileStatus ?? "").toLowerCase();
  if (note.status === "unusable") return "Aguardando transmissão automática da contingência";
  if (note.status === "inutilized") return "Número inutilizado (ciclo encerrado)";
  if (note.status === "manual_review") return "Pendente de correção manual";
  if (reconcileStatus === "failed") return "Falha de reconciliação da nota original";
  if (reconcileStatus === "pending_reconcile_origin") return "Aguardando reconciliação da nota original";
  if (reconcileStatus === "consulted_authorized_pending_cancel") return "Original autorizada; aguardando cancelamento por substituição";
  return "Fluxo normal";
}

export interface NfceDesktopTableProps {
  notes: NfceNote[];
  reprocessingId: string | null;
  onReprocess: (noteId: string) => void;
  onOpenDetail: (noteId: string) => void;
}

/** Tabela da lista de NFC-e em telas largas (md+) — cópia fiel de `LEGACY/src/pages/NfcePage.tsx`. */
export function NfceDesktopTable({ notes, reprocessingId, onReprocess, onOpenDetail }: NfceDesktopTableProps) {
  return (
    <div className="hidden md:block overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="font-semibold text-xs uppercase tracking-wider">Nº / Série</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Status</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider">Emissão</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider">Destinatário</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Valor</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Itens</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider">Pagamento</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">cStat</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider">Retorno SEFAZ</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider">Motivo operacional</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {notes.map((n) => {
            const isCancelled = n.status === "cancelled";
            const isUnusable = n.status === "unusable";
            const isInutilized = n.status === "inutilized";
            const isRejected = n.status === "rejected";
            const dimmed = isCancelled || isUnusable || isInutilized;
            const crossed = isCancelled || isRejected;
            const crossedClass = crossed ? "line-through decoration-muted-foreground/75 decoration-1" : "";
            const retries = n.retryCount ?? 0;
            const operationalReason = operationalReasonOf(n);

            return (
              <TableRow
                key={n.id}
                className={`cursor-pointer transition-colors hover:bg-muted/40 ${dimmed ? "opacity-80" : ""} ${crossedClass}`}
                onClick={() => onOpenDetail(n.id)}
              >
                <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                  {String(n.number).padStart(9, "0")}
                  <span className="text-muted-foreground mx-1">/</span>
                  {String(n.serie).padStart(3, "0")}
                </TableCell>
                <TableCell className="text-center">
                  <NfceStatusBadge status={n.statusText || n.status} />
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{formatDate(n.issuedAt)}</TableCell>
                <TableCell className="text-sm max-w-[160px]">
                  {n.recipientDocument ? (
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">
                        {n.recipientDocument.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4")}
                      </span>
                      {n.recipientName && <span className="text-[11px] text-muted-foreground truncate">{n.recipientName}</span>}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Consumidor</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold tabular-nums">{formatCurrency(n.totalValue)}</TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-xs font-medium">
                    {n.itemCount}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {n.paymentMethods.map((code) => (
                      <NfcePaymentBadge key={code} code={code} />
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center justify-center rounded bg-muted/60 px-2 py-0.5 font-mono text-xs font-medium cursor-default">
                        {n.returnCode ?? "—"}
                      </span>
                    </TooltipTrigger>
                    {n.returnReason && (
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        {n.returnReason}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TableCell>
                <TableCell className="text-xs max-w-[200px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block truncate cursor-default text-muted-foreground">
                        {n.returnReason ? (n.returnReason.length > 30 ? `${n.returnReason.slice(0, 30)}…` : n.returnReason) : "—"}
                      </span>
                    </TooltipTrigger>
                    {n.returnReason && n.returnReason.length > 30 && (
                      <TooltipContent side="top" className="max-w-sm text-xs">
                        {n.returnReason}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TableCell>
                <TableCell className="text-xs max-w-[240px]">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="block truncate cursor-default text-muted-foreground">
                        {operationalReason}
                        {retries > 0 ? ` · retry ${retries}` : ""}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm text-xs">
                      <div className="space-y-1">
                        <p>{operationalReason}</p>
                        <p>Tentativas automáticas: {retries}</p>
                        {n.reconcileStatus && <p>Reconcile: {n.reconcileStatus}</p>}
                        <p>Tipo emissão: {n.emissionType ?? "—"}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
