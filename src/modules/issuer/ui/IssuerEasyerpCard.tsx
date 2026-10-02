import { Cloud } from "lucide-react";
import { EditableInfoRow } from "@/shared/ui/issuer-sections/EditableInfoRow";
import { InfoRow } from "@/shared/ui/issuer-sections/InfoRow";
import { IssuerFieldGrid } from "@/shared/ui/issuer-sections/IssuerFieldGrid";
import { IssuerSectionCard } from "@/shared/ui/issuer-sections/IssuerSectionCard";
import type { IssuerEditDraft } from "../domain/issuer-edit-draft";
import type { NfceIssuerConfig } from "../domain/nfce-issuer-config";

const I = InfoRow;
const E = EditableInfoRow;

interface IssuerEasyerpCardProps {
  config: NfceIssuerConfig;
  editing: boolean;
  draft: IssuerEditDraft;
  onFieldChange: (field: string, value: string) => void;
}

/**
 * "Identificação EasyERP (Nuvem)" — cópia fiel do legado (leitura e edição).
 *
 * INVARIANTE 2: em leitura, `apikeyEasyerp` nunca é exibido. Em edição, o campo sempre abre vazio
 * (`draftFromConfig`); a dica "chave já existe" usa `config.easyerpApiKeySet` diretamente — como a
 * API nunca devolve o valor em claro (`apikeyEasyerp` é sempre `null` por aqui), essa flag sozinha
 * já equivale à condição do legado (`!cfg.apikey_easyerp?.trim() && cfg.easyerp_api_key_set`).
 */
export function IssuerEasyerpCard({ config, editing, draft, onFieldChange }: IssuerEasyerpCardProps) {
  return (
    <IssuerSectionCard
      icon={<Cloud />}
      title="Identificação EasyERP (Nuvem)"
      description={
        <>
          Identificadores que vinculam este emitente à empresa/loja no Supabase multitenant (UUIDs + API key). Utilizados pelo módulo
          de licenciamento e futuras integrações com a nuvem. A API Key guarda-se cifrada na BD; no browser, a Admin API precisa de{" "}
          <span className="font-mono text-[10px]">SENSITIVE_SECRET_MASTER_KEY_BASE64</span> (igual ao Sync-Service) para descifrar e
          mostrar o valor ao editar.
        </>
      }
    >
      {editing ? (
        <IssuerFieldGrid variant="threeColsCompact">
          <E label="Company ID" value={draft.companyid_easyerp ?? ""} field="companyid_easyerp" onChange={onFieldChange} maxLength={36} />
          <E label="Store ID" value={draft.storeid_easyerp ?? ""} field="storeid_easyerp" onChange={onFieldChange} maxLength={36} />
          <div className="space-y-1">
            <E label="API Key" value={draft.apikey_easyerp ?? ""} field="apikey_easyerp" onChange={onFieldChange} maxLength={255} />
            {config.easyerpApiKeySet ? (
              <p className="text-[10px] text-muted-foreground leading-snug">
                Chave já existe cifrada na BD. Deixe em branco para manter; preencha só para substituir.
              </p>
            ) : null}
          </div>
        </IssuerFieldGrid>
      ) : (
        <IssuerFieldGrid variant="threeColsCompact">
          <I label="Company ID" value={config.companyIdEasyerp} mono />
          <I label="Store ID" value={config.storeIdEasyerp} mono />
          <I
            label="API Key"
            value={
              config.apikeyEasyerp?.trim() ? (
                "•••••••• (definida)"
              ) : config.easyerpApiKeyOrigem === "loja" ? (
                // A chave mora cifrada só na loja; a nuvem sabe apenas que existe (legado 1.3.12, PR #37).
                "•••••••• (definida na loja)"
              ) : config.easyerpApiKeySet ? (
                <span className="inline-block text-right">
                  <span className="block">•••••••• (definida na BD)</span>
                  {/* A rota da API nunca devolve o valor em claro, de propósito; só é problema quando a
                      chave de cifragem falta no servidor. */}
                  {config.issuerSensitiveSecretsReady === false ? (
                    <span className="block text-[10px] font-normal text-muted-foreground mt-1 leading-snug">
                      Falta SENSITIVE_SECRET_* no .env da API para editar este valor.
                    </span>
                  ) : null}
                </span>
              ) : null
            }
          />
        </IssuerFieldGrid>
      )}
    </IssuerSectionCard>
  );
}
