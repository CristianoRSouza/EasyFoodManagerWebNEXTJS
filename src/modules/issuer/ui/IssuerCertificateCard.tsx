import { Shield } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { EditableInfoRow } from "@/shared/ui/issuer-sections/EditableInfoRow";
import { InfoRow } from "@/shared/ui/issuer-sections/InfoRow";
import { IssuerFieldGrid } from "@/shared/ui/issuer-sections/IssuerFieldGrid";
import { IssuerSectionCard } from "@/shared/ui/issuer-sections/IssuerSectionCard";
import { formatDate, formatDateTime } from "@/shared/format/date-time";
import { certificateDaysLeft, isCertificateExpired, isCertificateUrgent, type NfceIssuerConfig } from "../domain/nfce-issuer-config";
import type { IssuerEditDraft } from "../domain/issuer-edit-draft";

const I = InfoRow;
const E = EditableInfoRow;

interface IssuerCertificateCardProps {
  config: NfceIssuerConfig;
  editing: boolean;
  draft: IssuerEditDraft;
  onFieldChange: (field: string, value: string) => void;
}

/**
 * "Certificado Digital" — cópia fiel do legado (leitura e edição).
 *
 * INVARIANTE 2: `certificate_password` nunca é lido (nem no view — o legado também não o exibe
 * fora da edição) e sempre abre vazio em edição; se deixado em branco, `buildIssuerUpdatePayload`
 * omite a chave do PATCH (não apaga a senha já gravada).
 *
 * Caminho de origem, data de exportação e flags: no legado 1.3.12 (PR #37) o aviso "sem dados na
 * nuvem" só vale no caminho Supabase direto (`fiscalDaLojaSemFonte`); a nuvem do Next é sempre a
 * EasyFood API, que entrega esses campos — então o aviso nunca aparece aqui.
 */
export function IssuerCertificateCard({ config, editing, draft, onFieldChange }: IssuerCertificateCardProps) {
  const certificateExpired = isCertificateExpired(config.certificateValidUntil);
  const certDaysLeft = certificateDaysLeft(config.certificateValidUntil);

  return (
    <IssuerSectionCard
      icon={<Shield />}
      title="Certificado Digital"
      titleExtra={
        !editing && certDaysLeft != null ? (
          <Badge variant={certificateExpired || isCertificateUrgent(certDaysLeft) ? "destructive" : "outline"} className="ml-2 text-[10px] font-normal">
            {certificateExpired ? "Expirado" : `Expira em ${certDaysLeft} dias`}
          </Badge>
        ) : null
      }
    >
      <IssuerFieldGrid variant="threeCols">
        {editing ? (
          <>
            <div>
              <E
                label="Titular"
                value={draft.certificate_holder_name ?? ""}
                field="certificate_holder_name"
                onChange={onFieldChange}
                maxLength={100}
              />
              <E
                label="CNPJ do Titular"
                value={draft.certificate_holder_cnpj ?? ""}
                field="certificate_holder_cnpj"
                onChange={onFieldChange}
                maxLength={20}
              />
              <E
                label="Autoridade Cert."
                value={draft.certificate_authority_name ?? ""}
                field="certificate_authority_name"
                onChange={onFieldChange}
                maxLength={100}
              />
              <E label="Série" value={draft.certificate_series ?? ""} field="certificate_series" onChange={onFieldChange} maxLength={100} />
            </div>
            <div>
              <E label="Tipo" value={draft.certificate_type ?? ""} field="certificate_type" onChange={onFieldChange} type="number" />
              <E
                label="Caminho PFX"
                value={draft.certificate_pfx_relative_path ?? ""}
                field="certificate_pfx_relative_path"
                onChange={onFieldChange}
                maxLength={256}
              />
              <E
                label="Caminho Origem"
                value={draft.certificate_source_path ?? ""}
                field="certificate_source_path"
                onChange={onFieldChange}
                maxLength={256}
              />
              <E
                label="Senha PFX"
                value={draft.certificate_password ?? ""}
                field="certificate_password"
                onChange={onFieldChange}
                maxLength={100}
              />
            </div>
            <div>
              <E
                label="Flag Crypto Lib"
                value={draft.crypto_library_flag ?? ""}
                field="crypto_library_flag"
                onChange={onFieldChange}
                maxLength={1}
              />
              <E
                label="Flag Acesso Cert."
                value={draft.certificate_access_flag ?? ""}
                field="certificate_access_flag"
                onChange={onFieldChange}
                maxLength={1}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <I label="Titular" value={config.certificateHolderName} />
              <I label="CNPJ do Titular" value={config.certificateHolderCnpj} mono />
              <I label="Autoridade Certificadora" value={config.certificateAuthorityName} />
              <I label="Série" value={config.certificateSeries} mono />
            </div>
            <div>
              <I label="Tipo" value={config.certificateType != null ? String(config.certificateType) : null} />
              <I label="Caminho PFX" value={config.certificatePfxRelativePath} mono />
              <I label="Caminho Origem" value={config.certificateSourcePath} mono />
              <I
                label="Exportado em"
                value={config.certificateExportedAt ? formatDateTime(config.certificateExportedAt) : null}
              />
            </div>
            <div>
              <I
                label="Válido até"
                value={
                  config.certificateValidUntil ? (
                    <Badge variant={certificateExpired ? "destructive" : "outline"} className="text-xs">
                      {formatDate(config.certificateValidUntil)}
                    </Badge>
                  ) : null
                }
              />
              <I label="Flag Crypto Lib" value={config.cryptoLibraryFlag} />
              <I label="Flag Acesso Cert." value={config.certificateAccessFlag} />
            </div>
          </>
        )}
      </IssuerFieldGrid>
    </IssuerSectionCard>
  );
}
