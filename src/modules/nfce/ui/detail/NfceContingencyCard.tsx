"use client";

import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import type { NfceDetail } from "../../domain/nfce-detail";
import { formatDate } from "../../domain/nfce-formatters";
import { InfoRow, SectionCard } from "./NfceDetailPrimitives";

/** Aba Resumo, cartão "Contingência e reconciliação" (migração 022) — cópia fiel do legado. */
export function NfceContingencyCard({ detail }: { detail: NfceDetail }) {
  const router = useRouter();
  const { recovery } = detail;

  return (
    <SectionCard icon={<Link2 className="h-4 w-4 text-primary" />} title="Contingência e reconciliação">
      <InfoRow label="Caminho de emissão" value={recovery.emissionPath ?? "—"} mono />
      <InfoRow label="Status reconcile" value={recovery.reconcileStatus ?? "—"} mono />
      <InfoRow label="Tentativas (retry)" value={recovery.retryCount != null ? String(recovery.retryCount) : "—"} mono />
      <InfoRow label="Último retry" value={recovery.lastRetryAt ? formatDate(recovery.lastRetryAt) : "—"} />
      <InfoRow label="Próximo retry" value={recovery.nextRetryAt ? formatDate(recovery.nextRetryAt) : "—"} />
      <InfoRow label="Código último erro" value={recovery.lastErrorCode ?? "—"} mono />
      {recovery.lastErrorMessage && (
        <div className="py-2 text-sm border-b border-border/30">
          <span className="text-muted-foreground block mb-1">Mensagem do último erro</span>
          <p className="text-xs text-right whitespace-pre-wrap break-words font-mono">{recovery.lastErrorMessage}</p>
        </div>
      )}
      <InfoRow
        label="Correção manual (em)"
        value={recovery.manualFixRequiredAt ? formatDate(recovery.manualFixRequiredAt) : "—"}
      />
      {recovery.manualFixNote && (
        <div className="py-2 text-sm border-b border-border/30 last:border-0">
          <span className="text-muted-foreground block mb-1">Obs. correção manual</span>
          <p className="text-xs text-right whitespace-pre-wrap break-words">{recovery.manualFixNote}</p>
        </div>
      )}
      <InfoRow
        label="Nota origem"
        value={
          recovery.originNoteId ? (
            <Button type="button" variant="link" className="h-auto p-0 text-xs font-mono" onClick={() => router.push(`/nfce/${recovery.originNoteId}`)}>
              Abrir nota…
            </Button>
          ) : "—"
        }
      />
      <InfoRow
        label="Nota substituta"
        value={
          recovery.replacementNoteId ? (
            <Button type="button" variant="link" className="h-auto p-0 text-xs font-mono" onClick={() => router.push(`/nfce/${recovery.replacementNoteId}`)}>
              Abrir nota…
            </Button>
          ) : "—"
        }
      />
    </SectionCard>
  );
}
