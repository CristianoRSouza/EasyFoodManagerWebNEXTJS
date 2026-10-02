/**
 * Formatação do Espelho FB↔PG — porta das funções `fmt*` de
 * `LEGACY/src/components/sync-mirror/mirror-ui.tsx`, sem mudança de resultado. Todas devolvem
 * "—" para valor ausente ou inválido.
 */

const EMPTY = "—";
const integer = new Intl.NumberFormat("pt-BR");

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `1.234` (legado `fmtNumero`). */
export function formatCount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return EMPTY;
  return integer.format(n);
}

/** `22:03:00` (legado `fmtHora`). */
export function formatClock(iso: string | null | undefined): string {
  const d = parse(iso);
  return d ? d.toLocaleTimeString("pt-BR", { hour12: false }) : EMPTY;
}

/** `30/09 22:03:00` (legado `fmtDataHora`). */
export function formatDayTime(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return EMPTY;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour12: false })}`;
}

/** Duração em segundos → "612 ms" / "1,8 s". O serviço grava segundos com 1 decimal. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return EMPTY;
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  return `${seconds.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
}

/** Idade em segundos → "12 s" / "4 min" / "3 h" (legado `fmtDesde`). */
export function formatSince(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return EMPTY;
  const s = Math.max(0, Math.round(seconds));
  if (s < 90) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 90) return `${min} min`;
  return `${Math.round(min / 60)} h`;
}

/**
 * "há 3 s" em vez de "22:03:00" (legado `fmtRelativo`). A pergunta que se faz olhando para a
 * coluna é "isto é recente?"; a hora exata vai no `title`.
 */
export function formatRelative(iso: string | null | undefined, now: number = Date.now()): string {
  const d = parse(iso);
  if (!d) return EMPTY;
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 5) return "agora";
  if (s < 60) return `há ${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

/** Lacuna entre dois itens da linha do tempo → "12 min" / "3 h". */
export function formatGap(ms: number): string {
  return ms >= 3_600_000 ? `${Math.round(ms / 3_600_000)} h` : `${Math.round(ms / 60_000)} min`;
}
