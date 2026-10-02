/**
 * Catálogo dos 10 jobs do ciclo do EasyFoodService-Sync-FB-PG, na ordem em que ele os executa,
 * e a tradução de `(direction, table_name)` da `sync_log` para o job.
 *
 * Porta de `LEGACY/src/lib/sync-mirror-jobs.ts`. Os textos (rótulo e descrição) são os do
 * legado, porque aparecem na tela.
 *
 * ► POR QUE A TRADUÇÃO É NECESSÁRIA
 *
 *   A `sync_log` não grava o nome do job — grava a DIREÇÃO e a TABELA. `orders` aparece nas duas
 *   direções e são jobs distintos (o 6 lê comandas abertas do Firebird; o 10 fecha venda no
 *   Firebird). Só o par identifica o job. E o job 6 grava DUAS linhas por ciclo (`orders` e
 *   `order_items`), então a relação é N:1.
 *
 * ► POR QUE "SEM LINHA" NÃO É "ZERO"
 *
 *   O serviço não grava sucesso sem efeito (`records_affected = 0`). Um job que rodou e não tinha
 *   nada a fazer some do período em vez de aparecer com zero — a tela distingue os dois casos.
 */

export type SyncDirection = "fb_to_pg" | "pg_to_fb";

/**
 * O que `records_affected` conta para este job.
 *  - `written` → `rowCount` do upsert: linha realmente reescrita no PostgreSQL ("gravados").
 *  - `createdInFirebird` → registro de fato criado no Firebird do PDV ("escritos").
 */
export type CountSemantics = "written" | "createdInFirebird";

export interface SyncJobDef {
  /** Posição no ciclo (1..10) — a ordem importa: nfce_issuer precisa vir antes do resto. */
  readonly order: number;
  readonly label: string;
  readonly direction: SyncDirection;
  /** Valores de `sync_log.table_name` que este job grava. */
  readonly tables: readonly string[];
  readonly semantics: CountSemantics;
  /** Uma linha de contexto, exibida como tooltip na tela. */
  readonly description: string;
}

export const SYNC_JOBS: readonly SyncJobDef[] = [
  {
    order: 1,
    label: "Emitente NFC-e",
    direction: "fb_to_pg",
    tables: ["nfce_issuer_config"],
    semantics: "written",
    description:
      "Roda primeiro de propósito: popula ecb_sync.site_identity, de que os gatilhos dos demais jobs dependem.",
  },
  {
    order: 2,
    label: "Credenciais PIX",
    direction: "fb_to_pg",
    tables: ["pixnopdv_store_credentials"],
    semantics: "written",
    description: "Credenciais PIXnoPDV da loja, logo após o emitente.",
  },
  {
    order: 3,
    label: "Unidades",
    direction: "fb_to_pg",
    tables: ["units"],
    semantics: "written",
    description: "Catálogo de unidades de medida. Cardinalidade pequena e estável.",
  },
  {
    order: 4,
    label: "Produtos",
    direction: "fb_to_pg",
    tables: ["products"],
    semantics: "written",
    description: "Catálogo e preços. A cada 6 ciclos também sincroniza as imagens.",
  },
  {
    order: 5,
    label: "Fiscal dos produtos",
    direction: "fb_to_pg",
    tables: ["product_fiscal"],
    semantics: "written",
    description: "NCM, CSOSN e demais campos fiscais por produto.",
  },
  {
    order: 6,
    label: "Comandas abertas",
    direction: "fb_to_pg",
    tables: ["orders", "order_items"],
    semantics: "written",
    description:
      "Lê comandas abertas no Firebird e espelha itens no PostgreSQL. Grava duas linhas por ciclo (orders e order_items).",
  },
  {
    order: 7,
    label: "Comandas fechadas",
    direction: "fb_to_pg",
    tables: ["orders_closed"],
    semantics: "written",
    description: "Comandas que o PDV fechou direto, trazidas para o PostgreSQL.",
  },
  {
    order: 8,
    label: "Itens do totem",
    direction: "pg_to_fb",
    tables: ["order_items"],
    semantics: "createdInFirebird",
    description: "Fila de itens lançados no totem, inseridos no Firebird do PDV.",
  },
  {
    order: 9,
    label: "Estornos",
    direction: "pg_to_fb",
    tables: ["cancelled_items"],
    semantics: "createdInFirebird",
    description: "Cancelamentos feitos no totem, ecoados no Firebird.",
  },
  {
    order: 10,
    label: "Fechamento de venda",
    direction: "pg_to_fb",
    tables: ["orders"],
    semantics: "createdInFirebird",
    description: "Comanda paga no totem vira venda no PDV. É o job com o dinheiro dentro.",
  },
];

export const FB_TO_PG_JOBS: readonly SyncJobDef[] = SYNC_JOBS.filter((j) => j.direction === "fb_to_pg");
export const PG_TO_FB_JOBS: readonly SyncJobDef[] = SYNC_JOBS.filter((j) => j.direction === "pg_to_fb");

/** Tabelas que aparecem no filtro do Log do serviço — as do catálogo, sem repetição. */
export const SYNC_JOB_TABLES: readonly string[] = [...new Set(SYNC_JOBS.flatMap((j) => j.tables))].sort();

/** `true` quando o par direção/tabela pertence a este job. */
export function jobOwns(job: SyncJobDef, direction: string, table: string): boolean {
  return job.direction === direction && job.tables.includes(table);
}

/**
 * Job responsável por um par `(direction, table_name)` da `sync_log`. `null` para pares
 * desconhecidos — a tela mostra esses casos num grupo à parte em vez de os descartar.
 */
export function jobForLogLine(
  direction: string | null | undefined,
  table: string | null | undefined,
): SyncJobDef | null {
  const d = String(direction ?? "").trim();
  const t = String(table ?? "").trim();
  if (!d || !t) return null;
  return SYNC_JOBS.find((j) => jobOwns(j, d, t)) ?? null;
}

/** Texto do tooltip da célula de contagem, conforme a semântica do job. */
export function explainCount(job: SyncJobDef): string {
  if (job.semantics === "written") {
    return "Linhas realmente reescritas no PostgreSQL (rowCount do upsert). Inalteradas não entram nesta conta.";
  }
  return "Registros de fato criados no Firebird do PDV.";
}

/** Rótulo curto da direção, como aparece nos cabeçalhos das duas colunas. */
export function directionLabel(direction: SyncDirection): string {
  return direction === "fb_to_pg" ? "FB ▸ PG" : "PG ▸ FB";
}
