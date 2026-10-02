import type { NfceEvent, NfceLogEntry } from "../../domain/nfce-history";
import { NfceEventsSection } from "./NfceEventsSection";
import { NfceLogsSection } from "./NfceLogsSection";

/** Aba "Histórico" — eventos SEFAZ + logs de processamento — cópia fiel do legado. */
export function NfceHistoryTab({ events, logs }: { events: NfceEvent[]; logs: NfceLogEntry[] }) {
  return (
    <div className="mt-4 space-y-4">
      <NfceEventsSection events={events} />
      <NfceLogsSection logs={logs} />
    </div>
  );
}
