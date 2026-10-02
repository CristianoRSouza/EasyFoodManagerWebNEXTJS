import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Label } from "@/shared/ui/primitives/label";
import { Textarea } from "@/shared/ui/primitives/textarea";
import type { IssuerEditDraft } from "../domain/issuer-edit-draft";
import type { NfceIssuerConfig } from "../domain/nfce-issuer-config";

interface IssuerInfCplCardProps {
  config: NfceIssuerConfig;
  editing: boolean;
  draft: IssuerEditDraft;
  onFieldChange: (field: string, value: string) => void;
}

/** "Textos infCpl (sync Firebird)" — cópia fiel do legado (leitura e edição). */
export function IssuerInfCplCard({ config, editing, draft, onFieldChange }: IssuerInfCplCardProps) {
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2 pt-4 px-3 sm:px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <MessageSquare className="h-4 w-4 text-primary" />
          Textos infCpl (sync Firebird)
        </CardTitle>
        <p className="text-xs text-muted-foreground font-normal normal-case pt-1">
          Mapeamento das chaves TBL_CONFIGURACAO 250 e 251; usados no infCpl quando o CRT é Simples Nacional ou MEI.
        </p>
      </CardHeader>
      <CardContent className="px-3 sm:px-5 pb-4 pt-1">
        {editing ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`inf250-${config.id}`} className="text-[13px] text-muted-foreground">
                Config. 250 (infCpl)
              </Label>
              <Textarea
                id={`inf250-${config.id}`}
                className="min-h-[120px] text-[13px] font-mono"
                value={draft.inf_ad_fb_config_250 ?? ""}
                onChange={(e) => onFieldChange("inf_ad_fb_config_250", e.target.value)}
                placeholder="Texto sincronizado da configuração 250…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`inf251-${config.id}`} className="text-[13px] text-muted-foreground">
                Config. 251 (infCpl)
              </Label>
              <Textarea
                id={`inf251-${config.id}`}
                className="min-h-[120px] text-[13px] font-mono"
                value={draft.inf_ad_fb_config_251 ?? ""}
                onChange={(e) => onFieldChange("inf_ad_fb_config_251", e.target.value)}
                placeholder="Texto sincronizado da configuração 251…"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-[13px] mb-1.5">Config. 250 (infCpl)</p>
              <p className="text-[13px] whitespace-pre-wrap break-words font-mono leading-relaxed">
                {config.infAdFbConfig250?.trim() ? config.infAdFbConfig250 : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[13px] mb-1.5">Config. 251 (infCpl)</p>
              <p className="text-[13px] whitespace-pre-wrap break-words font-mono leading-relaxed">
                {config.infAdFbConfig251?.trim() ? config.infAdFbConfig251 : "—"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
