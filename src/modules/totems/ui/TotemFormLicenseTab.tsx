"use client";

import { Badge } from "@/shared/ui/primitives/badge";
import { Label } from "@/shared/ui/primitives/label";
import { AlertTriangle, KeyRound, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { LicensePlanBadge } from "@/shared/license/LicensePlanBadge";
import { formatDate } from "@/shared/format/date-time";
import type { TotemConfig } from "../domain/totem-config";
import type { TotemFormState } from "./use-totem-form-state";

interface Props {
  state: TotemFormState;
  totem: TotemConfig | null;
  cloudMode: boolean;
  localLicenseReadOnly: boolean;
  licenseLabelMap: Map<string, string>;
}

/** Aba "Licença" — cópia fiel de `LEGACY/src/components/totem/TotemFormDialog.tsx` (linhas 785-931). */
export function TotemFormLicenseTab({ state, totem, cloudMode, localLicenseReadOnly, licenseLabelMap }: Props) {
  const { currentLicense, selectableLicenses, selectedLicenseId, setSelectedLicenseId, selectedLicense, errors, licensePoolMode } = state;

  return (
    <div className="m-0 space-y-4 px-4 py-4 sm:px-6 sm:py-5">
      <div className="space-y-1 pb-1">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> Licença vinculada
        </h3>
        <p className="text-[11px] text-muted-foreground leading-snug">
          {localLicenseReadOnly && !licensePoolMode
            ? "Dados espelhados de billing.device_licenses (Supabase) em public.totem_licenses pelo serviço Sync PG-SB. Alterações de plano fazem-se na nuvem."
            : cloudMode
              ? "Cada totem ocupa uma licença do plano da empresa. Trocar a licença libera a anterior automaticamente."
              : "Slots do plano sincronizados da nuvem em public.totem_licenses (Sync PG-SB). Vincule um slot livre antes de ativar o totem."}
        </p>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-none">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-3 py-2">
          <CardTitle className="text-xs font-semibold">Licença atual</CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-3">
          {localLicenseReadOnly && !cloudMode ? (
            totem?.license_status || totem?.license_type ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 font-mono text-[11px]">{totem?.totem_name}</Badge>
                  {totem?.license_id || totem?.license_type || totem?.plan_slug ? (
                    <LicensePlanBadge
                      licenseType={totem.license_type}
                      planSlug={totem.plan_slug}
                      displayLabel={totem.license_id ? licenseLabelMap.get(totem.license_id) ?? null : null}
                    />
                  ) : null}
                  {totem?.license_status ? <Badge variant="outline" className="text-[10px]">{totem.license_status}</Badge> : null}
                </div>
                {totem?.license_expires_at ? (
                  <p className="text-[11px] text-muted-foreground">Expira em {formatDate(totem.license_expires_at)}</p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Sem data de expiração</p>
                )}
                {totem?.max_transactions_month != null ? (
                  <p className="text-[11px] text-muted-foreground">Limite mensal: {totem.max_transactions_month} transações</p>
                ) : null}
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Nenhuma linha em totem_licenses para este totem. Confirme o Sync PG-SB e alterações no Admin nuvem.</span>
              </div>
            )
          ) : currentLicense ? (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 font-mono text-[11px]">
                  {currentLicense.device_key || currentLicense.id.slice(0, 8)}
                </Badge>
                <LicensePlanBadge licenseType={currentLicense.license_type} planSlug={currentLicense.plan_slug} displayLabel={licenseLabelMap.get(currentLicense.id) ?? null} />
                <Badge variant="outline" className="text-[10px]">{currentLicense.status}</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">Esta é a licença atualmente vinculada a este totem.</p>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Nenhuma licença vinculada — selecione uma abaixo. O totem permanecerá inativo enquanto não houver licença.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {licensePoolMode && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Trocar / vincular licença</Label>
            <Select value={selectedLicenseId ?? ""} onValueChange={(v) => setSelectedLicenseId(v || null)}>
              <SelectTrigger className={`${errors.license ? "border-destructive" : ""}`}>
                <SelectValue placeholder={selectableLicenses.length === 0 ? "Nenhum slot livre — confira Sync PG-SB ou plano" : "Selecione uma licença"} />
              </SelectTrigger>
              <SelectContent>
                {selectableLicenses.map((lic) => {
                  const isCurrent = lic.totem_config_id === totem?.id;
                  const friendly = licenseLabelMap.get(lic.id) ?? (lic.device_key || lic.id.slice(0, 8));
                  return (
                    <SelectItem key={lic.id} value={lic.id}>
                      {friendly}
                      {isCurrent ? " (atual)" : lic.totem_config_id ? " (em uso)" : " — livre"}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.license && (
              <p className="flex items-center gap-1 text-[11px] text-destructive">
                <XCircle className="h-3 w-3 shrink-0" /> {errors.license}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Apenas slots livres aparecem na lista (além da licença atual). Adquira mais slots em
              <span className="font-medium"> Planos</span> se precisar.
            </p>
          </div>

          {selectedLicense && selectedLicense.id !== currentLicense?.id && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-[11px]">
              <p className="font-medium text-primary">Alteração pendente</p>
              <p className="text-muted-foreground mt-0.5">
                Ao salvar, a licença <span className="font-mono">{selectedLicense.device_key}</span> será vinculada a este totem
                {currentLicense ? (
                  <>
                    {" "}
                    e <span className="font-mono">{currentLicense.device_key}</span> ficará livre.
                  </>
                ) : (
                  "."
                )}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
