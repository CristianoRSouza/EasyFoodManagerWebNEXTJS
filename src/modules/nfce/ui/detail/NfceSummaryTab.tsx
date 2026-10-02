import type { NfceDetail } from "../../domain/nfce-detail";
import { formatCurrency } from "../../domain/nfce-formatters";
import { NfceAdditionalInfoCard } from "./NfceAdditionalInfoCard";
import { NfceContingencyCard } from "./NfceContingencyCard";
import { NfceFiscalTotalsCard } from "./NfceFiscalTotalsCard";
import { NfceIdentificationCard } from "./NfceIdentificationCard";
import { NfceIssuerRecipientCards } from "./NfceIssuerRecipientCards";
import { NfceTaxReformCard } from "./NfceTaxReformCard";

/** A tira de 4 números rápidos no topo do Resumo — cópia fiel do legado. */
function QuickSummaryStrip({ detail }: { detail: NfceDetail }) {
  const tiles: { label: string; value: number; accent?: boolean }[] = [
    { label: "Total Nota", value: detail.totals.note, accent: true },
    { label: "Total Produtos", value: detail.totals.products },
    { label: "Descontos", value: detail.totals.discount },
    { label: "Total ICMS", value: detail.totals.icms },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className={`rounded-lg border p-3 ${tile.accent ? "bg-primary/5 border-primary/20" : "bg-muted/30"}`}>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{tile.label}</p>
          <p className={`text-lg font-bold font-mono tabular-nums ${tile.accent ? "text-primary" : ""}`}>{formatCurrency(tile.value)}</p>
        </div>
      ))}
    </div>
  );
}

/** Aba "Resumo" — cópia fiel do legado, dividida em um cartão por assunto fiscal. */
export function NfceSummaryTab({ detail }: { detail: NfceDetail }) {
  return (
    <div className="space-y-4 mt-4">
      <QuickSummaryStrip detail={detail} />
      <NfceIdentificationCard detail={detail} />
      <NfceContingencyCard detail={detail} />
      <NfceFiscalTotalsCard totals={detail.totals} />
      <NfceTaxReformCard taxReform={detail.taxReform} />
      <NfceIssuerRecipientCards issuer={detail.issuer} recipient={detail.recipient} />
      <NfceAdditionalInfoCard taxInfo={detail.taxInfo} additionalInfo={detail.additionalInfo} />
    </div>
  );
}
