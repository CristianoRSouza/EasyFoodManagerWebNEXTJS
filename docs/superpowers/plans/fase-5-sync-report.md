# Fase 5 — Onda 1, agente A: Sincronização `/sync` (relatório)

> **Superado em parte por `fase-5-integracao-report.md`** (markdown/captura de tela, relator em `src/shared/errors`, licença em `src/shared/license`, Auditoria na loja, máscaras visuais removidas). Em caso de conflito, vale o relatório de integração.

Branch `feat/fase-1-fundacao`. Nada commitado: não usei `git commit`, `merge`, `push`, `stash`,
`reset`, `checkout` nem `restore`. Nenhum `.env` lido. Nenhum teste chama API ou Supabase de verdade
(`apiRequest` simulado). Vitest rodado a partir de `/C/Users/...`.

## 1. Arquivos criados

| Arquivo | Papel |
|---|---|
| `src/app/(panel)/sync/page.tsx` | Rota fina → `<SyncPage />` |
| `src/modules/sync/domain/sync-log.ts` (+ `.test.ts`) | `SyncLog`, filtros (status/direção/tabela), KPIs, tabelas distintas, paginação de 50 — regras do `filtered` do `SyncMonitor` legado |
| `src/modules/sync/domain/sync-queue.ts` | Tipo `SyncQueue = "inbox" \| "outbox"` |
| `src/modules/sync/application/sync-repository.ts` | Porta: `listLogs`, `queueFetchers(fila)`, `resetInboxToPending` |
| `src/modules/sync/infrastructure/api-sync-repository.ts` (+ teste) | `ApiSyncRepository(tenant)` — rotas `/v1/sync/*` pelo repasse |
| `src/modules/sync/infrastructure/sync-queue-mapper.ts` (+ teste) | Linhas das rotas → tipos `Panel*` do `SyncEventsPanel` (colunas por fila) + `normalizeSyncPayload` |
| `src/modules/sync/infrastructure/sync-log-mapper.ts` (+ teste) | Linha de `sync_log` → `SyncLog` |
| `src/modules/sync/ui/SyncPage.tsx` | Escolhe o monitor por `useRuntime().backend` (como `App.tsx` do legado) |
| `src/modules/sync/ui/LocalSyncMonitorPage.tsx` | Monitor da loja (cabeçalho, faixa informativa, abas Log/Inbox/Outbox) |
| `src/modules/sync/ui/SyncLogTab.tsx`, `SyncLogList.tsx` | Aba "Log": KPIs, filtros, cartões mobile + tabela desktop, paginação |
| `src/modules/sync/ui/LocalQueuePanel.tsx` | Abas Inbox/Outbox da loja (texto + `SyncEventsPanel`) |
| `src/modules/sync/ui/CloudSyncMonitorPage.tsx` | Monitor da nuvem (porta do `CloudSyncMonitor`) |
| `src/modules/sync/ui/use-sync-repository.ts`, `use-sync-logs-query.ts`, `use-local-sync-monitor.ts`, `use-sync-log-view.ts` | Repositório memoizado por tenant, query do log, refresh/`key` dos painéis, filtros+página |
| `src/modules/sync/ui/SyncPage.test.tsx` | 11 testes de tela (loja e nuvem) |
| `tests/visual/fixtures/sync.ts` | 17 rotas `/v1/sync/{inbox,outbox}/*` (+ `reset-to-pending`) |
| `tests/visual/scenarios/sync.ts` | `sync-log-carregado` (lan), `sync-inbox-carregado` (lan), `sync-nuvem-inbox` (cloud) |

Maior arquivo de produção: `sync-queue-mapper.ts` (160 linhas).

## 2. Endpoints usados

Todos com os cabeçalhos de tenant (`x-company-id`/`x-store-id`) via `apiRequest`.

