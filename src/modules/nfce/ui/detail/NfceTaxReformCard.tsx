import { Hash } from "lucide-react";
import { Separator } from "@/shared/ui/primitives/separator";
import type { NfceTaxReformTotals } from "../../domain/nfce-detail";
import { formatCurrency } from "../../domain/nfce-formatters";
import { InfoRow, SectionCard } from "./NfceDetailPrimitives";

/** Aba Resumo, cartão "Totais agregados (ICMSTot / IBSCBSTot / vNFTot)" (migração 030) — cópia fiel do legado. */
export function NfceTaxReformCard({ taxReform }: { taxReform: NfceTaxReformTotals }) {
  const ibsCbsRows: [string, number | null][] = [
    ["vBC IBSCBS", taxReform.base],
    ["vIBS", taxReform.ibs],
    ["vIBS UF", taxReform.ibsState],
    ["vDif IBS UF", taxReform.ibsStateDiff],
    ["vDevTrib IBS UF", taxReform.ibsStateReturn],
    ["vIBS Mun.", taxReform.ibsCity],
    ["vDif IBS Mun.", taxReform.ibsCityDiff],
    ["vDevTrib IBS Mun.", taxReform.ibsCityReturn],
    ["vCBS", taxReform.cbs],
    ["vDif CBS", taxReform.cbsDiff],
    ["vDevTrib CBS", taxReform.cbsReturn],
  ];

  return (
    <SectionCard
      icon={<Hash className="h-4 w-4 text-amber-600" />}
      title="Totais agregados (ICMSTot / IBSCBSTot / vNFTot)"
      subtitle="Soma dos itens na nota"
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2">
        <InfoRow label="ICMSTot vTotTrib" value={formatCurrency(taxReform.approximateTaxes ?? undefined)} mono />
        <InfoRow label="Total vNFTot (RTRIB)" value={formatCurrency(taxReform.noteTotal ?? undefined)} mono />
      </div>
      <Separator className="my-2" />
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">IBS/CBS (totais)</p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
        {ibsCbsRows.map(([label, value]) => (
          <InfoRow key={label} label={label} value={formatCurrency(value ?? undefined)} mono />
        ))}
      </div>
    </SectionCard>
  );
}
