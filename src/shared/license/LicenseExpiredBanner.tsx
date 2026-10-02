"use client";

import { AlertTriangle, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { useExternalAccess } from "@/shared/layout/external-access";
import { licenseBannerCopy } from "./license-status";
import { useLicenseStatus } from "./use-license-status";

/**
 * Faixa persistente no topo quando a licença expirou ou está prestes a expirar
 * (`LEGACY/src/components/billing/LicenseExpiredBanner.tsx`). O CTA "Revisar pagamento" abre o
 * EasyBilling via SSO (`useExternalAccess`, o equivalente do `useBillingSSO` do legado).
 */
export function LicenseExpiredBanner() {
  const { data } = useLicenseStatus();
  const { openBilling, billingLoading: loading } = useExternalAccess();
  const copy = licenseBannerCopy(data);
  if (!copy) return null;
  const { isExpired, title, description } = copy;

  const tone = isExpired
    ? "border-b-destructive/50 bg-destructive/15 text-destructive-foreground dark:text-red-100"
    : "border-b-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-100";

  const iconTone = isExpired ? "text-destructive dark:text-red-300" : "text-amber-600 dark:text-amber-300";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-center gap-2 border-b px-4 py-2 text-xs font-medium ${tone}`}
    >
      <AlertTriangle className={`h-4 w-4 shrink-0 ${iconTone}`} />
      <div className="min-w-0 flex-1">
        <strong className="mr-1">{title}.</strong>
        <span className="opacity-90">{description}</span>
      </div>
      <Button
        variant={isExpired ? "destructive" : "default"}
        size="sm"
        className="h-7 shrink-0 gap-1.5 px-2.5 text-xs"
        onClick={() => void openBilling()}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
        Revisar pagamento
      </Button>
    </div>
  );
}