| Uso | Rota | Parâmetros | Backend |
|---|---|---|---|
| Aba Log | `GET /sync/logs` | `limit=500` | só loja |
| Resumo | `GET /sync/{inbox,outbox}/summary` | — | loja e nuvem |
| Por entidade × status | `GET /sync/{fila}/by-entity` | — | ambos |
| Falhas por erro | `GET /sync/{fila}/failures-by-error` | — | ambos |
| Retry ativo | `GET /sync/{fila}/active-retries` | `limit=100` | ambos |
| Backlog | `GET /sync/{fila}/backlog` | — | ambos |
| Últimas falhas | `GET /sync/{fila}/recent-failures` | `limit=30` | ambos |
| Taxa 60 min | `GET /sync/inbox/apply-rate`, `GET /sync/outbox/dispatch-rate` | — | ambos |
| Últimos eventos | `GET /sync/{fila}/recent-all` | `limit=50&offset=N` | ambos |
| Reenfileirar | `POST /sync/inbox/reset-to-pending` | corpo `{ event_id }` (aparado) | só loja |

Loja: conferido em `easyfoodmanagerAPI/src/routes/v1/{sync,sync-local-panel}.ts` (resumo vem como
objeto; listas como array; `outbox` traz `changed_at`/`dispatch_status`/`dispatch_error`).
Nuvem: os mesmos caminhos que `LEGACY/src/lib/cloud-sync-{inbox,outbox}.ts` usa no modo API
(`consultar` → `fetchApiSyncPanel`, nome derivado da RPC `cloud_sync_<fila>_<recurso>`), com as
mesmas colunas das RPC. O mapper aceita o resumo como objeto ou como linha dentro de array.

**Armadilha da nuvem:** o legado em produção lê as RPC do Supabase; todas as 16 consultas do
`CloudSyncMonitor` têm rota equivalente no cliente `cloud-api-data.ts`, então **nenhuma parte da
tela ficou "Indisponível nesta instalação"**. Não há Supabase no navegador. O contrato da EasyFoodAPI
de nuvem não pôde ser conferido no servidor (o código dela não está neste computador); segui o
cliente legado, como pede o plano.

## 3. Decisões

- **Escolha do monitor** por `backend`: nuvem → `CloudSyncMonitorPage`; loja → `LocalSyncMonitorPage`.
- **Painéis** vêm prontos de `@/shared/sync/SyncEventsPanel`; o módulo só injeta
  `fetchers` (`repository.queueFetchers(fila)`, memoizado). Um mapper único serve às duas filas e aos
  dois backends (o legado tinha três mapeamentos quase iguais).
- **Recarga dos painéis:** loja — `key` = `local-{fila}-{eventsPanelsKey}`, incrementado a cada
  "Atualizar dados" bem-sucedido do topo (igual ao legado); nuvem — `key` = `cloud-{fila}-{storeId}`
  (remonta ao trocar de loja).
- **Log** com TanStack Query (`["sync","logs",companyId,storeId]`), `retry: false` e sem recarga ao
  focar: o legado buscava uma vez, sem novas tentativas. Refresh usa `refetch()` e olha
  `result.isError` (toasts "Dados atualizados"/"Falha ao atualizar" com os textos do legado).
- **Filtros e página** do log ficam no nível da página (`use-sync-log-view.ts`), porque o `Tabs`
  desmonta a aba inativa e no legado eles sobreviviam à troca de aba.
- **Domínio em camelCase** (`SyncLog`); os tipos `Panel*` continuam snake_case porque são o
  contrato do painel compartilhado da Onda 0.

## 4. Diferenças conhecidas em relação ao legado

1. **Ramo "Disponível somente no aplicativo desktop" do `SyncMonitor` não portado.** Só aparecia
   com `isCloudSupabaseMode()`, e nesse caso o `App.tsx` já abre o `CloudSyncMonitor` — código morto.
2. **"Ver espelho FB↔PG" sempre visível na loja.** No legado dependia de `isSyncMirrorAvailable()`,
   verdadeiro exatamente no Modo 2 (navegador + Admin API), que é o modo loja do Next; era falso só
   no Electron (que o Next não tem) e na nuvem (que não mostra esta aba).
