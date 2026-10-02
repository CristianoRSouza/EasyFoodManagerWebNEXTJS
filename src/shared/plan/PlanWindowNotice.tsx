"use client";

import type { ReactNode } from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import type { PlanHistoryWindow } from "./use-plan-history-window";

export interface PlanWindowNoticeProps {
  planWindow: PlanHistoryWindow | null | undefined;
  /** O que foi bloqueado, com ponto final (ex.: "A consulta de comandas foi bloqueada para este intervalo."). */
  blockedMessage: string;
  /** Como sair do bloqueio (ex.: "Ajuste o período (data início) para uma data igual ou posterior."). */
  adjustHint: ReactNode;
  minAllowedYmd: string | null;
  minAllowedLabel: string | null;
  onAdjust: () => void;
  onOpenBilling: () => void;
  billingLoading: boolean;
}

/** Card "Período fora do seu plano" — o mesmo das telas Comandas, Transações e Receitas do legado. */
export function PlanWindowNotice({
  planWindow,
  blockedMessage,
  adjustHint,
  minAllowedYmd,
  minAllowedLabel,
  onAdjust,
  onOpenBilling,
  billingLoading,
}: PlanWindowNoticeProps) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <Lock className="h-5 w-5" aria-hidden />
          Período fora do seu plano
        </CardTitle>
        <CardDescription className="text-destructive/90">
          O plano <strong className="text-foreground">{planWindow?.planName ?? planWindow?.planSlug ?? "atual"}</strong>{" "}
          permite consultar até <strong className="text-foreground">{planWindow?.historyWindowDays}</strong> dias de
          histórico. {blockedMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-border bg-background/60 px-4 py-3 text-sm">
          <div className="text-muted-foreground">Data mínima permitida pelo seu plano</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{minAllowedLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">{adjustHint}</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {minAllowedYmd && (
            <Button type="button" variant="secondary" onClick={onAdjust}>
              Ajustar para {minAllowedLabel}
            </Button>
          )}
          <Button type="button" onClick={onOpenBilling} disabled={billingLoading} className="gap-2">
            {billingLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            Fazer upgrade do plano
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
