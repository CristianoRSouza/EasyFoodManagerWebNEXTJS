"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/primitives/popover";
import { Calendar } from "@/shared/ui/primitives/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/primitives/select";
import { cn } from "@/shared/ui/cn";
import {
  type PeriodPreset,
  computePeriodRange,
  fmtPtBrFromYmd,
  fromYmdLocal,
  toYmdLocal,
} from "./date-period-presets";

export type DatePeriodPresetControlsProps = {
  period: PeriodPreset;
  onPeriodChange: (p: PeriodPreset) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (ymd: string) => void;
  onDateToChange: (ymd: string) => void;
  className?: string;
  /** Largura do trigger do select (ex.: `w-full sm:w-[180px]`). */
  selectTriggerClassName?: string;
};

export function DatePeriodPresetControls({
  period,
  onPeriodChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  className,
  selectTriggerClassName = "w-full sm:w-[180px] h-9",
}: DatePeriodPresetControlsProps) {
  const handlePreset = (value: PeriodPreset) => {
    onPeriodChange(value);
    if (value !== "custom") {
      const range = computePeriodRange(value as Exclude<PeriodPreset, "custom">);
      onDateFromChange(range.from);
      onDateToChange(range.to);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2.5 sm:gap-3 items-end", className)}>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Período</label>
        <Select value={period} onValueChange={(v) => handlePreset(v as PeriodPreset)}>
          <SelectTrigger className={cn("h-9", selectTriggerClassName)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="semester">Semestre</SelectItem>
            <SelectItem value="year">Ano</SelectItem>
            <SelectItem value="custom">Período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {period === "custom" && (
        <>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data início</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[160px] h-9 justify-start font-normal">
                  <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{fmtPtBrFromYmd(dateFrom)}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromYmdLocal(dateFrom)}
                  onSelect={(d) => onDateFromChange(d ? toYmdLocal(d) : "")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Data fim</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[160px] h-9 justify-start font-normal">
                  <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{fmtPtBrFromYmd(dateTo)}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromYmdLocal(dateTo)}
                  onSelect={(d) => onDateToChange(d ? toYmdLocal(d) : "")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </>
      )}
    </div>
  );
}
