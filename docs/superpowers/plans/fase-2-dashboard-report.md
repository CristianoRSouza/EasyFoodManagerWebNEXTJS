# Fase 2 — Dashboard (relatório)

Branch: `feat/fase-1-fundacao`. Nada commitado — tudo pendente na árvore de trabalho. Único arquivo
compartilhado tocado: `src/app/(panel)/page.tsx` (era um stub vazio — troquei por `<DashboardPage />`).

## Arquivos criados

```
src/modules/dashboard/domain/service-health.ts
src/modules/dashboard/domain/service-health.test.ts
src/modules/dashboard/domain/dashboard-snapshot.ts
src/modules/dashboard/domain/dashboard-snapshot.test.ts
src/modules/dashboard/application/dashboard-repository.ts
src/modules/dashboard/infrastructure/dashboard-mappers.ts
src/modules/dashboard/infrastructure/dashboard-mappers.test.ts
src/modules/dashboard/infrastructure/api-dashboard-repository.ts
src/modules/dashboard/infrastructure/api-dashboard-repository.test.ts
src/modules/dashboard/use-dashboard-repository.ts
src/modules/dashboard/ui/dashboard-charts.tsx
src/modules/dashboard/ui/service-health-grid.tsx
src/modules/dashboard/ui/dashboard-stat-cards.tsx
src/modules/dashboard/ui/nfce-attention-panel.tsx
src/modules/dashboard/ui/sync-chart-panel.tsx
src/modules/dashboard/ui/transactions-chart-panel.tsx
src/modules/dashboard/ui/recent-sync-errors-panel.tsx
src/modules/dashboard/ui/dashboard-page.tsx
src/modules/dashboard/ui/dashboard-page.test.tsx
tests/visual/fixtures/dashboard.ts
tests/visual/scenarios/dashboard.ts
```

## Arquivos alterados

```
src/app/(panel)/page.tsx   (stub vazio → renderiza <DashboardPage />)
```

## Endpoints usados (mesmos caminhos `/v1/*` na easyfoodmanagerAPI e na EasyFoodAPI — o proxy do
Next escolhe o servidor por `backend`)

Todos confirmados lendo `easyfoodmanagerAPI/src/routes/v1/{dashboard,sync,nfce}.ts` (fonte real do
modo loja) e `easyfoodmanagerWEB/src/lib/cloud-api-data.ts` (confirma que a EasyFoodAPI implementa
os MESMOS caminhos para `/dashboard/stats`, `/dashboard/transactions-by-day` e
`/nfce/attention-counts`, e que `/dashboard/sync-by-hour`/`/sync/logs` não fazem sentido pedir na
nuvem — não há repositório local da EasyFoodAPI para conferir byte a byte).

- `GET /dashboard/stats` — sempre chamado (loja e nuvem). `{ data: { activeProducts, openOrders,
  todayTransactions, recentErrors, lastSuccessSync: { created_at } | null, serviceHeartbeats: {
  sync, nfce, tef, sync_pg_sb, pix_pixnopdv_service } } }`.
- `GET /dashboard/transactions-by-day` — sempre chamado. `{ data: [{ day, total, amount }] }`.
- `GET /nfce/attention-counts` — sempre chamado. `{ data: { manualReview, reconcileFailed,
  unusable } }`.
- `GET /dashboard/sync-by-hour` — só quando `backend === "lan"`. `{ data: [{ hour, ok, error }] }`.
- `GET /sync/logs?limit=500` — só quando `backend === "lan"`. `{ data: SyncLog[] }`; o módulo
  filtra client-side (`status !== "success" && status !== "ok"`, top 10) — mesma regra do legado,
  que também filtra no `data-service.ts` em vez de pedir um endpoint dedicado.

## Decisões

- **Um repositório só (`ApiDashboardRepository`), não Lan/Cloud separados.** Recebe `(tenant,
  backend)` no construtor. `backend` decide, dentro do repositório, se as duas chamadas de
  sincronização acontecem — a tela (`DashboardPage`) só decide se ESCONDE as seções
  correspondentes (via `useRuntime().backend`), não se busca os dados. Replica a decisão do
  legado (`cloudMode = isCloudSupabaseMode()` esconde grelha de serviços, gráfico de sync, card
  "Erros Sync (24h)" e lista de erros) com a mesma causa raiz: `sync_log`/`sync_heartbeat` só
  existem no PostgreSQL da loja.
