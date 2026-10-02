import type { DashboardSnapshot } from "../domain/dashboard-snapshot";

/**
 * Porta do painel inicial.
 *
 * Uma chamada só (`snapshot`): a tela não decide quais consultas fazer — o repositório decide,
 * porque só ele sabe se está falando com a loja (que tem `sync_log`/`sync_heartbeat`) ou com a
 * nuvem (que não tem).
 */
export interface DashboardRepository {
  snapshot(): Promise<DashboardSnapshot>;
}
