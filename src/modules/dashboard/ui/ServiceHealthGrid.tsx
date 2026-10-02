"use client";

import { HeartPulse, Wifi, WifiOff, RefreshCw, FileText, Cpu, CloudUpload, Wallet } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { computeSyncHealth, formatElapsed, heartbeatHealth, type HealthLevel, type HealthStatus } from "../domain/service-health";
import type { DashboardStats } from "../domain/dashboard-snapshot";
import { formatDateTime } from "@/shared/format/date-time";

const healthColors: Record<HealthLevel, { bg: string; border: string; text: string; pulse: string }> = {
  healthy: { bg: "bg-success/10", border: "border-success/30", text: "text-success", pulse: "bg-success" },
  warning: { bg: "bg-warning/10", border: "border-warning/30", text: "text-warning", pulse: "bg-warning" },
  critical: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive", pulse: "bg-destructive" },
  unknown: { bg: "bg-muted/10", border: "border-muted-foreground/30", text: "text-muted-foreground", pulse: "bg-muted-foreground" },
};

interface ServiceCard {
  key: "sync" | "sync_pg_sb" | "nfce" | "tef" | "pix_pixnopdv";
  title: string;
  subtitle: string;
  icon: typeof RefreshCw;
  lastPing: string | null;
  health: HealthStatus;
}

/**
 * A grelha de saúde dos serviços da loja (Sync FB→PG, Sync PG→SB, NFC-e, TEF, PIX) — porta 1:1
 * do bloco correspondente em `easyfoodmanagerWEB/src/pages/Dashboard.tsx`. Só existe na loja:
 * a página só renderiza este componente quando `backend === "lan"`.
 */
export function ServiceHealthGrid({ stats }: { stats: DashboardStats }) {
  const syncHealth = computeSyncHealth(stats.lastSuccessSync?.createdAt ?? null, stats.serviceHeartbeats.sync);
  const syncPgSbHealth = heartbeatHealth(stats.serviceHeartbeats.syncPgSb);
  const nfceHealth = heartbeatHealth(stats.serviceHeartbeats.nfce);
  const tefHealth = heartbeatHealth(stats.serviceHeartbeats.tef);
  const pixPixnopdvHealth = heartbeatHealth(stats.serviceHeartbeats.pixPixnopdv);

  const syncLastPingDisplay = stats.serviceHeartbeats.sync ?? stats.lastSuccessSync?.createdAt ?? null;

  /** FB→PG e PG→SB consecutivos para ficarem lado a lado na grelha (2+ colunas). */
  const serviceCards: ServiceCard[] = [
    { key: "sync", title: "Sync (FB → PG)", subtitle: "sync_log + heartbeat", icon: RefreshCw, lastPing: syncLastPingDisplay, health: syncHealth },
    { key: "sync_pg_sb", title: "Sync (PG → SB)", subtitle: "service_name: sync_pg_sb", icon: CloudUpload, lastPing: stats.serviceHeartbeats.syncPgSb, health: syncPgSbHealth },
    { key: "nfce", title: "NFC-e", subtitle: "Serviço de emissão", icon: FileText, lastPing: stats.serviceHeartbeats.nfce, health: nfceHealth },
    { key: "tef", title: "TEF Aditum", subtitle: "Worker + pinpad", icon: Cpu, lastPing: stats.serviceHeartbeats.tef, health: tefHealth },
    { key: "pix_pixnopdv", title: "PIX (Pix no PDV)", subtitle: "service_name: pix-pixnopdv-service", icon: Wallet, lastPing: stats.serviceHeartbeats.pixPixnopdv, health: pixPixnopdvHealth },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {serviceCards.map((svc) => {
          const hc = healthColors[svc.health.level];
          const Icon = svc.icon;
          const hasPing = svc.lastPing != null;
          const pingLabel = hasPing ? formatDateTime(svc.lastPing) : "nenhum ping nos últimos 90 dias";
          const detailText = !hasPing
            ? svc.key === "sync"
              ? "Não há linha recente em sync_heartbeat para o sync (ou nome do serviço diferente do esperado)."
              : svc.key === "sync_pg_sb"
                ? "Não há linha recente em sync_heartbeat com service_name sync_pg_sb (ou alias equivalente)."
                : svc.key === "pix_pixnopdv"
                  ? "Não há linha recente em sync_heartbeat com service_name pix-pixnopdv-service (ou alias equivalente)."
                  : "O processo pode estar no ar; este card só reflete gravações em sync_heartbeat. Confira se o serviço está configurado para pingar o Postgres e se service_name bate com um dos aliases (ex.: nfce-service, nfce_service)."
            : svc.health.minutes < 0
              ? ""
              : `Último ping ${formatElapsed(svc.health.minutes)}`;
          return (
            <Card key={svc.key} className={`${hc.bg} ${hc.border} border`}>
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <Icon className={`h-5 w-5 ${hc.text}`} />
                      <span
                        className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ${hc.pulse} ${svc.health.level === "healthy" ? "animate-pulse" : ""}`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${hc.text} truncate`}>{svc.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{svc.subtitle}</p>
                    </div>
                  </div>
                  {svc.health.level === "healthy" ? (
                    <Wifi className={`h-4 w-4 shrink-0 ${hc.text}`} />
                  ) : svc.health.level === "critical" ? (
                    <WifiOff className={`h-4 w-4 shrink-0 ${hc.text}`} />
                  ) : null}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <HeartPulse className={`h-4 w-4 shrink-0 ${hc.text}`} />
                  <span className={`text-sm font-medium ${hc.text}`}>{svc.health.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{detailText}</p>
                <p className="text-xs font-mono text-muted-foreground/90 mt-1.5 break-all">PG: {pingLabel}</p>
                {svc.key === "sync" && svc.health.level === "critical" && (
                  <p className="text-xs text-destructive mt-2">Verifique o EasyCommandPay-Sync-Service no servidor.</p>
                )}
                {svc.key === "nfce" && svc.health.level === "critical" && (
                  <p className="text-xs text-destructive mt-2">Verifique o EasyCommandPay-NFCe-Service (porta HTTP).</p>
                )}
                {svc.key === "tef" && svc.health.level === "critical" && (
                  <p className="text-xs text-destructive mt-2">Verifique o EasyCommandPay-TEF-Aditum-Service (worker).</p>
                )}
                {svc.key === "sync_pg_sb" && svc.health.level === "critical" && (
                  <p className="text-xs text-destructive mt-2">
                    Verifique o serviço de sincronização PG → Supabase (heartbeat <span className="font-mono">sync_pg_sb</span>).
                  </p>
                )}
                {svc.key === "pix_pixnopdv" && svc.health.level === "critical" && (
                  <p className="text-xs text-destructive mt-2">
                    Verifique o serviço PIX Pix no PDV (heartbeat <span className="font-mono">pix-pixnopdv-service</span>).
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground text-center md:text-right -mt-1 leading-snug">
        Estado derivado apenas de <span className="font-mono text-[10px]">sync_heartbeat</span> (últimos 90 dias). «Sem ping na
        base» não indica por si só que o executável HTTP esteja parado — só que não há registro com nome reconhecido. Use
        «Atualizar dados» para refrescar.
      </p>
    </>
  );
}
