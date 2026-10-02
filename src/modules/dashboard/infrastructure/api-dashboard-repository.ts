import type { DashboardRepository } from "../application/dashboard-repository";
import { EMPTY_DASHBOARD_SNAPSHOT, filterRecentSyncErrors, type DashboardSnapshot } from "../domain/dashboard-snapshot";
import { apiRequest } from "@/shared/http/api-client";
import type { Envelope } from "@/shared/http/envelope";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import {
  mapDashboardStats,
  mapNfceAttentionCounts,
  mapSyncHourBucket,
  mapSyncLogEntry,
  mapTransactionDayBucket,
  type RawDashboardStats,
  type RawNfceAttentionCounts,
  type RawSyncHourBucket,
  type RawSyncLog,
  type RawTransactionDayBucket,
} from "./dashboard-mappers";

const RECENT_ERRORS_LIMIT = 10;
const SYNC_LOGS_LIMIT = 500;

/** Devolve o valor mapeado quando a promessa se resolveu; senão, registra a falha e usa o fallback. */
function settledOr<T, R>(
  result: PromiseSettledResult<T>,
  mapFn: (value: T) => R,
  fallback: R,
  part: string,
  failedParts: string[],
): R {
  if (result.status === "fulfilled") return mapFn(result.value);
  failedParts.push(part);
  return fallback;
}

/**
 * Indicadores da tela inicial, pela easyfoodmanagerAPI (loja) ou pela EasyFoodAPI (nuvem) —
 * os mesmos caminhos `/v1/*`; o proxy do Next é quem escolhe o servidor por trás.
 *
 * `sync_log`/`sync_heartbeat` só existem no PostgreSQL da loja: na nuvem essas linhas nem
 * fazem sentido pedir (a EasyFoodAPI responde sempre vazio para elas — mesmo comportamento
 * documentado em `easyfoodmanagerWEB/src/lib/cloud-api-data.ts`). Por isso `backend` decide
 * aqui, dentro do repositório, quais chamadas acontecem — a tela só recebe o resultado pronto.
 *
 * `Promise.allSettled` numa única onda (todas as chamadas, loja ou nuvem, de uma vez): se uma
 * rota falhar (ex.: `/nfce/attention-counts` numa loja sem `nfce_notes`), as outras ainda
 * atualizam a tela — mesma escolha do legado (`Dashboard.tsx`, `loadData`). A parte que falhou
 * fica zerada e listada em `failedParts`, em vez de derrubar o snapshot inteiro.
 */
export class ApiDashboardRepository implements DashboardRepository {
  constructor(
    private readonly tenant: Tenant,
    private readonly backend: "cloud" | "lan",
  ) {}

  async snapshot(): Promise<DashboardSnapshot> {
    const lan = this.backend === "lan";
    const [statsRes, transactionsRes, attentionRes, syncHourRes, syncLogsRes] = await Promise.allSettled([
      apiRequest<Envelope<RawDashboardStats>>("/dashboard/stats", { tenant: this.tenant }),
      apiRequest<Envelope<RawTransactionDayBucket[]>>("/dashboard/transactions-by-day", { tenant: this.tenant }),
      apiRequest<Envelope<RawNfceAttentionCounts>>("/nfce/attention-counts", { tenant: this.tenant }),
      lan
        ? apiRequest<Envelope<RawSyncHourBucket[]>>("/dashboard/sync-by-hour", { tenant: this.tenant })
        : Promise.resolve<Envelope<RawSyncHourBucket[]>>({ data: [] }),
      lan
        ? apiRequest<Envelope<RawSyncLog[]>>(`/sync/logs?limit=${SYNC_LOGS_LIMIT}`, { tenant: this.tenant })
        : Promise.resolve<Envelope<RawSyncLog[]>>({ data: [] }),
    ]);

    const failedParts: string[] = [];
    const stats = settledOr(statsRes, (r) => mapDashboardStats(r.data), EMPTY_DASHBOARD_SNAPSHOT.stats, "stats", failedParts);
    const transactionsByDay = settledOr(
      transactionsRes,
      (r) => (r.data ?? []).map(mapTransactionDayBucket),
      [],
      "transactionsByDay",
      failedParts,
    );
    const nfceAttention = settledOr(
      attentionRes,
      (r) => mapNfceAttentionCounts(r.data),
      EMPTY_DASHBOARD_SNAPSHOT.nfceAttention,
      "nfceAttention",
      failedParts,
    );
    const allLogs = lan
      ? settledOr(syncLogsRes, (r) => (r.data ?? []).map(mapSyncLogEntry), [], "recentErrors", failedParts)
      : [];
    const syncByHour = lan
      ? settledOr(syncHourRes, (r) => (r.data ?? []).map(mapSyncHourBucket), [], "syncByHour", failedParts)
      : [];

    return {
      stats,
      transactionsByDay,
      nfceAttention,
      syncByHour,
      recentErrors: filterRecentSyncErrors(allLogs, RECENT_ERRORS_LIMIT),
      failedParts,
    };
  }
}
