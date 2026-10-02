import { Building2, Calendar, FileText, MapPin } from "lucide-react";
import { EditableInfoRow } from "@/shared/ui/issuer-sections/EditableInfoRow";
import { InfoRow } from "@/shared/ui/issuer-sections/InfoRow";
import { IssuerFieldGrid } from "@/shared/ui/issuer-sections/IssuerFieldGrid";
import { IssuerSectionCard } from "@/shared/ui/issuer-sections/IssuerSectionCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { envLabel, formatCep, formatCnpj, taxRegimeLabel } from "@/shared/ui/issuer-sections/helpers";
import { formatDateTime } from "@/shared/format/date-time";
import type { IssuerEditDraft } from "../domain/issuer-edit-draft";
import type { NfceIssuerConfig } from "../domain/nfce-issuer-config";

const I = InfoRow;
const E = EditableInfoRow;

interface IssuerMainGridProps {
  config: NfceIssuerConfig;
  editing: boolean;
  draft: IssuerEditDraft;
  onFieldChange: (field: string, value: string) => void;
}

/**
 * "Dados da Empresa" + "Endereço" + "NFC-e / NF-e" + "Metadados" — o grid principal de 3 colunas
 * do emitente. Cópia fiel do legado (leitura e edição), inclusive o `<Select>` de CRT.
 */
