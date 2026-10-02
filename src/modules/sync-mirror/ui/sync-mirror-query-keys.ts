import type { Tenant } from "@/shared/tenant/use-required-tenant";

/**
 * Prefixos das consultas do Espelho — os mesmos de `LEGACY/src/lib/query-keys.ts` (uma chave por
 * agregado do painel). Toda chave começa com o prefixo e segue com empresa/loja: o botão
 * "Atualizar dados" invalida tudo o que começa com `sync-mirror-`, como no legado.
 */
export const SYNC_MIRROR_KEYS = {
  jobs: "sync-mirror-jobs",
  cycles: "sync-mirror-cycles",
  events: "sync-mirror-events",
  health: "sync-mirror-health",
  alarms: "sync-mirror-alarms",
  retention: "sync-mirror-retention",
} as const;

export const SYNC_MIRROR_KEY_PREFIX = "sync-mirror-";

export function syncMirrorKey(
  prefix: (typeof SYNC_MIRROR_KEYS)[keyof typeof SYNC_MIRROR_KEYS],
  tenant: Tenant,
  ...rest: Array<string | number>
): readonly unknown[] {
  return [prefix, tenant.companyId, tenant.storeId, ...rest];
}

export function isSyncMirrorKey(queryKey: readonly unknown[]): boolean {
  return String(queryKey[0] ?? "").startsWith(SYNC_MIRROR_KEY_PREFIX);
}
