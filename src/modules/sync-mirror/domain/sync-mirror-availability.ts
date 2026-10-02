/**
 * Onde o Espelho FB↔PG existe — porta de `LEGACY/src/lib/sync-mirror-mode.ts`.
 *
 * Decisão de produto: o espelho lê `sync_log`/`sync_heartbeat` no PostgreSQL DA LOJA,
 * alimentados pelo serviço que conversa com o Firebird do PDV. Na nuvem não existe nem o Firebird
 * nem o serviço, e por isso não há o que espelhar.
 *
 * No legado o gate tinha quatro ramos (nuvem Supabase, EasyFoodAPI, Electron, Admin API/exemplo).
 * No Next só há dois backends: `lan` (a easyfoodmanagerAPI da loja — o antigo Modo 2) e `cloud`.
 * Não há Electron nem conjunto de exemplo. O gate fica escrito aqui, e não herdado do menu, porque
 * sumir do menu não impede alguém de digitar a URL.
 */
import type { RuntimeInfo } from "@/shared/runtime/runtime-context";

export function isSyncMirrorAvailable(backend: RuntimeInfo["backend"]): boolean {
  return backend === "lan";
}
