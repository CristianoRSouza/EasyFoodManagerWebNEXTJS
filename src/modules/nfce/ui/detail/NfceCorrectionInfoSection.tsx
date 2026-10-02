import { Info } from "lucide-react";
import { Textarea } from "@/shared/ui/primitives/textarea";
import type { NfceCorrectionForm } from "./use-nfce-correction-form";
import { SectionCard } from "./NfceDetailPrimitives";

/** Aba "Correção", seção "Informação complementar" — cópia fiel do legado. */
export function NfceCorrectionInfoSection({ form }: { form: NfceCorrectionForm }) {
  return (
    <SectionCard icon={<Info className="h-4 w-4 text-primary" />} title="Informação complementar">
      <Textarea value={form.infoComplementar} onChange={(e) => form.setInfoComplementar(e.target.value)} rows={4} maxLength={5000} />
    </SectionCard>
  );
}
