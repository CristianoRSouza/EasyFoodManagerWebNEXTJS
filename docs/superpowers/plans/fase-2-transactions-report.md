# Fase 2 — Agente D: tela Transações (`transactions`) — relatório

Branch: `feat/fase-1-fundacao`. Nada commitado — tudo pendente na árvore de trabalho. Nenhum
`git commit`/`merge`/`push`/`stash`/`reset` foi executado. Tocados apenas:
`src/modules/transactions/**`, `src/app/(panel)/transactions/page.tsx`,
`tests/visual/fixtures/transactions.ts`, `tests/visual/scenarios/transactions.ts`.

## Arquivos criados

```
src/modules/transactions/domain/transaction.ts
src/modules/transactions/domain/transaction.test.ts
src/modules/transactions/domain/transaction-detail.ts
src/modules/transactions/domain/transaction-detail.test.ts
src/modules/transactions/application/transaction-repository.ts
src/modules/transactions/infrastructure/transaction-mapper.ts
src/modules/transactions/infrastructure/transaction-mapper.test.ts
src/modules/transactions/infrastructure/api-transaction-repository.ts
src/modules/transactions/infrastructure/api-transaction-repository.test.ts
src/modules/transactions/ui/use-transaction-repository.ts
src/modules/transactions/ui/use-infinite-reveal.ts
src/modules/transactions/ui/PaymentMethodIcon.tsx
src/modules/transactions/ui/TransactionSummaryCards.tsx
src/modules/transactions/ui/TransactionFilters.tsx
src/modules/transactions/ui/TransactionPlanWindowNotice.tsx
src/modules/transactions/ui/TransactionMobileList.tsx
src/modules/transactions/ui/TransactionTable.tsx
src/modules/transactions/ui/TransactionDetailDialog.tsx
src/modules/transactions/ui/TransactionsPage.tsx
src/modules/transactions/ui/TransactionsPage.test.tsx
src/app/(panel)/transactions/page.tsx
tests/visual/fixtures/transactions.ts
tests/visual/scenarios/transactions.ts
```

Maior arquivo: `TransactionsPage.tsx` com 219 linhas (todos abaixo de ~300). A tela do legado
(`src/pages/Transactions.tsx`, 818 linhas) foi dividida em: `TransactionsPage.tsx`
(estado/filtros/janela do plano/orquestração), `TransactionSummaryCards.tsx` (3 cards de total),
`TransactionFilters.tsx` (selects de método/status + `DatePeriodPresetControls`),
`TransactionPlanWindowNotice.tsx` (card "fora do plano"), `TransactionMobileList.tsx` (cards
mobile), `TransactionTable.tsx` (tabela desktop), `TransactionDetailDialog.tsx` (modal TEF/PIX),
`PaymentMethodIcon.tsx` (ícone por método) e `use-infinite-reveal.ts` (scroll infinito
client-side, ver "Diferenças conhecidas").

## Endpoints usados (idênticos ao legado em modo LAN/Admin API)

- `GET /v1/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD` (querystring omitida quando ausente) —
  transações do período, com `tef_result` (jsonb) e os campos `pix_*` materializados.
- `GET /v1/orders?from=&to=` — comandas do período, usado só para traduzir `order_ids` da
  transação em código de barras (coluna "Comanda"); mesmo par de endpoints que
  `src/lib/data-service.ts` do legado usa (`fetchTransactions`/`fetchOrders`).

Confirmado contra `C:\Users\crist\Desktop\easyfoodmanagerAPI\src\routes\v1\transactions.ts` e
`orders.ts`: envelope `{ data: [...] }`, sem paginação/`meta.hasMore` (a API devolve o período
inteiro numa resposta, com limite de linhas por `X-Row-Limit`/`aplicarLimite`, não usado aqui —
igual ao legado, que também não manda `limit`).

## Decisões

- **Domain em camelCase** (`Transaction.orderIds`, `.paymentMethod`, `.tefResult`, `.pixQrcodeId`
  etc.), mapeado a partir do `snake_case` da API em `infrastructure/transaction-mapper.ts`
  (`mapTransactionRow`, testado) — mesma normalização de `mapTransactionRow` do legado
  (`src/lib/data-service.ts`), incluindo `tef_result` como objeto OU string JSON (decodificada
  com fallback para `null` em string inválida) e `amount` como `parseFloat` defensivo.
- **`TransactionRepository` com 2 métodos** (`list`, `orderBarcodes`) em vez do desenho
  `list(query)+detail(id)` paginado do módulo REF (`EASYCOMMAND REFATORADO/src/modules/transactions`)
  — o REF pagina no servidor (`limit`/`offset`/`meta.hasMore`) e busca o detalhe por uma segunda
  chamada; a easyfoodmanagerAPI real não pagina `/v1/transactions` (confirmado no route handler:
  sempre `{ data: r.rows }`) e o legado já traz o retorno do TEF/PIX na mesma linha da listagem —
  reproduzi esse contrato real em vez do desenho do REF. Reaproveitei do REF só a forma dos tipos
  de domínio (`Transaction`/`TefResultSnapshot` em inglês) e o padrão de normalização defensiva
  (`asText`/`asNumber`), reescritos localmente (sem depender de `@/shared/infrastructure/convert`,
  que não existe neste repo).
