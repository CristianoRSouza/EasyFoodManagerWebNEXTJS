import { KeyRound, Pencil, Save, X } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { envLabel, formatCnpj, taxRegimeLabel } from "@/shared/ui/issuer-sections/helpers";
import { certificateDaysLeft, isCertificateExpired, isCertificateUrgent, type NfceIssuerConfig } from "../domain/nfce-issuer-config";

/**
 * Card de status do emitente (nome, CNPJ, badges de ativo/ambiente/certificado, ações de edição).
 *
 * Cópia fiel do cabeçalho de `LEGACY/src/pages/NfceIssuerConfigPage.tsx`. O legado só mostra
 * "Editar" com `isElectron()` (Electron desktop) — o Next não tem esse app; `canEdit` (aqui,
 * `backend === "lan"`, decidido em `use-issuer-page.ts`) ocupa o mesmo papel: onde antes só o
 * Electron local podia gravar, agora é o backend "lan" que grava (mesma
 * `PATCH /v1/nfce/issuer-config/:id` que o legado já usa via Admin API).
 */
export function IssuerStatusHeader({
  config,
  canEdit,
  editing,
  saving,
  onEdit,
  onCancel,
  onSave,
}: {
  config: NfceIssuerConfig;
  canEdit: boolean;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const certificateExpired = isCertificateExpired(config.certificateValidUntil);
  const certDaysLeft = certificateDaysLeft(config.certificateValidUntil);

  return (
    <Card className="glass-panel border-l-4 border-l-primary">
      <CardContent className="py-4 px-3 sm:px-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold leading-tight truncate">{config.tradeName || config.companyName}</h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 break-words">
              CNPJ: {formatCnpj(config.cnpj)}
              {taxRegimeLabel(config.taxRegimeCode) ? ` · ${taxRegimeLabel(config.taxRegimeCode)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={config.isActive ? "default" : "secondary"} className="text-xs">
              {config.isActive ? "✓ Ativo" : "Inativo"}
            </Badge>
            <Badge variant={config.environment === 1 ? "destructive" : "outline"} className="text-xs">
              {envLabel(config.environment)}
            </Badge>
            {certDaysLeft != null && (
              <Badge variant={certificateExpired || isCertificateUrgent(certDaysLeft) ? "destructive" : "outline"} className="text-xs">
                <KeyRound className="h-3 w-3 mr-1" />
                {certificateExpired ? "Cert. expirado" : `Cert. ${certDaysLeft}d`}
              </Badge>
            )}
            {canEdit && !editing && (
              <Button variant="outline" size="sm" onClick={onEdit} className="md:ml-2">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Editar
              </Button>
            )}
            {editing && (
              <>
                <Button variant="outline" size="sm" onClick={onCancel} disabled={saving} className="flex-1 md:flex-none">
                  <X className="mr-1.5 h-3.5 w-3.5" /> Cancelar
                </Button>
                <Button size="sm" onClick={onSave} disabled={saving} className="flex-1 md:flex-none">
                  <Save className="mr-1.5 h-3.5 w-3.5" /> {saving ? "Salvando..." : "Salvar"}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
