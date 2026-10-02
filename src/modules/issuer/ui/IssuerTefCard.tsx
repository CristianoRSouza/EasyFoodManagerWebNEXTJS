import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { Separator } from "@/shared/ui/primitives/separator";
import { Textarea } from "@/shared/ui/primitives/textarea";
import { CloudFieldWarning } from "@/shared/ui/CloudFieldWarning";
import { InfoRow } from "@/shared/ui/issuer-sections/InfoRow";
import type { IssuerEditDraft } from "../domain/issuer-edit-draft";
import { tefSecretLabel, type NfceIssuerConfig } from "../domain/nfce-issuer-config";

interface IssuerTefCardProps {
  config: NfceIssuerConfig;
  isFirst: boolean;
  cloudMode: boolean;
  cloudWarn: string;
  editing: boolean;
  draft: IssuerEditDraft;
  onFieldChange: (field: string, value: string) => void;
}

/**
 * "TEF Aditum (sync Firebird)" — cópia fiel do legado (leitura e edição).
 *
 * INVARIANTE 2 (segredos do emitente nunca em claro): em leitura, `config.aditumTefPartnerToken`/
 * `aditumTefActivationCode` NUNCA são renderizados — `tefSecretLabel` só devolve a máscara
 * ("definido — cifrado na BD" na loja, "definido na loja" na nuvem) ou "—". Desde o legado 1.3.12
 * (PR #38) o indicador `*_encrypted_set` sozinho já conta como definido, e o aviso âmbar de "valor
 * em claro não chegou ao browser" saiu. Em edição, o campo sempre abre vazio (`draftFromConfig` força isto — a API nunca
 * devolve o valor em claro) e, se deixado em branco, `buildIssuerUpdatePayload` OMITE a chave do
 * PATCH (nunca envia para apagar) — ver `ISSUER_SECRET_FIELDS` no domínio.
 */
export function IssuerTefCard({ config, isFirst, cloudMode, cloudWarn, editing, draft, onFieldChange }: IssuerTefCardProps) {
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2 pt-4 px-3 sm:px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <CreditCard className="h-4 w-4 text-primary" />
          TEF Aditum (sync Firebird)
          {cloudMode && <CloudFieldWarning message={cloudWarn} className="normal-case" />}
        </CardTitle>
        <p className="text-xs text-muted-foreground font-normal normal-case pt-1">
          Origem: <span className="font-mono">TBL_CADASTROTERMINAL</span> com{" "}
          <code className="rounded bg-muted/80 px-1 py-0.5 text-[11px]">{"STR_TEF = 'A'"}</code>{" "}
          (token e código de ativação). Preenchido pelo <strong>EasyCommandPay-Sync-Service</strong> para o serviço TEF / pinpad local.
        </p>
      </CardHeader>
      <CardContent className="px-3 sm:px-5 pb-4 pt-1">
        {isFirst && (
          <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border/60 bg-muted/15 px-3 py-2.5 mb-4 leading-relaxed">
            Instalação do worker TEF, arquivo <code className="text-[11px] font-mono bg-muted/80 px-1 rounded">.env</code> e serviço Windows:
            configure no servidor (fora deste painel web).
          </p>
        )}
        {editing ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`aditum-token-${config.id}`} className="text-[13px] text-muted-foreground">
                Token partner (API TEF)
              </Label>
              <Textarea
                id={`aditum-token-${config.id}`}
                className="min-h-[120px] text-[13px] font-mono"
                maxLength={4000}
                value={draft.aditum_tef_partner_token ?? ""}
                onChange={(e) => onFieldChange("aditum_tef_partner_token", e.target.value)}
                placeholder="STR_ADITUM_TOKEN sincronizado do terminal…"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`aditum-ativation-${config.id}`} className="text-[13px] text-muted-foreground">
                Código de ativação (pinpad)
              </Label>
              <Textarea
                id={`aditum-ativation-${config.id}`}
                className="min-h-[80px] text-[13px] font-mono"
                maxLength={256}
                value={draft.aditum_tef_activation_code ?? ""}
                onChange={(e) => onFieldChange("aditum_tef_activation_code", e.target.value)}
                placeholder="STR_ADITUM_CODATIVACAO…"
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-[13px] mb-1.5">Token partner (API TEF)</p>
              <p className="text-[13px] font-mono leading-relaxed">
                {tefSecretLabel(config.aditumTefPartnerToken, config.aditumTefPartnerTokenEncryptedSet, cloudMode)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[13px] mb-1.5">Código de ativação (pinpad)</p>
              <p className="text-[13px] font-mono leading-relaxed">
                {tefSecretLabel(config.aditumTefActivationCode, config.aditumTefActivationCodeEncryptedSet, cloudMode)}
              </p>
            </div>
          </div>
        )}

        <Separator className="my-5" />
        <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-3 space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Admin → serviço TEF (HTTP)</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
              URL e API key gravadas em <span className="font-mono">nfce_issuer_config</span> (migração 042) para o Admin falar com o{" "}
              <span className="font-mono">EasyCommandPay-TEF-Aditum-Service</span> na lista de <strong>Transações</strong>, com prioridade
              sobre totem e <code className="rounded bg-muted/80 px-1 text-[10px]">.env</code>. O teste NFC-e do nfce-service fica no{" "}
              <strong>cadastro do totem</strong>.
            </p>
          </div>
          {editing ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`tef-admin-url-${config.id}`} className="text-[13px] text-muted-foreground">
                  URL base do serviço TEF
                </Label>
                <Input
                  id={`tef-admin-url-${config.id}`}
                  className="font-mono text-xs"
                  value={draft.tef_admin_http_base_url ?? ""}
                  onChange={(e) => onFieldChange("tef_admin_http_base_url", e.target.value.trim())}
                  placeholder="http://127.0.0.1:3090"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`tef-admin-key-${config.id}`} className="text-[13px] text-muted-foreground">
                  X-Api-Key (opcional)
                </Label>
                <Input
                  id={`tef-admin-key-${config.id}`}
                  type="password"
                  className="font-mono text-xs"
                  value={draft.tef_admin_http_api_key ?? ""}
                  onChange={(e) => onFieldChange("tef_admin_http_api_key", e.target.value)}
                  placeholder="HTTP_API_KEY do serviço TEF, se existir"
                  autoComplete="off"
                />
                {config.tefAdminHttpApiKey?.trim() ? (
                  <p className="text-[10px] text-muted-foreground leading-snug">Deixe em branco para manter; preencha só para substituir.</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <InfoRow
                label="URL base TEF (Admin)"
                value={config.tefAdminHttpBaseUrl?.trim() ? config.tefAdminHttpBaseUrl : null}
                mono
              />
              <InfoRow
                label="X-Api-Key TEF"
                value={config.tefAdminHttpApiKey?.trim() || config.tefAdminHttpApiKeySet ? "•••••••• (definida)" : null}
              />
            </div>
          )}
          {/*
            O botão "Testar serviço TEF" do legado não existe aqui: ele chamava o serviço TEF em
            `127.0.0.1` — a máquina de quem abre a tela, não a da loja. Pelo navegador (LAN ou
            nuvem) isso nunca teve como funcionar corretamente (ver comentário original em
            LEGACY/src/pages/NfceIssuerConfigPage.tsx).
          */}
        </div>
      </CardContent>
    </Card>
  );
}
