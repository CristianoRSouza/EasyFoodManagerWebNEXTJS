import { Hash } from "lucide-react";
import type { NfceFiscalTotals } from "../../domain/nfce-detail";
import { formatCurrency } from "../../domain/nfce-formatters";
import { InfoRow, SectionCard } from "./NfceDetailPrimitives";

/** Aba Resumo, cartão "Totais Fiscais" — cópia fiel do legado. */
export function NfceFiscalTotalsCard({ totals }: { totals: NfceFiscalTotals }) {
  const rows: [string, number][] = [
    ["Produtos", totals.products],
    ["Desconto", totals.discount],
    ["Frete", totals.freight],
    ["Seguro", totals.insurance],
    ["Outras Desp.", totals.otherExpenses],
    ["IPI", totals.ipi],
    ["ICMS", totals.icms],
    ["ICMS ST", totals.icmsSt],
    ["PIS", totals.pis],
    ["COFINS", totals.cofins],
    ["FCP", totals.fcp],
  ];

  return (
    <SectionCard icon={<Hash className="h-4 w-4 text-primary" />} title="Totais Fiscais" subtitle={`Nota: ${formatCurrency(totals.note)}`}>
      <div className="grid grid-cols-2 gap-x-6 gap-y-0 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <InfoRow key={label} label={label} value={formatCurrency(value)} mono />
        ))}
      </div>
      <div className="mt-3 flex justify-between items-center rounded-lg bg-primary/5 border border-primary/20 p-3">
        <span className="font-semibold text-sm">TOTAL DA NOTA</span>
        <span className="text-xl font-bold font-mono tabular-nums text-primary">{formatCurrency(totals.note)}</span>
      </div>
    </SectionCard>
  );
}