- **Sem endpoint de detalhe**: como no legado, o "detalhe" da transação (modal TEF/PIX) é
  renderizado a partir do mesmo objeto já carregado na listagem — não há segunda chamada de rede
  (`TransactionDetailDialog` recebe `Transaction | null`, não busca nada).
- **Não criei o módulo `orders`**: a tradução `order_ids → barcode` vive inteiramente dentro de
  `transactions` (`TransactionRepository.orderBarcodes`, `domain/transaction.ts#formatOrderBarcodes`),
  como instruído no brief.
- **Regras de negócio puras em `domain/transaction.ts`/`domain/transaction-detail.ts`**, com teste
  unitário para cada uma: `paymentMethodKey`/`paymentMethodLabel`, `filterTransactions`,
  `computeApprovedTotals`, `hasTefSnapshot`, `hasPixSnapshot`, `formatOrderIds`/
  `formatOrderBarcodes`, `formatReceiptLines`, `summarizeAditumConfirmation`,
  `getTefCancelFbSaleInfo` — extraídas das funções soltas do arquivo da página legada para serem
  testadas sem montar React.
- **Upsell de plano**: `usePlanHistoryWindow` (onda 0) + `useExternalAccess().openBilling`/
  `billingLoading` (em vez de `useBillingSSO`/`loading` do legado), como instruído. Textos/classes
  do card "Período fora do seu plano" copiados do legado, extraídos para
  `TransactionPlanWindowNotice.tsx`.
- **Dados via TanStack Query, não `useState`+`useLayoutEffect` manual**: o legado busca com um
  `useCallback`/`useLayoutEffect` próprio e um `loadGenRef` para descartar respostas antigas
  fora de ordem; troquei por `useQuery` (duas queries: `["transactions", companyId, storeId,
  from, to]` e `["transactions-order-barcodes", ...]`), que já resolve corrida de requisições pela
  própria `queryKey` — mesma regra do plano ("Dados via TanStack Query"). O botão "Atualizar
  dados" chama `refetch()` nas duas; o `PageRefreshButton` fica no modo não-controlado (gerencia o
  próprio spinner a partir da Promise), evitando duplicar o estado `refreshing` do legado.
