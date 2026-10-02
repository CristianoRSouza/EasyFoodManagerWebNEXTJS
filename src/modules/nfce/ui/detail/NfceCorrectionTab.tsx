"use client";

import { Loader2, Save } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { NFCE_EDITABLE_STATUS, type NfceStatus } from "../../domain/nfce-note";
import { useNfceRepository } from "../use-nfce-repository";
import { NfceCorrectionInfoSection } from "./NfceCorrectionInfoSection";
import { NfceCorrectionItemsSection } from "./NfceCorrectionItemsSection";
import { NfceCorrectionPaymentsSection } from "./NfceCorrectionPaymentsSection";
import { NfceCorrectionRecipientSection } from "./NfceCorrectionRecipientSection";
import { useNfceCorrectionForm } from "./use-nfce-correction-form";
import type { NfceDetailBundle } from "./use-nfce-detail-query";

/**
 * Aba "Correção" — invariante 1 do CLAUDE.md: só disponível em `manual_review`, e nunca pode
 * alterar o valor total da nota. Cópia fiel do legado, dividida em seções.
 */
export function NfceCorrectionTab({
  noteId,
  bundle,
  status,
  onSaved,
}: {
  noteId: string;
  bundle: NfceDetailBundle;
  status: NfceStatus;
  onSaved: () => void;
}) {
  const repository = useNfceRepository();
  const form = useNfceCorrectionForm(repository, noteId, bundle, onSaved);

  if (status !== NFCE_EDITABLE_STATUS) {
    return (
      <div className="mt-4 space-y-4">
        <Card className="shadow-sm border">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            A edição manual só fica disponível para notas com status <strong>manual_review</strong> (pendente de correção).
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="py-3 px-4 text-sm text-amber-900 dark:text-amber-200">
          Campos elegíveis: destinatário, fiscal dos itens, pagamentos (valor e troco) e informação complementar. Itens
          não podem alterar o total da nota. Pagamentos: soma dos valores menos troco deve ser pelo menos o total do
          cupom.
        </CardContent>
      </Card>

      <NfceCorrectionRecipientSection form={form} />
      <NfceCorrectionItemsSection form={form} />
      <NfceCorrectionPaymentsSection form={form} />
      <NfceCorrectionInfoSection form={form} />

      <div className="flex justify-end">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void form.saveCorrection()} disabled={form.savingCorrection || form.savingAndReprocessing}>
            {form.savingCorrection ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Salvar correções
          </Button>
          <Button onClick={() => void form.saveAndReprocessCorrection()} disabled={form.savingCorrection || form.savingAndReprocessing}>
            {form.savingAndReprocessing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Salvar e reprocessar
          </Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        Regras fiscais aplicadas: NFC-e usa CFOP 5xxx/6xxx; CRT 1/2 exige CSOSN (3 dígitos) e CRT 3 exige CST (2 dígitos).
      </div>
    </div>
  );
}