3. **Reenfileirar** sempre disponível na aba Inbox da loja (legado: `isAdminApiConfigured() ||
   isElectron()` — sempre verdadeiro no modo loja do Next). Na nuvem nunca aparece, como no legado.
4. **Bug corrigido — data das falhas do outbox na loja.** No modo Admin API o legado repassava
   cruas as linhas de `outbox/active-retries` e `outbox/recent-failures`, que trazem a data em
   `changed_at`; o painel lê `received_at` e mostrava "—". O mapper usa `changed_at` (como o próprio
   legado já fazia no ramo nuvem). Só aparece com falhas/retries no outbox — a fixture visual não
   tem nenhuma, e nenhum cenário abre a aba Outbox.
5. **Conversão de tipos:** o legado da loja repassava cruas `failures`, `backlog`, `activeRetries`
   e `recentFailures`; aqui tudo passa por mapper (números com `asNumber`, texto com `String(v ?? "")`).
   Sem efeito visual com a API real (que já devolve `::int`).
6. **Payload em texto JSON** é convertido para objeto também na nuvem (no legado, só na loja). A
   EasyFoodAPI devolve `jsonb` como objeto, então na prática não muda nada.
7. **`error_message` só com espaços** vira ausente (`asText`) — o legado mostraria os espaços.

## 5. Candidatos a compartilhado

- `HIDE_NON_PARITY_CHROME` (máscara do menu do usuário + botão de IA do legado) está duplicada em
  `scenarios/bootstrap.ts` e `scenarios/sync.ts`. Poderia ir para `tests/visual/scenario.ts`, ou sumir
  quando o agente D entregar o Assistente IA.
- O fluxo "login na nuvem + escolher a loja Centro" também se repete nos cenários de nuvem
  (`openCloudPanel`, análogo a `openLanPanel`).

## 6. Testes e verificação

| Comando | Resultado |
|---|---|
| `npx vitest run src/modules/sync/` | 5 arquivos, **42 testes verdes** |
| `npx tsc --noEmit` | 0 erros (precisou de `NODE_OPTIONS=--max-old-space-size=6144`: com os outros agentes rodando, o padrão estourou a memória) |
| `npx eslint src/modules/sync "src/app/(panel)/sync/page.tsx" tests/visual/{fixtures,scenarios}/sync.ts` | 0 erros / 0 avisos |

Testes de tela (`SyncPage.test.tsx`): loja — carregando, vazio ("Nenhum registro", 1 / 1), erro na
carga inicial (sem card de erro, como o legado), com dados (KPIs, linhas, link do espelho, só
`/sync/logs` pedido com tenant), refresh com sucesso e com falha, aba Inbox (rotas + reenfileirar
com POST), aba Outbox (sem reenfileirar); nuvem — abre na aba Inbox sem aba Log e sem `/sync/logs`,
sem reenfileirar, erro do resumo vira o card "Erro ao carregar dados".

Não rodei `npm run build` nem `npm run test:visual` (regra da onda). Numa execução, o Vitest acusou
"Worker exited unexpectedly" sem falha de teste; rodei de novo duas vezes e ficou limpo — atribuo à
máquina carregada pelos outros agentes.

## 7. Pontos de atenção para a Onda 2

- `sync-nuvem-inbox` é o primeiro cenário de nuvem com painel de dados; depende do cabeçalho de
  nuvem (plano/licença/IA do agente D). Se o agente D já tiver entregado o botão de IA no Next, a
  máscara do botão passa a esconder os dois lados, o que continua correto.
- O `SyncRecentEventRow` tem `<button>` dentro de `<button>` (reenfileirar), herdado do legado (ver
  relatório da Onda 0); o cenário `sync-inbox-carregado` tem um evento `failed`, então o botão aparece
  e o `next dev` pode mostrar o aviso de aninhamento no console.
