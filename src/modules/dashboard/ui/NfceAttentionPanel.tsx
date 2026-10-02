"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { totalNeedingAttention, type NfceAttentionCounts } from "../domain/dashboard-snapshot";
import { DashboardCharts } from "./DashboardCharts";

/**
 * Rotas do módulo `nfce` (Fase 2, outro agente) — os mesmos parâmetros de filtro que a rota
 * `GET /v1/nfce/notes` já aceita (`status`, `reconcileStatus`), assim a tela de NFC-e não
 * precisa de nenhuma convenção nova quando for migrada.
 */
function attentionHref(type: "manual" | "reconcile_failed" | "unusable"): string {
  if (type === "manual") return "/nfce?status=manual_review";
  if (type === "reconcile_failed") return "/nfce?status=all&reconcileStatus=failed";
  return "/nfce?status=unusable";
}

export function NfceAttentionPanel({ attention }: { attention: NfceAttentionCounts }) {
  const router = useRouter();
  const unresolvedTotal = totalNeedingAttention(attention);
  const chartData = [
    { name: "Correção manual", total: attention.manualReview },
    { name: "Reconciliação falhou", total: attention.reconcileFailed },
    { name: "Contingência pendente", total: attention.unusable },
  ];

  const openByAttention = (type: "manual" | "reconcile_failed" | "unusable") => router.push(attentionHref(type));

  return (
    <Card className={`glass-panel ${unresolvedTotal > 0 ? "border-amber-500/40" : ""}`}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className={`h-4 w-4 ${unresolvedTotal > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          NFC-e sem solução
        </CardTitle>
      </CardHeader>
      <CardContent>
        {unresolvedTotal === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma NFC-e pendente de ação no momento.</p>
        ) : (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-semibold">{unresolvedTotal}</span> nota(s) exigem atenção.
            </div>
            <p className="text-xs text-muted-foreground">Clique em uma barra para abrir a consulta NFC-e filtrada.</p>
            <DashboardCharts
              variant="attention"
              data={chartData}
              onAttentionClick={(name) => {
                if (name === "Correção manual") openByAttention("manual");
                else if (name === "Reconciliação falhou") openByAttention("reconcile_failed");
                else if (name === "Contingência pendente") openByAttention("unusable");
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
