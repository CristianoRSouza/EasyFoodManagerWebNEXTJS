"use client";

import Link from "next/link";
import {
  Server, Pencil, History, Shield, RefreshCw, Globe, CheckCircle2, XCircle, FileText, Settings2,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Badge } from "@/shared/ui/primitives/badge";
import { Button } from "@/shared/ui/primitives/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { formatMs } from "../domain/agent-config";
import { AgentStatusSwitch } from "./AgentStatusSwitch";
import type { AgentConfig } from "../domain/agent-config";

/** Cópia fiel de `pages/AgentConfigPage.tsx#AgentCard`. */
export function AgentCard({ agent: a, onEdit, onAudit, onToggle }: {
  agent: AgentConfig;
  onEdit: () => void;
  onAudit: () => void;
  onToggle: (v: boolean) => Promise<void>;
}) {
  return (
    <Card className={`transition-all ${!a.is_active ? "opacity-50" : ""}`}>
      <CardContent className="p-4 sm:p-5">
        {/* Row 1: Name + Status + Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex items-center justify-center h-11 w-11 rounded-xl shrink-0 ${
              a.is_active ? "bg-primary/15" : "bg-muted"
            }`}>
              <Server className={`h-5 w-5 ${a.is_active ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <p className="font-bold font-mono text-sm sm:text-base break-all">{a.agent_name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {a.is_active ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <XCircle className="h-3.5 w-3.5" /> Inativo
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 sm:shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
            <AgentStatusSwitch isActive={a.is_active} agentName={a.agent_name} onToggle={onToggle} />
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
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Row 2: Detail grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 py-3 border-t border-border/40">
          {/* Escopo fiscal (no totem) */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate">Escopo fiscal</span>
            </div>
            <p className="text-sm text-muted-foreground">No totem vinculado</p>
            <p className="text-[10px] text-muted-foreground">
              Série, tpAmb e numeração → Configurações → Totens
            </p>
          </div>

          {/* SEFAZ / Retry */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate">SEFAZ / Retry</span>
            </div>
            <p className="text-sm font-semibold">{formatMs(a.sefaz_timeout_ms)}</p>
            <p className="text-xs text-muted-foreground break-words">
              {a.retry_max_attempts} tentativa{a.retry_max_attempts !== 1 ? "s" : ""} · {formatMs(a.retry_backoff_ms)} backoff
            </p>
          </div>

          {/* API / Log */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Settings2 className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate">API / Log</span>
            </div>
            <p className="text-sm font-semibold">{a.api_rate_limit} <span className="text-xs font-normal text-muted-foreground">req/min</span></p>
            <Badge variant="outline" className="text-[11px] uppercase mt-0.5">{a.log_level}</Badge>
          </div>

          {/* Contingência */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate">Contingência</span>
            </div>
            {a.contingency_enabled ? (
              <>
                <Badge variant="destructive" className="text-xs">Ativa</Badge>
                {a.contingency_reason && (
                  <p className="text-xs text-muted-foreground truncate" title={a.contingency_reason}>{a.contingency_reason}</p>
                )}
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {a.contingency_auto_transmit && <Badge variant="outline" className="text-[10px]">Auto-transmitir</Badge>}
                  {a.contingency_worker_enabled && <Badge variant="outline" className="text-[10px]">Worker</Badge>}
                  {a.contingency_substitution_worker_enabled && <Badge variant="outline" className="text-[10px]">Substituição</Badge>}
                </div>
                {(a.contingency_sla_warn_hours > 0 || a.contingency_sla_block_hours > 0) && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    SLA: {a.contingency_sla_warn_hours > 0 ? `alerta ${a.contingency_sla_warn_hours}h` : ""}
                    {a.contingency_sla_warn_hours > 0 && a.contingency_sla_block_hours > 0 ? " · " : ""}
                    {a.contingency_sla_block_hours > 0 ? `bloqueio ${a.contingency_sla_block_hours}h` : ""}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Desativada</p>
                {a.contingency_auto_transmit && <Badge variant="outline" className="text-[10px] mt-0.5">Auto-transmitir</Badge>}
              </>
            )}
          </div>

          {/* Sync */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate">Sincronização</span>
            </div>
            {a.sync_service_enabled ? (
              <>
                <Badge variant="secondary" className="text-xs">Habilitado</Badge>
                {a.sync_service_url && (
                  <p className="text-[11px] text-muted-foreground font-mono truncate" title={a.sync_service_url}>{a.sync_service_url}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Desabilitado</p>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-border/40 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground leading-snug">
            Runtime do nfce-service (<span className="font-mono text-[10px]">.env</span>, instalação, serviço Windows):{" "}
            <Link href="/" className="text-primary font-medium underline-offset-2 hover:underline">
              Dashboard
            </Link>
            . Fiscal de emissão (série/tpAmb) fica no totem.
          </p>
          <span className="text-[11px] sm:text-xs text-muted-foreground sm:shrink-0">
            Atualizado em {new Date(a.updated_at).toLocaleDateString("pt-BR")}{" "}
            {new Date(a.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
