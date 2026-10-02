# Fase 2 — Agente F: tela Receitas (`revenue`, rota `/receitas`) — relatório

Branch: `feat/fase-1-fundacao`. Nada commitado — tudo pendente na árvore de trabalho. Nenhum
arquivo compartilhado (`src/shared/**`, configs, `package.json`) foi tocado.

## Arquivos criados

```
src/modules/revenue/domain/revenue.ts
src/modules/revenue/domain/revenue.test.ts
src/modules/revenue/domain/revenue-csv.ts
src/modules/revenue/domain/revenue-csv.test.ts
src/modules/revenue/application/revenue-repository.ts
src/modules/revenue/infrastructure/api-revenue-repository.ts
src/modules/revenue/infrastructure/api-revenue-repository.test.ts
src/modules/revenue/ui/use-revenue-repository.ts
src/modules/revenue/ui/use-revenue-screen.ts
src/modules/revenue/ui/RevenuePage.tsx
src/modules/revenue/ui/RevenuePage.test.tsx
src/modules/revenue/ui/PeriodCard.tsx
src/modules/revenue/ui/DateField.tsx
src/modules/revenue/ui/OutOfWindowCard.tsx
src/modules/revenue/ui/SummaryCards.tsx
src/modules/revenue/ui/RevenueCharts.tsx
src/modules/revenue/ui/RevenueTrendCharts.tsx
src/modules/revenue/ui/RecentTransactionsCard.tsx
src/modules/revenue/ui/chart-format.ts
src/app/(panel)/receitas/page.tsx
tests/visual/fixtures/revenue.ts
tests/visual/scenarios/revenue.ts
```

Todo arquivo ficou abaixo de ~300 linhas (o maior, `RevenueTrendCharts.tsx`, tem 194).

## Endpoint usado

`GET /dashboard/revenue-approved` (via `apiRequest`, que prefixa `/api/v1`) — o MESMO que o
legado chama no modo LAN (`easyfoodmanagerWEB/src/lib/data-service.ts` →
`fetchRevenueApproved` → `adminApiGetJson("/v1/dashboard/revenue-approved…")`), confirmado
contra `easyfoodmanagerAPI/src/routes/v1/dashboard.ts`.

Parâmetros de querystring: `from`, `to` (`YYYY-MM-DD`), `recentOffset`, `recentLimit` — os
mesmos quatro do legado, sempre enviados (o servidor já tem defaults, mas a tela sempre tem
`from`/`to` no estado). Resposta: envelope `{ data: RevenueReport }`, campos idênticos ao
contrato do servidor (`period`, `byMethod`, `total`, `kpis`, `byHour`, `recentApproved`,
`recentApprovedMeta`, `byTotem`, `byProductTop10`, `byMonthYoY`, `byDay`) — ver
`src/modules/revenue/domain/revenue.ts`, que documenta a correspondência 1:1.

`GET /billing/plan-window` é usado indiretamente via `usePlanHistoryWindow()` (peça pronta da
Onda 0) — não implementado por mim, só consumido como o legado consome
`hooks/usePlanHistoryWindow.ts`.

## Decisões

- **Tipos do domínio espelham o contrato da API, não uma tradução para inglês "limpo".** Os
  nomes de campo do relatório (`byMethod`, `byDay`, `byHour`, `kpis`, `recentApproved`,
  `recentApprovedMeta`, `byTotem`, `byProductTop10`, `byMonthYoY`, `period`, `total`) e os
  campos vindos de linha crua (`payment_method`, `created_at`) foram mantidos exatamente como o
  servidor devolve. É a mesma abordagem do legado (`RevenueApprovedReport` em `mock-data.ts`):
  o servidor já calcula os agregados, o cliente só exibe — introduzir uma camada de tradução
  snake_case→camelCase aqui só criaria uma superfície de mapeamento sem ganho e com risco de
  divergir do contrato real. `formatBrl`, `METHOD_LABEL`, `CHART_FILL`, `pieChartRows`,
  `cumulativeByDay`, `rankTopProducts`, `minAllowedYmd`, `isPresetAllowed`, `isOutOfWindow` são
  as funções puras testadas (portadas dos `useMemo`/helpers do `ReceitasPage.tsx` legado).
- **Paginação infinita via `useInfiniteQuery`** (TanStack Query), com `queryKey` incluindo
  `tenant.companyId`/`tenant.storeId`/`from`/`to`. Cada página é uma chamada completa ao
  endpoint (o servidor recalcula os agregados a cada offset, como no legado); os KPIs/gráficos
  usam a última página buscada, e `recentApproved` é o `flatMap` de todas as páginas em cache —
  equivalente ao `recentRows` acumulado manualmente no legado.
- **"Atualizar dados" reproduz o comportamento "silencioso" do legado** (que descartava as
  páginas extras e recarregava só a primeira): antes do `refetch()`, o cache é truncado para
  `pages.slice(0, 1)` via `queryClient.setQueryData`, então o refetch busca de novo só o offset
  0. A API pública do TanStack Query v5.104 não expõe `refetch({ refetchPage })` no tipo
  `RefetchOptions` (isso existia em versões anteriores) — por isso o truncamento acontece antes,
  não como parâmetro do refetch.
