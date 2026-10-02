import type { MirrorCycle, MirrorCycleHistoryResult } from "../domain/sync-mirror";
import type { CycleRangeId } from "../domain/cycle-rules";
import { CycleDetailView } from "./CycleDetailView";
import { CycleHistoryView } from "./CycleHistoryView";

export interface CyclesPanelProps {
  cycles: MirrorCycle[];
  history: MirrorCycleHistoryResult | null;
  range: CycleRangeId;
  onRangeChange: (r: CycleRangeId) => void;
}

/**
 * Aba "Ciclos" — porta de `LEGACY/src/components/sync-mirror/CyclesPanel.tsx` (413 linhas,
 * dividido em `CycleRangeSelect`, `CycleHistoryView`, `CycleDetailView` e `CyclesTable`).
 */
export function CyclesPanel({ cycles, history, range, onRangeChange }: CyclesPanelProps) {
  if (range !== "detalhe") {
    return <CycleHistoryView history={history} range={range} onRangeChange={onRangeChange} />;
  }
  return <CycleDetailView cycles={cycles} range={range} onRangeChange={onRangeChange} />;
}
