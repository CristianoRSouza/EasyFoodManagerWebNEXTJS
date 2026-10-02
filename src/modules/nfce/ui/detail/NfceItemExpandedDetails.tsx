import type { NfceItem } from "../../domain/nfce-item";
import { formatCurrency } from "../../domain/nfce-formatters";
import { fmtQty, hasCsosn500Data } from "./nfce-detail-labels";

/** Linha expandida de um item — o detalhe fiscal completo (ICMS/PIS/COFINS) — cópia fiel do legado. */
export function NfceItemExpandedDetails({ item }: { item: NfceItem }) {
  const csosn500 = item.icms.csosn500;
  const showCsosn500 = hasCsosn500Data(item) || item.icms.cstOrCsosn === "500";

  return (
    <>
      <div className="grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <p className="font-semibold text-foreground uppercase tracking-wider text-[10px] mb-1.5">Identificação</p>
          <p>
            Ind. escala: <span className="font-mono">{item.scaleIndicator ?? "—"}</span>
            {" · "}RTRIB vItem (vNFTot): <span className="font-mono font-semibold">{formatCurrency(item.reformItemTotal ?? undefined)}</span>
          </p>
          {item.ean && item.ean !== "SEM GTIN" && (
            <p>
              EAN: <span className="font-mono">{item.ean}</span>
            </p>
          )}
          {item.cest && (
            <p>
              CEST: <span className="font-mono">{item.cest}</span>
            </p>
          )}
          {(item.discount ?? 0) > 0 && (
            <p>
              Desconto: <span className="font-semibold">{formatCurrency(item.discount)}</span>
            </p>
          )}
          {(item.freight ?? 0) > 0 && <p>Frete: {formatCurrency(item.freight)}</p>}
          {(item.insurance ?? 0) > 0 && <p>Seguro: {formatCurrency(item.insurance)}</p>}
          {(item.otherExpenses ?? 0) > 0 && <p>Outras Desp.: {formatCurrency(item.otherExpenses)}</p>}
        </div>

        <div className="space-y-1">
          <p className="font-semibold text-foreground uppercase tracking-wider text-[10px] mb-1.5">ICMS</p>
          <p>
            Origem: {item.icms.origin ?? "—"} | CST/CSOSN: {item.icms.cstOrCsosn ?? "—"}
          </p>
          <p>
            BC: {formatCurrency(item.icms.base ?? undefined)} | Alíq: {item.icms.rate ?? "0"}% | Valor: {formatCurrency(item.icms.value ?? undefined)}
          </p>
          {(item.icms.stValue ?? 0) > 0 && <p>ICMS ST: {formatCurrency(item.icms.stValue)}</p>}
          {(item.icms.fcpValue ?? 0) > 0 && <p>FCP: {formatCurrency(item.icms.fcpValue)}</p>}
          {item.icms.snCreditRate != null && (
            <p>
              SN Crédito: Alíq {item.icms.snCreditRate}% | Valor: {formatCurrency(item.icms.snCreditValue ?? undefined)}
            </p>
          )}
          {showCsosn500 && (
            <div className="mt-2 rounded border border-border/40 bg-muted/20 p-2 space-y-0.5">
              <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">CSOSN 500</p>
              <p>
                pST: {csosn500?.stRate ?? "0"} | vBCSTRet: {formatCurrency(csosn500?.stRetainedBase ?? undefined)}
              </p>
              <p>
                vICMSSubstituto: {formatCurrency(csosn500?.substituteIcms ?? undefined)} | vICMSSTRet: {formatCurrency(csosn500?.stRetainedIcms ?? undefined)}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="font-semibold text-foreground uppercase tracking-wider text-[10px] mb-1.5">PIS / COFINS</p>
          <p>
            PIS CST: {item.pis.cst ?? "—"} | BC: {formatCurrency(item.pis.base ?? undefined)} | Alíq: {item.pis.rate ?? "0"}% | Valor: {formatCurrency(item.pis.value ?? undefined)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            qBCProd: {fmtQty(item.pis.quantityBase)} · vAliqProd: {formatCurrency(item.pis.rateInReais ?? undefined)}
          </p>
          <p>
            COFINS CST: {item.cofins.cst ?? "—"} | BC: {formatCurrency(item.cofins.base ?? undefined)} | Alíq: {item.cofins.rate ?? "0"}% | Valor: {formatCurrency(item.cofins.value ?? undefined)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            qBCProd: {fmtQty(item.cofins.quantityBase)} · vAliqProd: {formatCurrency(item.cofins.rateInReais ?? undefined)}
          </p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
        <span className="font-semibold text-xs">Total Tributos Estimados:</span>
        <span className="font-mono font-semibold text-sm tabular-nums">{formatCurrency(item.totalTaxes ?? undefined)}</span>
      </div>
      {item.additionalInfo && (
        <p className="mt-2 text-xs text-muted-foreground italic border-t border-border/30 pt-2">{item.additionalInfo}</p>
      )}
    </>
  );
}
