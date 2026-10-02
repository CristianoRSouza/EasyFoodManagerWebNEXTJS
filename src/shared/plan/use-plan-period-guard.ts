"use client";

import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useToast } from "@/shared/ui/use-toast";
import { useExternalAccess } from "@/shared/layout/external-access";
import { fmtPtBrFromYmd, type PeriodPreset } from "@/shared/date-period/date-period-presets";
import { usePlanHistoryWindow } from "./use-plan-history-window";
import { isPeriodOutsidePlanWindow, minAllowedYmd } from "./plan-window";

export interface PlanPeriodGuardParams {
  period: PeriodPreset;
  dateFrom: string;
  dateTo: string;
  setPeriod: (period: PeriodPreset) => void;
  setDateFrom: (date: string) => void;
  setDateTo: (date: string) => void;
}

/**
 * Bloqueio da janela do plano para telas com preset de período (Comandas, Transações): calcula
 * `outOfWindow`, avisa por toast quando o período cai fora, e ajusta o período para a data
 * mínima permitida. Única implementação — Comandas e Transações repetiam a mesma sequência
 * (`minAllowed`, `minAllowedLabel`, `outOfWindow`, o efeito do toast e
 * `handleAdjustToMinAllowed`), já divergentes entre si.
 */
export function usePlanPeriodGuard({ period, dateFrom, dateTo, setPeriod, setDateFrom, setDateTo }: PlanPeriodGuardParams) {
  const { toast } = useToast();
  const { data: planWindow } = usePlanHistoryWindow();
  const { openBilling, billingLoading } = useExternalAccess();
  const historyWindowDays = planWindow?.historyWindowDays ?? null;

  const minAllowed = useMemo(() => minAllowedYmd(historyWindowDays), [historyWindowDays]);
  const minAllowedLabel = minAllowed ? fmtPtBrFromYmd(minAllowed) : null;
  const outOfWindow = isPeriodOutsidePlanWindow(minAllowed, period, dateFrom);

  useEffect(() => {
    if (outOfWindow && minAllowedLabel) {
      toast({
        title: "Período fora do plano",
        description: `O seu plano permite consultar a partir de ${minAllowedLabel}.`,
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à entrada/saída da janela, não a `toast` (identidade instável)
  }, [outOfWindow, minAllowedLabel]);

  const handleAdjustToMinAllowed = () => {
    if (!minAllowed) return;
    setPeriod("custom");
    setDateFrom(minAllowed);
    if (!dateTo || dateTo < minAllowed) setDateTo(format(new Date(), "yyyy-MM-dd"));
  };

  return { planWindow, minAllowed, minAllowedLabel, outOfWindow, openBilling, billingLoading, handleAdjustToMinAllowed };
}
