"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardCopy } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { useToast } from "@/shared/ui/use-toast";
import type { NfceDetail } from "../../domain/nfce-detail";
import { formatAccessKey } from "../../domain/nfce-formatters";
import { NfceStatusBadge } from "../NfceStatusBadge";

/** Badge Produção/Homologação — cópia fiel do inline `ambBadge` do legado. Reaproveitado pela Identificação (Resumo). */
export function EnvironmentBadge({ environment }: { environment: number | null }) {
  if (environment === 1) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Produção</Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">Homologação</Badge>
  );
}

export function NfceDetailHeader({ detail }: { detail: NfceDetail }) {
  const router = useRouter();
  const { toast } = useToast();
  const { note } = detail;

  const copyKey = () => {
    if (!note.accessKey) return;
    navigator.clipboard.writeText(note.accessKey);
    toast({ title: "Copiado", description: "Chave de acesso copiada." });
  };

  return (
    <div className="flex items-start gap-3">
      <Button variant="ghost" size="icon" onClick={() => router.push("/nfce")} aria-label="Voltar" className="mt-0.5 shrink-0">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold font-heading">
            NFC-e <span className="font-mono">{String(note.number).padStart(9, "0")}</span>
            <span className="text-muted-foreground mx-1.5">/</span>
            <span className="font-mono text-base">Série {String(note.serie).padStart(3, "0")}</span>
          </h1>
          <NfceStatusBadge status={note.statusText || note.status} />
          <EnvironmentBadge environment={detail.identification?.environment ?? null} />
        </div>
        {note.accessKey && (
          <div className="flex items-center gap-2 mt-2 rounded-lg bg-muted/50 px-3 py-2 border border-border/50">
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground shrink-0">Chave</span>
            <span className="font-mono text-xs break-all flex-1 select-all">{formatAccessKey(note.accessKey)}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyKey} aria-label="Copiar chave">
              <ClipboardCopy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
