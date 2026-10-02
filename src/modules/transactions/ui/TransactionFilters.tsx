"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { DatePeriodPresetControls } from "@/shared/date-period/DatePeriodPresetControls";
import type { PeriodPreset } from "@/shared/date-period/date-period-presets";
import type { TransactionMethodFilter } from "../domain/transaction";

export interface TransactionFiltersProps {
  methodFilter: TransactionMethodFilter;
  onMethodFilterChange: (value: TransactionMethodFilter) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  period: PeriodPreset;
  onPeriodChange: (p: PeriodPreset) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (ymd: string) => void;
  onDateToChange: (ymd: string) => void;
}

export function TransactionFilters({
  methodFilter,
  onMethodFilterChange,
  statusFilter,
  onStatusFilterChange,
  period,
  onPeriodChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: TransactionFiltersProps) {
  return (
    <div className="flex gap-3 flex-col lg:flex-row lg:flex-wrap lg:items-end">
      <div className="space-y-1 w-full sm:w-auto">
        <label className="text-xs text-muted-foreground block">Método</label>
        <Select value={methodFilter} onValueChange={(v) => onMethodFilterChange(v as TransactionMethodFilter)}>
          <SelectTrigger className="w-full sm:w-[150px] h-9">
            <SelectValue placeholder="Método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="credit">Crédito</SelectItem>
            <SelectItem value="debit">Débito</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 w-full sm:w-auto">
        <label className="text-xs text-muted-foreground block">Status</label>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-full sm:w-[190px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="approved">Aprovada</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="tef_requested">TEF solicitado</SelectItem>
            <SelectItem value="processing">Em processamento</SelectItem>
            <SelectItem value="declined">Recusada</SelectItem>
            <SelectItem value="failed">Falha</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
            <SelectItem value="aborted">Abortada</SelectItem>
            <SelectItem value="rejected">Rejeitada</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DatePeriodPresetControls
        period={period}
        onPeriodChange={onPeriodChange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        className="w-full lg:w-auto lg:flex-1"
      />
    </div>
  );
}
