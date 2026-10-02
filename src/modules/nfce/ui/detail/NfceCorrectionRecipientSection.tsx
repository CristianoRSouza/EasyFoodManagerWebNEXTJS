import { User } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import type { NfceCorrectionForm } from "./use-nfce-correction-form";
import { SectionCard } from "./NfceDetailPrimitives";
import { formatCnpjMask, formatCpfMask } from "./nfce-detail-labels";

/** Aba "Correção", seção "Destinatário (editável)" — cópia fiel do legado. */
export function NfceCorrectionRecipientSection({ form }: { form: NfceCorrectionForm }) {
  return (
    <SectionCard icon={<User className="h-4 w-4 text-primary" />} title="Destinatário (editável)">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>CPF</Label>
          <Input value={form.recipientCpf} onChange={(e) => form.setRecipientCpf(formatCpfMask(e.target.value))} maxLength={14} />
        </div>
        <div className="space-y-1.5">
          <Label>CNPJ</Label>
          <Input value={form.recipientCnpj} onChange={(e) => form.setRecipientCnpj(formatCnpjMask(e.target.value))} maxLength={18} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Nome</Label>
          <Input value={form.recipientName} onChange={(e) => form.setRecipientName(e.target.value)} maxLength={60} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>E-mail</Label>
          <Input value={form.recipientEmail} onChange={(e) => form.setRecipientEmail(e.target.value)} maxLength={60} />
        </div>
      </div>
    </SectionCard>
  );
}
