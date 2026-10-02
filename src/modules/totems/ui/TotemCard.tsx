"use client";

import { memo, useState } from "react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { Monitor, Pencil, History, CheckCircle2, XCircle, Activity, AlertTriangle, RefreshCcw } from "lucide-react";
import { LicensePlanBadge } from "@/shared/license/LicensePlanBadge";
import { effectiveTotemIsActive, hasActiveTotemLicense } from "@/shared/license/totem-license-display";
import { formatDate, formatDateTime } from "@/shared/format/date-time";
import { TotemStatusSwitch } from "./TotemStatusSwitch";
import type { TotemConfig } from "../domain/totem-config";

function formatLicenseStatusLabel(status: string): string {
  const map: Record<string, string> = { active: "Ativa", suspended: "Suspensa", cancelled: "Cancelada", expired: "Expirada" };
  return map[status] ?? status;
}

interface TotemCardProps {
  totem: TotemConfig;
  licenseLabelMap: Map<string, string>;
  showLocalLicenseHint?: boolean;
  showRequeueButton?: boolean;
  requeueToCloud?: boolean;
  lockActiveToggle?: boolean;
  onEdit: () => void;
  onAudit: () => void;
  onToggle: (v: boolean) => Promise<void> | Promise<boolean>;
  onRequeueSync?: () => Promise<void> | void;
}

/** Cópia fiel do componente `TotemCard` inline de `LEGACY/src/pages/TotemConfigPage.tsx`. */
export const TotemCard = memo(function TotemCard({
  totem: t,
  licenseLabelMap,
  showLocalLicenseHint = false,
  showRequeueButton = false,
  requeueToCloud = false,
  lockActiveToggle = false,
  onEdit,
  onAudit,
  onToggle,
  onRequeueSync,
}: TotemCardProps) {
  const [requeueing, setRequeueing] = useState(false);
  const handleRequeueClick = async () => {
    if (!onRequeueSync) return;
    setRequeueing(true);
    try {
      await onRequeueSync();
    } finally {
      setRequeueing(false);
    }
  };
  const licensed = hasActiveTotemLicense(t);
  const operacional = effectiveTotemIsActive(t);
  const licenseDisplayLabel = licensed && t.license_id != null ? licenseLabelMap.get(t.license_id) ?? null : null;
  const showLicenseBadge = licensed && Boolean(licenseDisplayLabel || t.license_type?.trim() || t.plan_slug?.trim());
  const nfceEnvLabel = t.nfce_environment === 1 ? "Produção" : t.nfce_environment === 2 ? "Homologação" : null;

  return (
    <Card className={`transition-all ${!operacional ? "opacity-50" : ""}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`flex items-center justify-center h-11 w-11 rounded-xl shrink-0 ${operacional ? "bg-primary/15" : "bg-muted"}`}>
              <Monitor className={`h-5 w-5 ${operacional ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold font-mono text-sm sm:text-base break-all">{t.totem_name}</p>
              {t.nfce_service_url ? (
                <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5" title={t.nfce_service_url}>
                  NFC-e: {t.nfce_service_url}
                </p>
              ) : null}
              {t.tef_http_base_url ? (
                <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5" title={t.tef_http_base_url}>
                  TEF: {t.tef_http_base_url}
                </p>
              ) : null}
              {t.nfce_serie != null || nfceEnvLabel ? (
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  Fiscal:
                  {t.nfce_serie != null ? (
                    <>
                      {" "}
                      série <span className="font-mono">{t.nfce_serie}</span>
                    </>
                  ) : null}
                  {nfceEnvLabel ? <> · {nfceEnvLabel}</> : null}
                </p>
              ) : null}
              <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 flex-wrap">
                {t.is_active ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" /> Inativo
                  </span>
                )}
                {showLicenseBadge ? (
                  <LicensePlanBadge licenseType={t.license_type} planSlug={t.plan_slug} displayLabel={licenseDisplayLabel} />
                ) : showLocalLicenseHint ? (
                  <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Sem licença no PG local
                  </span>
                ) : null}
                {licensed && t.license_status && t.license_status !== "active" ? (
                  <Badge variant="destructive" className="text-[10px]">
                    {formatLicenseStatusLabel(t.license_status)}
                  </Badge>
                ) : null}
                {licensed && t.license_expires_at ? (
                  <span className="text-[11px] text-muted-foreground">Expira em {formatDate(t.license_expires_at)}</span>
                ) : licensed && t.license_status === "active" ? (
                  <span className="text-[11px] text-muted-foreground">Sem expiração</span>
                ) : null}
                {t.last_heartbeat_at ? (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground" title={t.heartbeat_machine_id ?? undefined}>
                    <Activity className="h-3 w-3" />
                    <span className="hidden sm:inline">Heartbeat: </span>
                    {formatDateTime(t.last_heartbeat_at)}
                  </span>
                ) : null}
                <span className="text-[11px] text-muted-foreground">Criado em {formatDate(t.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
            <TotemStatusSwitch
              isActive={operacional}
              totemName={t.totem_name}
              disabled={lockActiveToggle}
              disabledTitle="Licença paga: ativar/desativar só no portal web (Admin nuvem)"
              onToggle={onToggle}
            />
            <div className="hidden sm:block w-px h-7 bg-border mx-1" />
            <div className="flex items-center gap-1">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit} aria-label="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onAudit} aria-label="Histórico">
                      <History className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Histórico</TooltipContent>
                </Tooltip>
                {showRequeueButton && onRequeueSync ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={handleRequeueClick}
                        disabled={requeueing}
                        aria-label={requeueToCloud ? "Forçar sincronização PG → nuvem" : "Forçar re-sincronização ao PG local"}
                      >
                        <RefreshCcw className={`h-4 w-4 ${requeueing ? "animate-spin" : ""}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {requeueToCloud ? "Outbox PG local → nuvem (Sync PG-SB)." : "Outbox nuvem → PG local (reentrega)."}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