- **Cliques nos totais de NFC-e sem solução** apontam para `/nfce?status=manual_review`,
  `/nfce?status=all&reconcileStatus=failed` e `/nfce?status=unusable` — os mesmos nomes de query
  param que `GET /v1/nfce/notes` já aceita (`montarFiltrosDeNotas` em
  `easyfoodmanagerAPI/src/routes/v1/nfce.ts`), não a convenção ad-hoc em português que o
  `EASYCOMMAND REFATORADO/src/modules/dashboard/ui/DashboardPage.tsx` inventou
  (`/nfce?reconciliacao=falhou`) — não usei a UI do REF (regra do brief), só confirmei que o
  domínio dele reconhece as mesmas três categorias. Quando o módulo `nfce` for migrado (outro
  agente/onda), ele só precisa ler esses dois query params.
- **Atualização automática**: o legado reimplementa manualmente um `setInterval(60s)` pausado por
  `visibilitychange`. Troquei por `useQuery({ refetchInterval: 60_000 })` — o TanStack Query já
  usa `focusManager` (que escuta `visibilitychange`/`focus`) e não busca em background por padrão
  (`refetchIntervalInBackground: false`), mesmo comportamento sem reimplementar nada.
- **Health dos serviços é função pura e testável** (`domain/service-health.ts`,
  `heartbeatHealth`/`computeSyncHealth` recebem `now` explícito) — porta 1:1 da lógica que estava
  inline em `useMemo` no componente do legado.
- **Não criei os módulos `nfce`/`sync`** (fora do escopo desta tela, conforme instrução) — as
  leituras de `sync/logs` e `nfce/attention-counts` vivem dentro de
  `infrastructure/api-dashboard-repository.ts`, só para o que o Dashboard precisa.

## Diferenças conhecidas em relação ao legado

- **Sem code-splitting manual do recharts.** O legado usa `lazy()` + `Suspense` para carregar
  `DashboardCharts` num chunk separado (~200kb). Fiz um import direto em
  `ui/dashboard-charts.tsx`. Não afeta o visual (só o bundle); o Next/Turbopack já faz seu próprio
  code-splitting por rota. Se a Onda 2 quiser paridade de performance, dá para trocar por
  `next/dynamic(..., { ssr: false })` sem tocar no resto do módulo.
- **`serviceHeartbeats` do fixture (`tests/visual/fixtures/dashboard.ts`) usa datas fixas bem no
  passado** (2024-01-01), de propósito: os cards de saúde ficam sempre "Serviço parado"/"Sem ping
  na base" — cor/estado determinísticos independente de quando o teste visual rodar. Datas
  "recentes" mudariam de verde para vermelho conforme o tempo passasse entre escrever a fixture e
  rodar o teste.

## Candidatos a compartilhado

Nenhum. Os componentes de UI (`DashboardCharts`, `ServiceHealthGrid`, etc.) são específicos desta
tela — nenhuma outra tela da Onda 1 usa gráfico de sincronização, atenção de NFC-e ou grelha de
heartbeat de serviços.

## Resultados dos testes

- `npx vitest run src/modules/dashboard` — **5 arquivos de teste, 43 testes, todos verdes**
  (domain: `service-health.test.ts` 15, `dashboard-snapshot.test.ts` 8; infrastructure:
  `dashboard-mappers.test.ts` 12, `api-dashboard-repository.test.ts` 3; ui:
  `dashboard-page.test.tsx` 5 — carregando, vazio, erro, dados completos na loja, seções de sync
  escondidas na nuvem).
- `npx tsc --noEmit` — **sem erros nos meus arquivos** (os dois erros restantes no projeto são em
  `src/modules/revenue/**`, de outro agente rodando em paralelo na mesma árvore — fora do meu
  escopo).
- `npx eslint src/modules/dashboard "src/app/(panel)/page.tsx"` — **0 erros / 0 avisos**.
- Não rodei `npm run build` nem `npm run test:visual` (instrução do brief — outros agentes ainda
  editam a árvore; o controller roda tudo ao final da Onda 1).

## Observação sobre a árvore compartilhada

`git status` mostra bastante coisa untracked/modificada que não é minha (outros módulos da Onda 1
em `src/app/(panel)/{orders,products,receitas,transactions,units}`, `src/modules/{orders,products,
revenue,transactions,units}`, `package.json`/`package-lock.json`, `src/server/backend/error-body.*`,
`tests/visual/{fake-api.ts,visual.spec.ts}` — os 5 outros agentes da Onda 1 trabalhando em
paralelo, conforme o plano). Não toquei em nenhum desses arquivos.
