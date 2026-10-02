"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { CYCLE_RANGES, isCycleRangeId, type CycleRangeId } from "../domain/cycle-rules";

/** Seletor de faixa, compartilhado pelas duas visões da aba Ciclos (`SeletorFaixa` do legado). */
export function CycleRangeSelect({
  range,
  onRangeChange,
}: {
  range: CycleRangeId;
  onRangeChange: (r: CycleRangeId) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor="ciclos-faixa"
        className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Periodo
      </label>
      <Select value={range} onValueChange={(v) => isCycleRangeId(v) && onRangeChange(v)}>
        <SelectTrigger id="ciclos-faixa" className="h-8 w-[17rem] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CYCLE_RANGES.map((f) => (
            <SelectItem key={f.id} value={f.id} className="text-xs">
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