- **Reset da paginação client-side sem `useEffect`**: o legado reseta `visibleCount` num
  `useLayoutEffect` disparado por `[methodFilter, statusFilter, dateFrom, dateTo]`. O ESLint deste
  repo (`react-hooks/set-state-in-effect`, no preset Next) rejeita `setState` síncrono dentro do
  corpo de um efeito, e (`react-hooks/refs`) rejeita escrever em `ref.current` durante a
  renderização — os dois padrões que a virtualização client-side do legado usa
  (`loadGenRef`-like refs mutados no corpo do componente + reset em efeito). Reescrevi
  `use-infinite-reveal.ts` com o padrão documentado do React ("ajustar estado quando uma prop
  muda": comparar `resetKey` com um estado-espelho durante a própria renderização, sem efeito) e
  removi os refs de leitura (`rowsLenRef`/`visibleCountRef`) — o efeito do `IntersectionObserver`
  já lista `rows.length`/`visibleCount` nas deps e é recriado a cada mudança, então não precisa de
  refs para ver o valor atual dentro do listener.

## Diferenças conhecidas vs. legado (com motivo)

- **Scroll infinito simplificado** (`use-infinite-reveal.ts`): mantive o mecanismo geral (abaixo
  de 200 linhas renderiza tudo; acima, `IntersectionObserver` + fallback de scroll/resize revela
  em lotes de 50 ao se aproximar do fim), incluindo a busca genérica do ancestral rolável
  (`overflowY: auto/scroll/overlay` com `scrollHeight > clientHeight`, que na prática encontra o
  `<main class="sidebar-scroll">` do `AppLayout`). O que **não** portei: a preferência explícita
  por `document.querySelector("main.sidebar-scroll")` (o fallback genérico já resolve isso no
  layout real), o `ResizeObserver` e o listener de `visualViewport.resize` (redimensionamento do
  teclado virtual no mobile). Efeito prático: idêntico para listas ≤ 200 transações (o caso comum
  e o único exercitado pelos testes/fixture, que não têm `IntersectionObserver` no jsdom); acima
  disso, a revelação incremental continua funcionando por scroll/observer, só sem o ajuste extra
  de teclado virtual mobile.
- **Refresh via `refetch()` do TanStack Query**, não `loadGenRef` manual — ver "Decisões". Efeito
  visual idêntico; a proteção contra corrida de requisições é de outra natureza (queryKey em vez
  de contador de geração), mas o resultado final (não deixar uma resposta antiga sobrescrever uma
  mais nova) é o mesmo.
- Fora esses dois pontos, JSX e classes Tailwind copiados 1:1 (renomeando só identificadores para
  os campos de domínio camelCase e para os nomes dos handlers).

## Candidatos a compartilhado

Nenhum novo. Tudo que a tela precisava (`useRequiredTenant`, `usePlanHistoryWindow`,
`useExternalAccess`, `DatePeriodPresetControls`, `StatusBadge`, `PageRefreshButton`, primitivas
`card/button/select/table/badge/dialog/separator/tooltip`) já existia em `src/shared/**` da onda 0
ou da Fase 1.

## Testes

- `npx vitest run src/modules/transactions` — **5 arquivos, 41 testes, todos verdes**:
  - `domain/transaction.test.ts` (18 testes): `paymentMethodKey`/`paymentMethodLabel`,
    `filterTransactions` (método/status/combinado), `computeApprovedTotals` (só aprovadas, por
    método), `hasTefSnapshot`, `hasPixSnapshot`, `formatOrderIds`/`formatOrderBarcodes`.
  - `domain/transaction-detail.test.ts` (10 testes): `formatReceiptLines`,
    `summarizeAditumConfirmation` (erro/HTTP com e sem confirmação), `getTefCancelFbSaleInfo`
    (coluna dedicada, fallback pro `tef_result`, mensagem padrão).
  - `infrastructure/transaction-mapper.test.ts` (5 testes): linha completa, campos ausentes,
    `tef_result` objeto/string-JSON/string-inválida, `amount` não numérico → 0.
  - `infrastructure/api-transaction-repository.test.ts` (6 testes, `apiRequest` mockado):
    querystring de período em `list`/`orderBarcodes`, ausência de `from`/`to`, resposta sem
    `data`, mapa `id → barcode` (com barcode nulo → string vazia, não `undefined`).
  - `ui/TransactionsPage.test.tsx` (4 testes, `apiRequest` mockado via `vi.mock` com
    `importActual`, `RuntimeProvider` real em modo `lan`, `useTenant` mockado): **carregando**
    (texto antes da resposta), **vazio** (aviso + 3 cards em R$ 0,00), **erro** (a busca falha e a
    tela cai no mesmo estado vazio do legado — o legado não tem banner de erro distinto nesta
    tela, só `console.error`) e **com dados** (transação PIX aprovada aparece na tabela com valor,
    NSU/comanda traduzida via `/v1/orders`, e no card de total de PIX).
- `npx tsc --noEmit` — **sem erros** (rodado no repo inteiro).
- `npx eslint src/modules/transactions "src/app/(panel)/transactions"` — **0 erros / 0 avisos**
  (inclusive as duas regras mais estritas do preset, `react-hooks/refs` e
  `react-hooks/set-state-in-effect`, que pegaram o padrão original do legado em
  `use-infinite-reveal.ts` — ver "Diferenças conhecidas").
- Não rodei `npm run build` nem `npm run test:visual`, conforme instruído.

## Preocupações para a Onda 2

- **BLOQUEANTE em potencial — colisão de rotas entre fixtures de módulos diferentes.**
  `tests/visual/fake-api.ts` (onda 0) carrega `tests/visual/fixtures/*.ts` e funde todas com
  `Object.assign(routes, fixtureModule.routes)` num único mapa global, por `readdirSync` (ordem
  alfabética na prática). **`orders.ts` (agente C) já define `/v1/orders` (com o pedido completo,
  barcode `000456`) e `/v1/transactions` (stub vazio); meu `transactions.ts` define os DOIS MESMOS
  caminhos** (`/v1/orders` com barcode `000789`, `/v1/transactions` com 2 transações fixas). Como
  `"orders.ts" < "transactions.ts"` alfabeticamente, meu arquivo carrega depois e **sobrescreve os
  dois no mapa global** — o que, se o `npm run test:visual` completo rodar os cenários
  `orders-lista` e `transactions-lista` no mesmo processo do fake-api (mesma instância por modo,
  iniciada uma vez), faria o cenário `orders-lista` do agente C ver o barcode `000789`/dados de
  transação em vez de `000456`, quebrando aquele teste (que espera `getByText("000456")`).
  **Não posso corrigir isto no meu escopo** (não devo editar `fake-api.ts` nem `orders.ts`). Duas
  saídas possíveis para o controller: (1) fazer `fake-api.ts` detectar colisão de chave entre
  arquivos de fixture e falhar alto (em vez de sobrescrever silenciosamente), o que pelo menos
  torna o problema visível cedo; ou (2) namespacing por cenário — cada `Scenario` carregar só as
  fixtures do seu próprio módulo, não um mapa global compartilhado por todos. Isso provavelmente
  afeta outros módulos da Onda 1 também (qualquer tela que precise ler `/v1/orders` ou
  `/v1/transactions`, ex.: `revenue`/`dashboard`, se também os usarem).
- `tests/visual/fixtures/transactions.ts`/`scenarios/transactions.ts` não foram executados
  (proibido nesta onda). Os dados são fixos (não dependem de `from`/`to`), então devem ser
  determinísticos — mas ver o ponto acima antes de rodar o `test:visual` completo.
