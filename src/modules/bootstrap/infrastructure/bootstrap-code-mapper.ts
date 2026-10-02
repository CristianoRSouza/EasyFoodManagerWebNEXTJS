import type { IssueBootstrapCodeResult } from "../domain/bootstrap-code";
import { asBoolean, asText } from "@/shared/infrastructure/convert";

export type BootstrapCodeApiRow = Record<string, unknown>;

/**
 * Traduz a resposta de `POST /v1/stores/{storeId}/bootstrap-code` (mesmo formato usado pelo
 * legado em `issue-bootstrap-code.ts` — `ok`/`code`/`email`/`store_id`/`expires_at`/`error`)
 * para o domínio. `ok: false` é resposta válida (não é erro de transporte): o servidor recusou
 * gerar o código (ex.: email fora da empresa, limite de tentativas).
 */
export function toIssueBootstrapCodeResult(row: BootstrapCodeApiRow): IssueBootstrapCodeResult {
  return {
    ok: asBoolean(row.ok),
    code: asText(row.code) ?? undefined,
    email: asText(row.email) ?? undefined,
    storeId: asText(row.store_id) ?? undefined,
    expiresAt: asText(row.expires_at) ?? undefined,
    error: asText(row.error) ?? undefined,
  };
}
