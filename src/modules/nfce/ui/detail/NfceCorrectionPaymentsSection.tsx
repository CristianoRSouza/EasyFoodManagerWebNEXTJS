import { CreditCard } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { formatCurrency } from "../../domain/nfce-formatters";
import { SectionCard } from "./NfceDetailPrimitives";
import { PAYMENT_METHOD_OPTIONS } from "./payment-method-options";
import type { NfceCorrectionForm } from "./use-nfce-correction-form";

/** Aba "Correção", seção "Pagamentos" — cópia fiel do legado (forma, valor e troco editáveis). */
export function NfceCorrectionPaymentsSection({ form }: { form: NfceCorrectionForm }) {
  return (
    <SectionCard
      icon={<CreditCard className="h-4 w-4 text-primary" />}
      title="Pagamentos"
      subtitle={`Mínimo líquido ≥ ${formatCurrency(form.noteTotal)} (soma − troco)`}
    >
      <div className="grid gap-3">
        {form.editablePayments.map((row, idx) => {
          const hasError = form.errorPaymentSeqs.has(row.seq);
          return (
            <div
              key={row.seq}
              id={`manual-correction-payment-${row.seq}`}
              className={`grid gap-3 rounded-md border border-border/40 p-3 sm:grid-cols-2 lg:grid-cols-[100px_1fr_140px_140px] ${hasError ? "bg-destructive/5" : ""}`}
            >
              <Label className="self-center text-muted-foreground sm:col-span-2 lg:col-span-1">Parcela {row.seq}</Label>
              <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                <Label className="text-xs text-muted-foreground">Forma</Label>
                <select
                  className={`h-9 w-full rounded-md border bg-background px-3 text-sm ${hasError ? "border-destructive" : "border-input"}`}
                  value={row.paymentMethod}
                  onChange={(e) =>
                    form.updatePayment(idx, {
                      paymentMethod: e.target.value,
                      changeValue: e.target.value === "01" ? row.changeValue : "0",
                    })
                  }
                >
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Valor (vPag)</Label>
                <Input
                  inputMode="decimal"
                  className={hasError ? "border-destructive focus-visible:ring-destructive" : ""}
                  value={row.paymentValue}
                  onChange={(e) => form.updatePayment(idx, { paymentValue: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Troco (só dinheiro)</Label>
                <Input
                  inputMode="decimal"
                  disabled={row.paymentMethod !== "01"}
                  className={hasError ? "border-destructive focus-visible:ring-destructive" : ""}
                  value={row.paymentMethod === "01" ? row.changeValue : "0"}
                  onChange={(e) => form.updatePayment(idx, { changeValue: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
