import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import type { NfcePayment } from "../../domain/nfce-payment";
import { formatCnpj, formatCurrency } from "../../domain/nfce-formatters";
import { NfcePaymentBadge } from "../NfcePaymentBadge";
import { InfoRow } from "./NfceDetailPrimitives";

/** Aba "Pagamentos" — cópia fiel do legado. */
export function NfcePaymentsTab({ payments }: { payments: NfcePayment[] }) {
  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <div className="rounded-full bg-muted/50 p-4 mb-3">
          <CreditCard className="h-8 w-8" />
        </div>
        <p className="text-sm font-medium">Nenhum pagamento encontrado</p>
      </div>
    );
  }

  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {payments.map((payment) => {
          const hasChange = (payment.change ?? 0) > 0;
          return (
            <Card key={payment.sequence} className="shadow-sm border overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 bg-muted/30 px-4 py-3 border-b">
                  <NfcePaymentBadge code={payment.method} />
                  <span className="text-sm font-semibold">{payment.methodDescription}</span>
                  <span className="ml-auto font-mono text-base font-bold tabular-nums">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="p-4 space-y-0">
                  {payment.authorizationNsu && <InfoRow label="NSU/Autorização" value={payment.authorizationNsu} mono />}
                  {payment.integrationDescription && <InfoRow label="Integração" value={payment.integrationDescription} />}
                  {payment.cardBrand && (
                    <InfoRow label="Bandeira" value={payment.cardBrandDescription ? `${payment.cardBrandDescription} (${payment.cardBrand})` : payment.cardBrand} />
                  )}
                  {payment.acquirerCnpj && <InfoRow label="CNPJ Credenciadora" value={formatCnpj(payment.acquirerCnpj)} mono />}
                  <InfoRow
                    label="Troco"
                    value={<span className={hasChange ? "text-amber-600 font-semibold" : ""}>{formatCurrency(payment.change)}</span>}
                    mono
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex justify-between items-center">
        <span className="font-semibold text-sm">Total pago</span>
        <span className="text-xl font-bold font-mono tabular-nums text-primary">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
