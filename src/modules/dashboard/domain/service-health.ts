/**
 * Saúde de um serviço a partir do último "ping" gravado em `sync_heartbeat` — ou, para a
 * sincronização, do último `sync_log` bem-sucedido quando o heartbeat estiver mais velho.
 *
 * Porta 1:1 da lógica do legado (`src/pages/Dashboard.tsx`): `formatElapsed`,
 * `heartbeatHealth` e o `useMemo` de `syncHealth`. Aqui é função pura — recebe `now` para não
 * depender de `Date.now()` no teste — e o componente de UI decide o que fazer com o resultado.
 */

export type HealthLevel = "healthy" | "warning" | "critical" | "unknown";

export interface HealthStatus {
  level: HealthLevel;
  label: string;
  /** Minutos desde o último ping/log. `-1` quando não há nenhum registro. */
  minutes: number;
}

const NO_PING: HealthStatus = { level: "unknown", label: "Sem ping na base", minutes: -1 };

/** "há X min" / "há Xh Ymin" / "há Xd Yh" — mesmo texto do legado. */
export function formatElapsed(minutes: number): string {
  if (minutes < 0) return "";
  if (minutes === 0) return "há menos de 1 minuto";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remMin = minutes % 60;
    return remMin > 0 ? `há ${hours}h ${remMin}min` : `há ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `há ${days}d ${remHours}h` : `há ${days}d`;
}

/**
 * "unknown" = sem linha em `sync_heartbeat` com nome reconhecido — não prova que o processo
 * HTTP esteja parado, só que não há registro correspondente.
 */
export function heartbeatHealth(lastPingIso: string | null, now: number = Date.now()): HealthStatus {
  if (!lastPingIso) return NO_PING;
  const ts = new Date(lastPingIso).getTime();
  if (!Number.isFinite(ts)) return NO_PING;
  const diffMs = now - ts;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes <= 5) return { level: "healthy", label: "Operacional", minutes };
  if (minutes <= 15) return { level: "warning", label: "Atraso", minutes };
  return { level: "critical", label: "Serviço parado", minutes };
}

function logLevelFor(minutes: number): HealthLevel {
  if (minutes <= 5) return "healthy";
  if (minutes <= 15) return "warning";
  return "critical";
}

function logLabelFor(level: HealthLevel): string {
  if (level === "healthy") return "Operacional";
  if (level === "warning") return "Atraso detectado";
  return "Serviço parado";
}

/**
 * Saúde do serviço de sincronização (FB → PG): cruza o heartbeat com o último `sync_log`
 * bem-sucedido e usa o mais recente dos dois — um heartbeat parado não deveria "esconder" um
 * log de sucesso mais novo, e vice-versa.
 */
export function computeSyncHealth(
  lastSuccessSyncCreatedAt: string | null,
  syncHeartbeatIso: string | null,
  now: number = Date.now(),
): HealthStatus {
  const fromHeartbeat = syncHeartbeatIso ? heartbeatHealth(syncHeartbeatIso, now) : null;

  if (!lastSuccessSyncCreatedAt && (!fromHeartbeat || fromHeartbeat.level === "unknown")) {
    return NO_PING;
  }
  if (!lastSuccessSyncCreatedAt) return fromHeartbeat as HealthStatus;

  const diffMs = now - new Date(lastSuccessSyncCreatedAt).getTime();
  const logMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const logLevel = logLevelFor(logMinutes);
  const logStatus: HealthStatus = { level: logLevel, label: logLabelFor(logLevel), minutes: logMinutes };

  if (!fromHeartbeat || fromHeartbeat.level === "unknown") return logStatus;

  const heartbeatTime = new Date(syncHeartbeatIso as string).getTime();
  const logTime = new Date(lastSuccessSyncCreatedAt).getTime();
  return heartbeatTime >= logTime ? fromHeartbeat : logStatus;
}
