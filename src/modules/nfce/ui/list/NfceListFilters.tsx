"use client";

import { CalendarDays, Filter, Search, X } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/primitives/popover";
import { Calendar } from "@/shared/ui/primitives/calendar";
import { fmtPtBrFromYmd, fromYmdLocal, toYmdLocal, type PeriodPreset } from "@/shared/date-period/date-period-presets";

export interface NfceListFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  periodFilter: PeriodPreset;
  onPeriodFilterChange: (value: PeriodPreset) => void;
  dateFrom: string;
  onDateFromChange: (ymd: string) => void;
  dateTo: string;
  onDateToChange: (ymd: string) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

/**
 * Card "Filtros" da lista de NFC-e — cópia fiel de `LEGACY/src/pages/NfcePage.tsx` (grade que vira
 * flex no breakpoint `sm:`). Não usa `DatePeriodPresetControls` (compartilhado): aquele componente
 * embrulha Período + datas num `<div>` próprio, o que muda a distribuição das células no grid
 * mobile (`grid-cols-2`) do legado — ver decisão registrada no relatório da tela.
 */
export function NfceListFilters({
  statusFilter,
  onStatusFilterChange,
  periodFilter,
  onPeriodFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  searchInput,
  onSearchInputChange,
  onSearch,
  onClear,
}: NfceListFiltersProps) {
  return (
    <Card className="border bg-card/80 backdrop-blur-sm shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Filtros</span>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-2.5 sm:gap-3">
          <div className="space-y-1 col-span-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[150px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="authorized">Autorizada</SelectItem>
                <SelectItem value="rejected">Rejeitada</SelectItem>
                <SelectItem value="denied">Denegada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
                <SelectItem value="unusable">Contingência pendente</SelectItem>
                <SelectItem value="sending">Enviando</SelectItem>
                <SelectItem value="manual_review">Pendente de correção</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 col-span-1">
            <label className="text-xs text-muted-foreground">Período</label>
            <Select value={periodFilter} onValueChange={(v) => onPeriodFilterChange(v as PeriodPreset)}>
              <SelectTrigger className="w-full sm:w-[180px] h-9">
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

          {periodFilter === "custom" && (
            <>
              <div className="space-y-1 col-span-1">
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

              <div className="space-y-1 col-span-1">
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

          <div className="space-y-1 col-span-2 sm:flex-1 sm:min-w-[200px]">
            <label className="text-xs text-muted-foreground">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Chave, protocolo ou nº"
                className="pl-9 h-9 text-base sm:text-sm"
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
              />
            </div>
          </div>

          <div className="flex gap-1.5 col-span-2 sm:col-auto">
            <Button onClick={onSearch} size="sm" className="h-9 flex-1 sm:flex-none">
              <Search className="mr-1.5 h-3.5 w-3.5" /> Buscar
            </Button>
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground flex-1 sm:flex-none" onClick={onClear}>
              <X className="mr-1 h-3.5 w-3.5" /> Limpar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
