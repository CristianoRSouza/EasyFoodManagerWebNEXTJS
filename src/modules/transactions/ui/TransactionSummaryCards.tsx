import { Card, CardContent } from "@/shared/ui/primitives/card";
import { PAYMENT_METHOD_LABELS, type PaymentTotals } from "../domain/transaction";
import { PaymentMethodIcon } from "./PaymentMethodIcon";
import { Money } from "@/shared/ui/Money";

export function TransactionSummaryCards({ totals }: { totals: PaymentTotals }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {(Object.entries(totals) as [keyof PaymentTotals, number][]).map(([method, total]) => (
        <Card key={method} className="glass-panel">
          <CardContent className="pt-3 pb-2 px-3 sm:pt-4 sm:pb-3 sm:px-6">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
              <PaymentMethodIcon method={method} />
              <span className="text-[11px] sm:text-sm text-muted-foreground truncate">
                {PAYMENT_METHOD_LABELS[method] ?? method}
              </span>
            </div>
            <p className="text-sm sm:text-xl font-bold font-mono truncate"><Money value={total} /></p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
