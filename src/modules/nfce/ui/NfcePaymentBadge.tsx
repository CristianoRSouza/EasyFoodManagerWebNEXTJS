import { Badge } from "@/shared/ui/primitives/badge";
import { paymentMethodLabel } from "../domain/nfce-formatters";
import { paymentMethodColor } from "./nfce-badge-colors";

interface Props {
  code: string;
}

export function NfcePaymentBadge({ code }: Props) {
  return (
    <Badge className={`${paymentMethodColor(code)} border-0 text-xs`} aria-label={paymentMethodLabel(code)}>
      {paymentMethodLabel(code)}
    </Badge>
  );
}