- **`useRevenueRepository()` fica em `ui/`, não em `infrastructure/`** — segui o padrão que o
  agente de Transações (`src/modules/transactions/ui/use-transaction-repository.ts`) já tinha
  estabelecido na mesma onda, para manter os módulos consistentes entre si; o resto da `ui/` do
  módulo só importa esse hook, nunca `infrastructure/api-revenue-repository.ts` diretamente.
- **`fromYmdLocal`/`fmtPtBrFromYmd`** (`@/shared/date-period/date-period-presets`, peça da Onda
  0) substituem as funções locais `fromYmd`/`fmtPtDate` que o `ReceitasPage.tsx` legado
  duplicava — mesmo comportamento (inclusive o fallback `"Selecionar"`), sem recriar.
- **`useExternalAccess().openBilling`/`billingLoading`** (`@/shared/layout/external-access`,
  já existente no repo) substitui o `useBillingSSO()` do legado — mesma assinatura de uso
  (`openBilling(): Promise<void>`, `billingLoading: boolean`).
- **CSV**: `domain/revenue-csv.ts` foi adaptado do módulo REF (`revenue/domain/revenue-csv.ts`),
  mas com uma diferença de comportamento importante (ver abaixo).

## Diferenças conhecidas em relação ao legado

- **Sem `lazy`/`Suspense` para `recharts` e `react-day-picker`** (o legado faz
  `lazy(() => import(...))` para os gráficos e o calendário, como otimização de bundle). A tela
  migrada importa `Calendar` e os componentes do `recharts` diretamente. Visualmente idêntico
  (a tela sempre acaba montando os dois), só sem o code-splitting — não afeta a comparação de
  screenshot; se quiserem o split de volta, é um `dynamic(() => import(...), { ssr: false })`
  do Next em cima dos componentes já prontos.
- **CSV exporta só as linhas já carregadas na tela** (scroll infinito), igual ao legado — e
  DIFERENTE do que o `ApiRevenueRepository` do módulo REF faz (lá ele buscava TODAS as
  transações do período inteiro em lotes de `/transactions`, para um CSV completo). Não portei
  esse comportamento porque não é o que o `ReceitasPage.tsx` do legado faz hoje (o botão
  "Exportar CSV" do legado exporta exatamente `recentRows`, o estado acumulado do scroll — texto
  do próprio código: `exportCsv` usa `recentRows`, não uma nova consulta). Reproduzir o
  comportamento do REF teria sido uma mudança de contrato não pedida pelo brief ("mesmos
  endpoints, mesmos parâmetros, mesmo formato de resposta" do legado).
- **Nome do arquivo CSV**: mantive o padrão exato do legado,
  `receitas-aprovadas-tela-{from}-{to}.csv` — o módulo REF usa
  `receitas-aprovadas-{from}-{to}.csv` (sem `-tela-`); ajustei para bater com o legado.

## Candidatos a compartilhado

Nenhum. Tudo que a tela precisava de novo (`DateField`, `PeriodCard`, `OutOfWindowCard`,
`SummaryCards`, `RevenueCharts`/`RevenueTrendCharts`, `RecentTransactionsCard`,
`use-revenue-screen`) é específico da tela de Receitas (layout único, sem paralelo noutra tela
ainda migrada). `fromYmdLocal`/`fmtPtBrFromYmd` e `useExternalAccess` já eram compartilhados
(Onda 0 / já existentes) e foram só consumidos, não duplicados.

## Resultados dos testes

- `npx vitest run src/modules/revenue`: **4 arquivos, 25 testes, todos verdes** (domain: 17
  casos entre `revenue.test.ts` e `revenue-csv.test.ts`; infra: 2 casos de
  `api-revenue-repository.test.ts` mockando `apiRequest`; UI: 4 casos de `RevenuePage.test.tsx`
  — carregando, vazio, erro, com dados — mockando `apiRequest`/tenant/runtime).
- `npx tsc --noEmit` (projeto inteiro, incluindo `tests/visual/**`): **0 erros**.
- `npx eslint "src/modules/revenue" "src/app/(panel)/receitas"`: **0 erros / 0 avisos**.
- `npm run build` / `npm run test:visual`: NÃO rodados (conforme instrução — outros agentes
  ainda editando a árvore; fica para o controller na Onda 2).

## Observação para a Onda 2

`tests/visual/fixtures/revenue.ts` responde `GET /v1/dashboard/revenue-approved` com dados
fixos, independente da querystring — suficiente porque o harness compara legado × Next contra o
MESMO servidor de fixtures no mesmo instante (não é golden-image; ver
`tests/visual/visual.spec.ts` + `compare.ts`). Não escrevi fixture para `GET /billing/plan-window`
porque o cenário usa `mode: "lan"`, onde `usePlanHistoryWindow()` do Next não chama a API
(`backend !== "cloud"` devolve `UNLIMITED_WINDOW` direto). Do lado do LEGADO em modo LAN, porém,
`hooks/usePlanHistoryWindow.ts` não verifica `isAdminApiConfigured()` — só `isCloudApiMode()` —
e cai no branch do Supabase direto (`supabaseBilling.from("company_licenses")...`) quando a
flag de build `VITE_CLOUD_API` não está ligada. Isso é um comportamento pré-existente do legado,
não introduzido por esta migração, e também afeta as telas Orders/Transactions/NFC-e que usam o
mesmo hook — infraestrutura do harness (proxy/mocks de Supabase para o app legado nos testes
LAN) é decisão do controller/Onda 2, fora do escopo deste módulo.
