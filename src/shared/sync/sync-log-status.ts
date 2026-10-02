/**
 * Cópia fiel de `LEGACY/src/lib/sync-log-status.ts`.
 */

/** Estados de sucesso gravados pelo Sync-Service / PG (`sync_log.status`). */
export function syncLogStatusIsSuccess(status: string | null | undefined): boolean {
  const t = String(status ?? "")
    .trim()
    .toLowerCase();
  return t === "ok" || t === "success" || t === "sucesso";
}

export function syncLogStatusIsError(status: string | null | undefined): boolean {
  const t = String(status ?? "")
    .trim()
    .toLowerCase();
  return t === "error" || t === "failed" || t === "failure" || t === "falha";
}
