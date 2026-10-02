"use client";

import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { fromYmdLocal } from "@/shared/date-period/date-period-presets";
import type { DatePreset } from "../domain/revenue";
import type { RevenuePageState } from "./use-revenue-page";
import { DateField } from "./DateField";

const PRESETS: { kind: Exclude<DatePreset, null>; label: string; min: number }[] = [
  { kind: "today", label: "Hoje", min: 1 },
  { kind: "7d", label: "7 dias", min: 7 },
  { kind: "30d", label: "30 dias", min: 30 },
  { kind: "month", label: "Mês atual", min: 31 },
];

interface PeriodCardProps {
  screen: RevenuePageState;
}

/** Card "Período": atalhos + calendários De/Até — igual ao `ReceitasPage.tsx` do legado. */
export function PeriodCard({ screen }: PeriodCardProps) {
  const minAllowedDate = screen.minAllowedYmd ? fromYmdLocal(screen.minAllowedYmd) : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex flex-wrap items-center gap-2">
          Período
          {screen.historyWindowDays != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden />
              Plano {screen.planWindow?.planName ?? screen.planWindow?.planSlug ?? ""} · até {screen.historyWindowDays} dias
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Atalhos ou datas personalizadas (inclusive).
          {screen.historyWindowDays != null && (
            <>
              {" "}O seu plano permite consultar até <strong className="text-foreground">{screen.historyWindowDays}</strong> dias de
              histórico.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <TooltipProvider delayDuration={150}>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(({ kind, label, min }) => {
              const allowed = screen.isPresetAllowed(kind);
              const btn = (
                <Button
                  type="button"
                  variant={screen.selectedPreset === kind ? "default" : "secondary"}
                  size="sm"
                  onClick={() => screen.applyPreset(kind)}
                  disabled={!allowed}
                  aria-disabled={!allowed}
                >
                  {!allowed && <Lock className="mr-1 h-3 w-3" aria-hidden />}
                  {label}
                </Button>
              );
              if (allowed) return <span key={kind}>{btn}</span>;
              return (
                <Tooltip key={kind}>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>{btn}</span>
                  </TooltipTrigger>
                  <TooltipContent>Disponível em planos com janela ≥ {min} dias.</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end sm:gap-4">
          <DateField
            label="De"
            title="Data inicial"
            value={screen.from}
            onSelect={screen.handleFromSelect}
            disabled={minAllowedDate ? { before: minAllowedDate } : undefined}
          />
          <DateField
            label="Até"
            title="Data final"
            value={screen.to}
            onSelect={screen.handleToSelect}
            disabled={minAllowedDate ? { before: minAllowedDate } : undefined}
          />
        </div>
      </CardContent>
    </Card>
  );
}
