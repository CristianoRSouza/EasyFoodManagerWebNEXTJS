/** Presets de período (mesmos da tela NFC-e). */
export type PeriodPreset = "all" | "today" | "7d" | "30d" | "semester" | "year" | "custom";

export function toYmdLocal(d: Date): string {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromYmdLocal(ymd: string): Date | undefined {
  if (!ymd) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return undefined;
  return dt;
}

export function fmtPtBrFromYmd(ymd: string): string {
  const d = fromYmdLocal(ymd);
  if (!d) return "Selecionar";
  return d.toLocaleDateString("pt-BR");
}

export function computePeriodRange(period: Exclude<PeriodPreset, "custom">): { from: string; to: string } {
  if (period === "all") return { from: "", to: "" };
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);

  if (period === "today") {
    return { from: toYmdLocal(end), to: toYmdLocal(end) };
  }
  if (period === "7d") {
    start.setDate(start.getDate() - 6);
    return { from: toYmdLocal(start), to: toYmdLocal(end) };
  }
  if (period === "30d") {
    start.setDate(start.getDate() - 29);
    return { from: toYmdLocal(start), to: toYmdLocal(end) };
  }
  if (period === "semester") {
    start.setDate(start.getDate() - 182);
    return { from: toYmdLocal(start), to: toYmdLocal(end) };
  }
  start.setDate(start.getDate() - 364);
  return { from: toYmdLocal(start), to: toYmdLocal(end) };
}

/** YYYY-MM-DD → dia seguinte (início exclusivo), para `.lt(col, …T00:00:00)` em timestamp sem TZ (Supabase). */
export function ymdNextDayLocal(ymd: string): string {
  const dt = fromYmdLocal(ymd);
  if (!dt) return ymd;
  dt.setDate(dt.getDate() + 1);
  return toYmdLocal(dt);
}

/**
 * YYYY-MM-DD → ISO 8601 string at local midnight (e.g. "2026-05-06T03:00:00.000Z" for UTC-3).
 * Use for `.gte("col", ...)` on timestamptz columns so the boundary respects the user's timezone.
 */
export function ymdToLocalMidnightIso(ymd: string): string {
  const d = fromYmdLocal(ymd);
  if (!d) return `${ymd}T00:00:00`;
  return d.toISOString();
}

/**
 * YYYY-MM-DD → ISO 8601 string at midnight of the NEXT day in local timezone.
 * Use for `.lt("col", ...)` on timestamptz columns to include the entire "to" day.
 */
export function ymdNextDayLocalIso(ymd: string): string {
  const nextYmd = ymdNextDayLocal(ymd);
  const d = fromYmdLocal(nextYmd);
  if (!d) return `${nextYmd}T00:00:00`;
  return d.toISOString();
}
