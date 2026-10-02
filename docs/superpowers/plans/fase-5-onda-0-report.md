# Fase 5 — Onda 0: base de sync (relatório)

> **Superado em parte por `fase-5-integracao-report.md`** (markdown/captura de tela, relator em `src/shared/errors`, licença em `src/shared/license`, Auditoria na loja, máscaras visuais removidas). Em caso de conflito, vale o relatório de integração.

Branch `feat/fase-1-fundacao`. Nada commitado: não usei `git commit`, `merge`, `push`, `stash`,
`reset`, `checkout` nem `restore`. Nenhum `.env` foi lido. Nenhum teste chama API ou Supabase de
verdade. Rodei `npx vitest` a partir de `/c/Users/...`, com o drive em maiúscula.

Este relatório cobre os **itens 2 e 3** do plano (`2026-09-30-fase-5-sync-e-demais.md`). O item 1
(primitiva `accordion`) ficou com outro agente, e esta onda **não adicionou primitivas**.

## 1. `src/shared/sync/`: o que veio de onde

| LEGACY | Next | Observação |
|---|---|---|
| `lib/sync-op-label.ts` | `sync-op-label.ts` | Cópia fiel |
| `lib/sync-log-status.ts` | `sync-log-status.ts` | Cópia fiel |
| `lib/friendly-labels.ts` | `friendly-labels.ts` | Cópia fiel. Hoje nenhuma tela de sync usa; pode servir à Auditoria/billing |
| `components/sync/ErrorSummary.tsx` | `ErrorSummary.tsx` + `sync-apply-error.ts` | O `parseError` virou `parseSyncApplyError`, lógica pura sem ícone. O ícone por categoria ficou no componente |
| `components/sync/PayloadDetails.tsx` | `PayloadDetails.tsx` + `payload-format.ts` | `formatValue` → `formatPayloadValue`. `data: any` virou `unknown` |
| `components/sync/SyncEventsPanel.tsx` (813 linhas) | ver abaixo | Dividido em arquivos de 38 a 190 linhas |

Divisão do `SyncEventsPanel` (JSX, classes e textos idênticos ao legado):

- `SyncEventsPanel.tsx`: composição, estados de loading e erro, botão "Atualizar dados" e o
  `TooltipProvider delayDuration={200}`.
- `use-sync-events-panel.ts`: todo o estado e a carga. As 8 consultas rodam em `allSettled`.
  Só a falha de `summary` vira erro da tela. A paginação é de 50 em 50. Reenfileirar recarrega
  sem mostrar o toast "Dados atualizados". A carga inicial acontece só na montagem.
- `SyncSummaryCards.tsx`: os 5 KPIs.
- `SyncEntityCards.tsx`: `SyncByEntityCard` e `SyncBacklogCard`.
- `SyncFailureCards.tsx`: `SyncActiveRetriesCard`, `SyncFailureGroupsCard` e
  `SyncRecentFailuresCard`.
- `SyncRecentEventsCard.tsx`: a lista de "últimos eventos" e o `IntersectionObserver` do sentinela.
- `SyncRecentEventRow.tsx`: a linha expansível, com detalhe, `ErrorSummary` e `PayloadDetails`.
- `SyncBadges.tsx`: `SyncOpBadge` e `SyncStatusBadge`. O segundo é o `statusBadge` que o legado
  montava com `buildStatusBadge`.
- `sync-events-format.ts`: as regras puras.
- `sync-events-types.ts`: as interfaces.

### Ramos Electron/mock/Supabase

O legado **já recebia os dados por `fetchers`**. A escolha entre Electron, Admin API e Supabase
acontecia nas telas: `lib/local-sync-monitor.ts` e `pages/CloudSyncMonitor.tsx`. Os seis
arquivos copiados não tinham ramo de modo nenhum. Por isso a porta é a própria
`SyncEventsPanelFetchers` mais o `onResetInboxToPending` opcional, e cada tela da Onda 1 injeta a
sua implementação. Não precisei criar nenhuma outra porta.

### Desvios documentados

1. **Collapsible.** O legado usa `@radix-ui/react-collapsible`, que não é dependência direta
   deste projeto. Hoje ele só existe em `node_modules` porque entrou junto com
   `react-accordion`, e depender disso é frágil. `SyncRecentEventRow` reproduz o DOM que o Radix
   gera:
   - `div[data-state]` › `button[type=button][aria-expanded][aria-controls][data-state]`;
   - `div[data-state=open][id]`, montado só quando a linha está aberta.

   Não há mudança visual.
2. **`fmtDate`** usa `formatDateTime` de `@/shared/format/date-time`, que dá o mesmo resultado
   (`toLocaleString("pt-BR")`, e "—" quando o valor falta).
3. **Mensagem de erro.** `err?.message ?? String(err)` virou `errorMessage(err)`, com
   `unknown` em vez de `any`. O resultado é o mesmo para `Error`, para objetos com `message` e
   para valores primitivos.
4. **Carga inicial.** O `useEffect` de montagem tem `eslint-disable-next-line` para
   `react-hooks/set-state-in-effect` e para `exhaustive-deps`, com justificativa, no mesmo padrão
   do repo. É o `loadData()` de montagem do legado.

## 2. API para as telas da Onda 1 (agentes A e B)

Importe cada arquivo pelo caminho (não há barrel): `@/shared/sync/<arquivo>`.

### Componentes

