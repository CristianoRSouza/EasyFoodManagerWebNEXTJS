import { Building2, User } from "lucide-react";
import { Separator } from "@/shared/ui/primitives/separator";
import type { NfceIssuerDetail, NfceRecipientDetail } from "../../domain/nfce-detail";
import { crtLabel, formatCnpj, formatCpf } from "../../domain/nfce-formatters";
import { InfoRow, SectionCard } from "./NfceDetailPrimitives";
import { ieIndicadorLabel } from "./nfce-detail-labels";

function IssuerCard({ issuer }: { issuer: NfceIssuerDetail }) {
  return (
    <SectionCard icon={<Building2 className="h-4 w-4 text-primary" />} title="Emitente">
      <p className="font-semibold text-sm">{issuer.companyName}</p>
      {issuer.tradeName && <p className="text-xs text-muted-foreground">{issuer.tradeName}</p>}
      <Separator className="my-2" />
      <InfoRow label="CNPJ" value={formatCnpj(issuer.cnpj)} mono />
      <InfoRow label="IE" value={issuer.stateRegistration} mono />
      {issuer.municipalRegistration && <InfoRow label="IM" value={issuer.municipalRegistration} mono />}
      <InfoRow label="CRT" value={issuer.taxRegimeCode != null ? `${issuer.taxRegimeCode} – ${crtLabel(issuer.taxRegimeCode)}` : "—"} />
      {issuer.cnae && <InfoRow label="CNAE" value={issuer.cnae} mono />}
      <Separator className="my-2" />
      <div className="text-sm text-muted-foreground leading-relaxed">
        {[issuer.street, issuer.number].filter(Boolean).join(", ")}
        {issuer.complement && ` – ${issuer.complement}`}
        <br />
        {[issuer.neighborhood, issuer.municipality, issuer.uf].filter(Boolean).join(" – ")}
        {issuer.zipCode && ` CEP ${issuer.zipCode}`}
        {issuer.phone && (
          <>
            <br />
            Fone: {issuer.phone}
          </>
        )}
      </div>
    </SectionCard>
  );
}

function RecipientCard({ recipient }: { recipient: NfceRecipientDetail | null }) {
  return (
    <SectionCard icon={<User className="h-4 w-4 text-primary" />} title="Destinatário">
      {recipient ? (
        <>
          {recipient.name && <p className="font-semibold text-sm">{recipient.name}</p>}
          <Separator className="my-2" />
          {recipient.cpf && <InfoRow label="CPF" value={formatCpf(recipient.cpf)} mono />}
          {recipient.cnpj && <InfoRow label="CNPJ" value={formatCnpj(recipient.cnpj)} mono />}
          {recipient.email && <InfoRow label="E-mail" value={recipient.email} />}
          {recipient.phone && <InfoRow label="Telefone" value={recipient.phone} />}
          {recipient.ieIndicator != null && <InfoRow label="Indicador IE" value={ieIndicadorLabel(recipient.ieIndicator)} />}
          {(recipient.street || recipient.municipality) && (
            <>
              <Separator className="my-2" />
              <div className="text-sm text-muted-foreground leading-relaxed">
                {[recipient.street, recipient.number].filter(Boolean).join(", ")}
                {recipient.complement && ` – ${recipient.complement}`}
                <br />
                {[recipient.neighborhood, recipient.municipality, recipient.uf].filter(Boolean).join(" – ")}
                {recipient.zipCode && ` CEP ${recipient.zipCode}`}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <div className="rounded-full bg-muted/50 p-3">
            <User className="h-6 w-6" />
          </div>
          <span className="text-sm italic">Consumidor não identificado</span>
        </div>
      )}
    </SectionCard>
  );
}

/** Aba Resumo, cartões "Emitente" + "Destinatário" lado a lado — cópia fiel do legado. */
export function NfceIssuerRecipientCards({
  issuer,
  recipient,
}: {
  issuer: NfceIssuerDetail;
  recipient: NfceRecipientDetail | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <IssuerCard issuer={issuer} />
      <RecipientCard recipient={recipient} />
    </div>
  );
}
