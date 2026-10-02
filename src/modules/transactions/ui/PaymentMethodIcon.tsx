import { Banknote, CreditCard, QrCode, Ticket } from "lucide-react";
import type { PaymentMethodKey } from "../domain/transaction";

export function PaymentMethodIcon({ method }: { method: PaymentMethodKey }) {
  if (method === "pix") return <QrCode className="h-4 w-4" />;
  if (method === "cash") return <Banknote className="h-4 w-4" />;
  if (method === "meal_voucher" || method === "food_voucher") return <Ticket className="h-4 w-4" />;
  return <CreditCard className="h-4 w-4" />;
}
