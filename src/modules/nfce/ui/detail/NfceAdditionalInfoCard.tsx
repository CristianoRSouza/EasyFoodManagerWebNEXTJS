import { Info } from "lucide-react";
import { InfoRow, SectionCard } from "./NfceDetailPrimitives";

/** Aba Resumo, cartão "Informações Adicionais" — só aparece quando há algo a mostrar (cópia fiel do legado). */
export function NfceAdditionalInfoCard({ taxInfo, additionalInfo }: { taxInfo: string | null; additionalInfo: string | null }) {
  if (!taxInfo && !additionalInfo) return null;
  return (
    <SectionCard icon={<Info className="h-4 w-4 text-primary" />} title="Informações Adicionais">
      {taxInfo && <InfoRow label="Info. Fiscal" value={taxInfo} />}
      {additionalInfo && <InfoRow label="Info. Complementar" value={additionalInfo} />}
    </SectionCard>
  );
}
