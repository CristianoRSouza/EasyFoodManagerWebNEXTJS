/**
 * As duas filas PostgreSQL ↔ Supabase da loja (`ecb_sync.inbox` e `ecb_sync.outbox`).
 *
 * As rotas `/v1/sync/<fila>/*` devolvem as mesmas colunas nas duas filas, com nomes trocados
 * onde a direção muda o sentido (aplicado × despachado, recebido × alterado). Os valores de
 * status seguem o banco: inbox `pending|applied|failed`, outbox `pending|dispatched|failed`.
 */
export type SyncQueue = "inbox" | "outbox";