export function IssuerMainGrid({ config, editing, draft, onFieldChange }: IssuerMainGridProps) {
  return (
    <IssuerFieldGrid variant="mainSections">
      <IssuerSectionCard icon={<Building2 />} title="Dados da Empresa">
        {editing ? (
          <>
            <E label="CNPJ" value={draft.cnpj ?? ""} field="cnpj" onChange={onFieldChange} maxLength={14} />
            <E label="Razão Social" value={draft.company_name ?? ""} field="company_name" onChange={onFieldChange} maxLength={60} />
            <E label="Nome Fantasia" value={draft.trade_name ?? ""} field="trade_name" onChange={onFieldChange} maxLength={60} />
            <E label="Inscrição Estadual" value={draft.state_registration ?? ""} field="state_registration" onChange={onFieldChange} maxLength={14} />
            <E label="IE ST" value={draft.state_registration_st ?? ""} field="state_registration_st" onChange={onFieldChange} maxLength={14} />
            <E
              label="Inscrição Municipal"
              value={draft.municipal_registration ?? ""}
              field="municipal_registration"
              onChange={onFieldChange}
              maxLength={15}
            />
            <E label="CNAE" value={draft.cnae ?? ""} field="cnae" onChange={onFieldChange} maxLength={7} />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 py-1.5 border-b border-border/30 px-1">
              <span className="text-muted-foreground text-[12px] sm:text-[13px] shrink-0">CRT</span>
              <Select value={draft.tax_regime_code ?? ""} onValueChange={(v) => onFieldChange("tax_regime_code", v)}>
                <SelectTrigger className="h-8 w-full sm:max-w-[65%] text-[13px]">
                  <SelectValue placeholder="CRT" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Simples Nacional</SelectItem>
                  <SelectItem value="2">2 — Simples (excesso sublimite)</SelectItem>
                  <SelectItem value="3">3 — Regime Normal</SelectItem>
                  <SelectItem value="4">4 — MEI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <E
              label="Regime PIS/COFINS"
              value={draft.pis_cofins_regime_code ?? ""}
              field="pis_cofins_regime_code"
              onChange={onFieldChange}
              type="number"
            />
            <E label="Telefone" value={draft.phone ?? ""} field="phone" onChange={onFieldChange} maxLength={14} />
            <E label="ID Loja Legado" value={draft.legacy_loja_id ?? ""} field="legacy_loja_id" onChange={onFieldChange} type="number" />
          </>
        ) : (
          <>
            <I label="CNPJ" value={formatCnpj(config.cnpj)} mono />
            <I label="Razão Social" value={config.companyName} />
            <I label="Nome Fantasia" value={config.tradeName} />
            <I label="Inscrição Estadual" value={config.stateRegistration} mono />
            <I label="IE ST" value={config.stateRegistrationSt} mono />
            <I label="Inscrição Municipal" value={config.municipalRegistration} mono />
            <I label="CNAE" value={config.cnae} mono />
            <I label="Regime Tributário" value={taxRegimeLabel(config.taxRegimeCode)} />
            <I label="Regime PIS/COFINS" value={config.pisCofinsRegimeCode != null ? String(config.pisCofinsRegimeCode) : null} />
            <I label="Telefone" value={config.phone} mono />
            <I label="ID Loja Legado" value={config.legacyLojaId != null ? String(config.legacyLojaId) : null} />
          </>
        )}
      </IssuerSectionCard>

      <IssuerSectionCard icon={<MapPin />} title="Endereço">
        {editing ? (
          <>
            <E label="Logradouro" value={draft.street ?? ""} field="street" onChange={onFieldChange} maxLength={60} />
            <E label="Número" value={draft.number ?? ""} field="number" onChange={onFieldChange} maxLength={60} />
            <E label="Complemento" value={draft.complement ?? ""} field="complement" onChange={onFieldChange} maxLength={60} />
            <E label="Bairro" value={draft.neighborhood ?? ""} field="neighborhood" onChange={onFieldChange} maxLength={60} />
            <E label="Cód. Município" value={draft.municipality_code ?? ""} field="municipality_code" onChange={onFieldChange} maxLength={7} />
            <E label="Município" value={draft.municipality_name ?? ""} field="municipality_name" onChange={onFieldChange} maxLength={60} />
            <E label="UF" value={draft.uf ?? ""} field="uf" onChange={onFieldChange} maxLength={2} />
            <E label="CEP" value={draft.zip_code ?? ""} field="zip_code" onChange={onFieldChange} maxLength={8} />
            <E label="Cód. País" value={draft.country_code ?? ""} field="country_code" onChange={onFieldChange} maxLength={4} />
            <E label="País" value={draft.country_name ?? ""} field="country_name" onChange={onFieldChange} maxLength={60} />
          </>
        ) : (
          <>
            <I label="Logradouro" value={config.street} />
            <I label="Número" value={config.number} />
            <I label="Complemento" value={config.complement} />
            <I label="Bairro" value={config.neighborhood} />
            <I label="Município" value={config.municipalityName ? `${config.municipalityName} (${config.municipalityCode})` : null} />
            <I label="UF" value={config.uf} />
            <I label="CEP" value={formatCep(config.zipCode)} mono />
            <I label="País" value={config.countryName ? `${config.countryName} (${config.countryCode})` : null} />
          </>
        )}
      </IssuerSectionCard>

      <div className="space-y-5">
        <IssuerSectionCard icon={<FileText />} title="NFC-e / NF-e">
          {editing ? (
            <>
              <E label="Ambiente (1=Prod, 2=Hom)" value={draft.environment ?? ""} field="environment" onChange={onFieldChange} type="number" />
              <E label="Série NFC-e" value={draft.nfce_serie ?? ""} field="nfce_serie" onChange={onFieldChange} type="number" />
              <E label="Série NF-e" value={draft.nfe_serie ?? ""} field="nfe_serie" onChange={onFieldChange} type="number" />
              <E
                label="Cód. Segurança (CSC)"
                value={draft.nfce_security_code ?? ""}
                field="nfce_security_code"
                onChange={onFieldChange}
                maxLength={100}
              />
              <E
                label="ID do CSC"
                value={draft.nfce_security_code_id ?? ""}
                field="nfce_security_code_id"
                onChange={onFieldChange}
                maxLength={10}
              />
            </>
          ) : (
            <>
              <I label="Ambiente" value={envLabel(config.environment)} />
              <I label="Série NFC-e" value={String(config.nfceSerie)} mono />
              <I label="Série NF-e" value={config.nfeSerie != null ? String(config.nfeSerie) : null} mono />
              <I label="CSC" value={config.nfceSecurityCode} mono />
              <I label="ID do CSC" value={config.nfceSecurityCodeId} mono />
            </>
          )}
        </IssuerSectionCard>

        <IssuerSectionCard icon={<Calendar />} title="Metadados">
          <I label="Criado em" value={formatDateTime(config.createdAt)} />
          <I label="Atualizado em" value={formatDateTime(config.updatedAt)} />
          {editing ? (
            <E label="Observações" value={draft.notes ?? ""} field="notes" onChange={onFieldChange} />
          ) : (
            <I label="Observações" value={config.notes} />
          )}
        </IssuerSectionCard>
      </div>
    </IssuerFieldGrid>
  );
}