- **`SyncEventsPanel(props: SyncEventsPanelProps)`**, em `SyncEventsPanel.tsx`. Também reexporta
  os tipos `Panel*` e `SyncEventsPanelFetchers`.

  ```ts
  interface SyncEventsPanelProps {
    description: ReactNode;          // texto abaixo do título da aba
    successStatusKey: string;        // "applied" (inbox) | "dispatched" (outbox)
    successLabel: string;            // KPI de sucessos
    rateLabel: string;               // ex.: "Aplicados (60min)"
    recentTitle: string;             // título de "últimos eventos"
    refreshSuccessMsg: string;       // descrição do toast "Dados atualizados"
    loadingLabel: string;            // texto do loading inicial
    fetchers: SyncEventsPanelFetchers;
    onResetInboxToPending?: (eventId: string) => Promise<void>; // só inbox local: mostra o botão de reenfileirar
  }
  interface SyncEventsPanelFetchers {
    summary(): Promise<PanelSummary>;
    byEntity(): Promise<PanelByEntity[]>;
    failures(): Promise<PanelFailureGroup[]>;
    activeRetries(limit: number): Promise<PanelActiveRetry[]>;      // chamado com 100
    backlog(): Promise<PanelBacklogItem[]>;
    recentFailures(limit: number): Promise<PanelRecentFailure[]>;   // chamado com 30
    rate(): Promise<PanelRatePoint[]>;
    recentAll(limit: number, offset: number): Promise<PanelRecentEvent[]>; // 50, offset crescente
  }
  ```

  Os tipos `PanelSummary`, `PanelByEntity`, `PanelActiveRetry`, `PanelBacklogItem`,
  `PanelFailureGroup`, `PanelRecentFailure`, `PanelRatePoint` e `PanelRecentEvent` têm os mesmos
  campos do legado (`sync-events-types.ts`). A única diferença é `PanelRecentEvent.payload`, que
  agora é `unknown`.

  O painel carrega **só na montagem**. Para recarregar com fetchers novos (por exemplo, ao trocar
  de loja), troque a `key` do componente, como faria no legado.
- **`ErrorSummary({ error: string; entityName?: string })`**: não renderiza nada quando `error`
  está vazio.
- **`PayloadDetails({ data: unknown; level?: number })`**.
- **`SyncOpBadge({ op: string; className?: string })`**: precisa de um `TooltipProvider` acima
  dele.
- **`SyncStatusBadge({ status: string; successKey: string })`**.
- Os cards internos (`SyncSummaryCards`, `SyncByEntityCard`, `SyncBacklogCard`,
  `SyncActiveRetriesCard`, `SyncFailureGroupsCard`, `SyncRecentFailuresCard`,
  `SyncRecentEventsCard` e `SyncRecentEventRow`) também são exportados, caso uma tela precise de
  um deles isolado.

### Funções puras

- `getSyncOpPresentation(op) → { short, tooltip }`
- `syncLogStatusIsSuccess(status)` e `syncLogStatusIsError(status)`. O `mirror-ui.tsx` do Espelho
  (agente B) usa `syncLogStatusIsSuccess`.
- `friendlyDescription`, `friendlyFunction`, `friendlyAction` e `friendlyBillingAction`, mais os
  mapas `FUNCTION_LABELS`, `ACTION_LABELS` e `BILLING_ACTION_LABELS`.
- `parseSyncApplyError(raw, entityName?) → ParsedSyncApplyError`, além de
  `SYNC_APPLY_ERROR_CATEGORY_LABELS` e do tipo `SyncApplyErrorCategory`.
- `formatPayloadValue(v)` e `isPlainObject(v)`.
- Em `sync-events-format.ts`:
  - rótulos e regras: `formatRelativeAgo(d, now?)`, `nextRetryLabel(next, now?)`,
    `inboxEventCanRequeue({status, retry_count})`, `syncStatusBadgeStyle(successKey, status)`,
    `recentEventRowTone(status, successKey, isOpen)`, `successTimestampLabel(successKey)` e
    `sumRate(rate)`;
  - constantes: `SYNC_EVENTS_PAGE_SIZE` (50), `SYNC_ACTIVE_RETRIES_LIMIT` (100) e
    `SYNC_RECENT_FAILURES_LIMIT` (30).

## 3. Testes

O legado não tinha teste para nenhum destes arquivos, então todos os testes abaixo são novos:

- `sync-labels.test.ts`: op-label, log-status e friendly-labels.
- `sync-apply-error.test.ts`: as categorias, o SQLSTATE vencendo o texto, os campos extraídos e
  as dicas.
- `sync-events-format.test.ts`: as regras do painel e `payload-format`.
- `ErrorSummary.test.tsx`: o `ErrorSummary` e o `PayloadDetails`.
- `SyncEventsPanel.test.tsx`, com 7 casos:
  - loading, KPIs e limites pedidos;
  - falha do `summary` × falha das outras consultas;
  - refresh com toast;
  - expandir e recolher;
  - sem reenfileirar;
  - reenfileirar sem o toast "Dados atualizados" e sem expandir a linha;
  - "Carregar mais" com offset 50.

## 4. Comandos

| Comando | Resultado |
|---|---|
| `npx vitest run src/shared/sync` | 5 arquivos, **37 testes verdes** |
| `npx eslint src/shared/sync` | 0 erros / 0 avisos |
| `npx tsc --noEmit` | 0 erros em `src/shared/sync`. Os 2 erros que restam são de outro agente, que ainda está trabalhando: `src/app/(panel)/{manual,wizard}/page.tsx` importam `@/modules/{manual,setup}/ui/*`, que ainda não existem |

## 5. Riscos

- **`<button>` dentro de `<button>`.** O botão de reenfileirar fica dentro do botão da linha,
  como no legado (HTML inválido). No `next dev` isso pode gerar um aviso de aninhamento no
  console. Mantive assim por paridade.
- **Nenhuma comparação visual.** Os cenários de `/sync` ficam com o agente A.
