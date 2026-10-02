# Fase 2: revisão final

Revisão feita só com leitura, sobre tudo o que `git status` mostra na branch `feat/fase-1-fundacao` (nada foi commitado):

- os módulos `dashboard`, `products`, `orders`, `transactions`, `units` e `revenue`;
- `src/shared/**`, `src/app/(panel)/**` e `tests/visual/**`;
- `package.json` e `tsconfig.json`;
- `src/server/backend/error-body.ts`.

Não rodei comandos nem servidores. Os números de teste, build e visual vêm de `fase-2-integracao-report.md`.

**Contratos conferidos com `easyfoodmanagerAPI/src/routes/v1`.** Caminhos, parâmetros e campos batem com a API e com o legado. As rotas conferidas foram:

- `/dashboard/stats`, `/dashboard/sync-by-hour`, `/dashboard/transactions-by-day` e `/dashboard/revenue-approved` (`from`, `to`, `recentOffset`, `recentLimit`);
- `/nfce/attention-counts` e `/sync/logs?limit=500`;
- `/orders` e `/order-items` (com `from`/`to`), e `/transactions` (com `from`/`to` e com `orderId`);
- `/products`, `/products/:id/fiscal` e `/cbs/product-fiscal-ibscbs?classCode`;
- `/units`.

No produto nenhum código de cliente importa `src/server`. `domain/` e `application/` não usam React, Next nem HTTP. Na `ui/`, só os hooks `use-*-repository.ts` (o ponto de composição previsto no plano) importam `infrastructure/`. Nenhum teste chama uma API ou um Supabase de verdade: as chamadas passam por `vi.mock` e o teste visual pelo `fake-api`.

---

## Críticos

Nenhum. Não achei caminho, parâmetro ou nome de campo errado frente à API real, nem falha de segurança (token em JS, Supabase no navegador) ou de tenant que exponha dado de outra loja.

---

## Importantes

### I1. "Atualizar dados" de Comandas nunca mostra falha

`src/modules/orders/ui/OrdersPage.tsx:70-81`

- **Problema:** o `invalidateQueries` do TanStack Query v5 conclui sem erro mesmo quando o refetch falha (`throwOnError: false` é o padrão), então o `catch` nunca roda. Com a API fora do ar, aparece "Dados atualizados".
- **Contexto:** é o mesmo defeito que a integração corrigiu em Receitas.
- **Correção:** usar `refetch()` das duas consultas, como Transações faz:
  ```ts
  const [o, i] = await Promise.all([ordersQuery.refetch(), itemsQuery.refetch()]);
  if (o.isError || i.isError) { /* toast Falha */ } else { /* toast OK */ }
  ```
  Invalidar `["order-transactions", …]` pode continuar como está.
- **Teste:** um teste em `OrdersPage.test.tsx` com `apiRequest` rejeitando no refresh.

### I2. "Atualizar" de Receitas fura o bloqueio da janela do plano

`src/modules/revenue/ui/use-revenue-page.ts:70-79`

- **Problema:** `refetch()` ignora `enabled: !outOfWindow`. Com o período fora do plano, o clique dispara `GET /dashboard/revenue-approved` do intervalo bloqueado e mostra o toast "Atualizado".
- **Como o legado faz:** `loadFirstPage` (`ReceitasPage.tsx:183-197`) não faz a requisição e mostra o toast "Período fora do plano".
- **Correção:** no começo de `refresh`, se `outOfWindow` for verdadeiro, mostrar o toast `Período fora do plano / O seu plano permite consultar a partir de ${minAllowedLabel}` e sair, como `TransactionsPage.tsx:92-102`.
- **Teste:** um teste que garanta que o refresh fora da janela não chama o repositório.

### I3. Dados fiscais em cache sem o tenant na chave

`src/modules/products/ui/ProductFiscalDetails.tsx:18,24`

- **Problema:** as chaves `["product-fiscal", productId]` e `["product-fiscal-ibscbs", classCode]` não levam `companyId`/`storeId`. Isso quebra a regra do plano ("`queryKey` incluindo `tenant.companyId`/`tenant.storeId`").
- **Risco:** na nuvem, ao trocar de empresa, a tela pode mostrar do cache a classificação IBS/CBS ou os dados fiscais de outra empresa com o mesmo id ou código.
- **Correção:** `const tenant = useRequiredTenant();`, depois `["product-fiscal", tenant.companyId, tenant.storeId, productId]` e o mesmo para a consulta IBS/CBS.

### I4. Produtos troca a lista inteira por "Não foi possível carregar" quando um refresh ou uma página seguinte falha

`src/modules/products/ui/ProductsPage.tsx:279` e `use-products-page.ts:235`

- **Problema:** `isError: query.isError` também fica verdadeiro quando já há dados e só o refetch ou o `fetchNextPage` falhou. A lista some.
- **Como o legado faz:** mantém a lista e mostra só o toast.
- **Correção:** expor `isError: query.isLoadingError` (erro só na primeira carga) e deixar o toast do `handleRefresh` para as outras falhas.

### I5. Dashboard: uma rota que falha zera a tela inteira, e o refresh não avisa nada

`src/modules/dashboard/infrastructure/api-dashboard-repository.ts:39-55` e `ui/DashboardPage.tsx:109`

- **Problema:** o Next usa `Promise.all`. Se `/nfce/attention-counts` falhar (por exemplo, uma loja sem `nfce_notes`), o snapshot inteiro rejeita: aparece o banner de erro e todos os cards ficam em zero.
- **Como o legado faz:** usa `Promise.allSettled` (`Dashboard.tsx:128-148`), de propósito ("se uma chamada falhar, as outras ainda atualizam a UI"), e mostra os toasts "Dados atualizados" e "Falha ao atualizar" no refresh.
- **Justificativa:** nenhum relatório justifica essa divergência.
- **Correção:**
  - usar `Promise.allSettled` no repositório;
  - devolver o `DashboardSnapshot` com fallback por parte e uma lista `failedParts`, ou manter os valores anteriores via `placeholderData`;
  - no `DashboardPage`, `onClick={async () => { const r = await refetch(); toast(r.isError ? … : …) }}`.
- **Performance (mesma mudança):** juntar as duas ondas (`snapshot()` e `loadSyncData()`) num único `Promise.all(Settled)`, porque hoje elas rodam em sequência.

### I6. Nuvem: fotos dos itens de comanda somem, e a foto de produto depende de um formato não confirmado

Arquivos: `orders/infrastructure/api-order-repository.ts:59-61`, `orders/ui/OrderItemImage.tsx`, `shared/ui/image-utils.ts:24-30`.

**Comandas na nuvem**

- **Como o legado faz:** busca `/v1/product-images?ids=` em lote (`Orders.tsx:291-317`).
- **Como o Next faz:** lê um `image_url` em `/order-items` que o legado nunca usou.
- **Efeito:** o mais provável é que nenhum item mostre foto.

**Foto de produto na nuvem**

- **Como o legado faz:** converte o caminho do bucket `product-images` em URL pública.
- **Como o Next faz:** usa o valor como está.
- **Efeito:** se a EasyFoodAPI devolver caminho relativo, o `<img src>` fica quebrado.

**Por que é Importante:** a divergência foi registrada nos relatórios (onda 0 e Comandas), mas continua aberta e sem cenário visual na nuvem.

**Correção:**

- em `ApiOrderRepository`, para `backend === "cloud"`, buscar `/product-images?ids=` com os `product_id` dos itens e preencher `imageUrl`;
- confirmar na EasyFoodAPI se `image_url` já vem absoluto;
- se não vier, resolver a URL no servidor, nunca com Supabase no navegador.

### I7. Tenant "obrigatório por construção" está mais fraco em três repositórios

- **Onde:**
  - `dashboard/infrastructure/api-dashboard-repository.ts:35`
  - `orders/infrastructure/api-order-repository.ts:86`
  - `units/infrastructure/api-unit-repository.ts:9`
- **Problema:** os construtores recebem `TenantHeaders`, em que `storeId` é opcional e aceita null. Products, Transactions e Revenue recebem `Tenant`.
- **Correção:** trocar os três para `Tenant` (de `@/shared/tenant/use-required-tenant`), para o compilador impedir um repositório sem loja.

### I8. Duplicação entre Comandas e Transações (o usuário pediu zero *code smell*)

- **Mapeador duplicado.** Dois mapeadores diferentes leem a mesma linha de `GET /transactions`: `orders/infrastructure/api-order-repository.ts:65-79` (`toTransaction`) e `transactions/infrastructure/transaction-mapper.ts:11-35` (`mapTransactionRow`). Eles já divergem entre si:
  - `installments`: `asNumber` num, `Number` no outro;
  - `tefCancelFbSaleAlreadyClosed`: `=== true` num, `Boolean()` no outro.

  Correção: um só mapeador de transação, com o tipo, em `src/shared/`. O módulo de Comandas usa um `Pick<>` dele.
- **Tipo duplicado.** `TefResultSnapshot` existe em `orders/domain/transaction.ts:2` e em `transactions/domain/transaction.ts:2`. Unificar junto com o mapeador.
- **Rótulo duplicado.** O rótulo do método de pagamento aparece duas vezes: `orders/domain/order-rules.ts:8-15` (`formatTransactionMethod`) e `transactions/domain/transaction.ts` (`paymentMethodKey`/`paymentMethodLabel`). Correção: um único `paymentMethodLabel` compartilhado; o fallback "Outro" de Comandas vira um parâmetro.
- **Montagem de query string repetida três vezes:**
  - `toRangeQuery` em `api-order-repository.ts:10-16`
  - `buildQuery` em `api-transaction-repository.ts:9-15`
  - `toQueryString` em `api-product-repository.ts:25-33`

  Os tipos `DateRange` e `TransactionDateRange` também são idênticos. Correção: `toQueryString` e `DateRange` em `src/shared/http/`.
- **`interface Envelope<T>` três vezes:** `api-dashboard-repository.ts:17`, `api-revenue-repository.ts:6` e `shared/plan/use-plan-history-window.ts:15`. Correção: exportar de `shared/http`.
- **Regra da janela do plano duplicada.** Comandas e Transações repetem a mesma sequência: `minAllowed`, `minAllowedLabel`, `outOfWindow`, o efeito do toast e `handleAdjustToMinAllowed`. Os dois ainda diferem entre si (deps de um lado, `eslint-disable` do outro).
  - Onde: `OrdersPage.tsx:41-68,121-126` e `TransactionsPage.tsx:43-61,117-122`.
  - Correção: um hook `usePlanPeriodGuard({ period, dateFrom, dateTo, setters })` em `shared/plan/`.

### I9. Unidades: código morto e mapeamento fora do padrão

`units/infrastructure/api-unit-repository.ts:16-39` e `units/domain/unit.ts:25-29`

- **Código morto:** `UnitQuery.search` e o filtro por termo só recebem `DEFAULT_UNIT_QUERY` (busca vazia). Nenhuma tela tem busca de unidade.
- **Mapeamento inline:** `Number(...)` e `Boolean(...)`. Com `Boolean`, o texto `"false"` vira `true`. Os outros módulos usam `shared/infrastructure/convert` (`asNumber`, `asBoolean`, `asText`).
- **Nomes em português:** os identificadores `unidades` e `termo` contrariam a convenção que a integração aplicou nos outros módulos.
- **Correção:** tirar `UnitQuery`/`DEFAULT_UNIT_QUERY` e fazer `list(): Promise<Unit[]>`, com um `unit-mapper.ts` que use `convert`. O teste do filtro em `api-unit-repository.test.ts` sai junto.

---

## Menores

1. **Memoização do repositório de Produtos.** `products/ui/use-product-repository.ts` memoiza por `[tenant, backend]`, e a identidade de `tenant` muda a cada render (`tenant-context.tsx:91,127`), então o repositório é recriado a cada render. Os outros quatro hooks memoizam pelos campos, com `eslint-disable` repetido quatro vezes.
   - Correção: `useMemo` da `selection` em `tenant-context.tsx`.
   - Efeito: todos os hooks passam a depender de `[tenant]` e os quatro `eslint-disable` somem.
2. **Conversão repetida no Dashboard.** `dashboard/infrastructure/dashboard-mappers.ts:74-115` repete `Number(x ?? 0) || 0` e `String(x ?? "")` em vez de usar `asNumber`/`asText` do `shared/infrastructure/convert.ts`.
3. **Mapeadores de Comandas fora do padrão.** `orders/infrastructure/api-order-repository.ts:22-79` exporta os mapeadores dentro do arquivo do repositório. Products e Transactions têm `*-mapper.ts` próprio. Correção: mover para `order-mapper.ts`.
4. **Casos de uso só repassam.** `products/application/product-use-cases.ts` só repassa para o repositório (`listProductsPage(repo)(q)` equivale a `repo.listPage(q)`), e só Produtos tem essa camada. `product-repository.ts:21` reexporta tipos do domínio sem necessidade. Correção: remover os dois e chamar o repositório direto, como os outros módulos.
5. **Cores dos gráficos.** `revenue/ui/RevenueTrendCharts.tsx:62` e vizinhas usam `"hsl(var(--chart-1))"` literal, mas `CHART_FILL` já existe. Além disso, `CHART_FILL` (CSS) está em `revenue/domain/revenue.ts`. Correção: mover `CHART_FILL` para `revenue/ui/chart-format.ts` e usá-lo nos dois gráficos.
6. **Tipo não usado.** `transactions/ui/TransactionsPage.tsx:40` declara `useState<string>` quando o tipo `TransactionStatusFilter` já existe. Correção: usar o tipo.
7. **`as any` em teste.** `revenue/ui/RevenuePage.test.tsx:23,25` usa `as any`, e o plano diz "sem `any`". Correção: `vi.stubGlobal("IntersectionObserver", ObserverStub)`.
8. **Testes sem o caso de erro.** `units/ui/UnitsPage.test.tsx` não cobre o estado de erro que o plano exige (carregando, vazio, erro, com dados). Os testes de Unidades e do Dashboard estão em inglês ("should render…"); os outros módulos, em português. Correção: acrescentar o caso de erro (hoje cai em "Nenhuma unidade cadastrada", como no legado) e padronizar a língua.
9. **Refresh de Comandas fora do plano.** Com o período fora do plano, "Atualizar" mostra "Dados atualizados". Transações e o legado de Receitas mostram "Período fora do plano". Correção: a mesma guarda do item I2.
10. **Porta 3001 em conflito no teste visual.**
    - `IMAGE_SERVER_PORT = 3001` (`shared/ui/image-utils.ts:5`) é a mesma porta do Next de nuvem em `tests/visual/playwright.config.ts:39-41`.
    - Efeito: no cenário LAN, as fotos de produto vão ao Next de nuvem, que responde 404 HTML. As duas apps caem no placeholder e o teste passa, mas por acaso.
    - Correção: subir o Next de nuvem na porta 3002, ou servir `/images/*.jpg` num servidor fixo do harness.
11. **`<div className="contents">` dentro do `<tbody>`.** Está em `orders/ui/OrdersDesktopTable.tsx` e foi copiado do legado (`Orders.tsx:708`). É DOM inválido e gera aviso `validateDOMNesting` em desenvolvimento. Pode ficar por paridade de pixels. Alternativa: `<Fragment key>`, depois de confirmar que o visual não muda.
12. **Caso de borda em `toErrorBody`.** Em `src/server/backend/error-body.ts:41-48`, se `error` for texto humano e `message` também vier preenchido, o texto humano vira `code`. Correção: aplicar `isMachineCode` também nesse ramo (`code: errorText && isMachineCode(errorText) ? errorText : http_${status}`).
13. **Texto desatualizado em Produtos.** `products/ui/ProductFiscalDetails.tsx:59-61` cita "Supabase" e "Electron / Admin API". É cópia do legado, e o relatório de Produtos já registra. Rever o texto quando a EasyFoodAPI expuser dados fiscais.

---

## Veredito

**Pronto para o usuário revisar: Com correções.**

A base é sólida: contratos batem com a API real, as camadas estão respeitadas, o tenant chega a todas as chamadas e testes e visual estão verdes segundo o relatório de integração.

**Corrigir antes do commit:**

- I1, I2 e I4: toasts e estados de erro divergentes do legado;
- I3: chave de cache sem tenant;
- I5: Dashboard sem `allSettled`;
- I7: tipo de tenant opcional;
- I8 e I9: duplicações e código morto, que o usuário pediu explicitamente para não ter.

**Pode ficar para a fase seguinte, desde que registrado:** I6 (imagens na nuvem). Ela depende de confirmar o contrato da EasyFoodAPI.

---

## Correções pós-revisão

Fechamento desta revisão: I1, I2, I3, I4, I5, I7, I8, I9 e todos os Menores, exceto o
`<div className="contents">` (mantido de propósito, paridade visual) e I6 (fora do alcance —
depende do contrato da EasyFoodAPI para fotos, não confirmável nesta sessão). Nada foi
commitado; TDD em cada item com comportamento observável (teste novo/ajustado antes da correção).

### Importantes

- **I1** — `src/modules/orders/ui/OrdersPage.tsx:66-87`: `refresh()` agora chama
  `ordersQuery.refetch()`/`itemsQuery.refetch()` (em vez de `invalidateQueries`, que nunca lança
  erro) e escolhe o toast por `isError`. De quebra, ganhou a guarda de janela do plano que faltava
  (ver Menor 9). Teste: `OrdersPage.test.tsx` (`"Atualizar dados mostra falha quando o refetch
  falha"` e `"...mostra sucesso quando o refetch funciona"`, com `@/shared/ui/use-toast` mockado).
- **I2** — `src/modules/revenue/ui/use-revenue-page.ts:78-95`: `refresh()` sai cedo com o toast
  "Período fora do plano" quando `outOfWindow`, sem chamar `refetch()`. Teste novo:
  `use-revenue-page.out-of-window.test.tsx` (backend `cloud`, plano de 7 dias, período padrão já
  fora da janela — confere que a API não é chamada depois do `refresh()`).
- **I3** — `src/modules/products/ui/ProductFiscalDetails.tsx:18-27`: as duas `queryKey` (
  `product-fiscal`, `product-fiscal-ibscbs`) agora incluem `tenant.companyId`/`tenant.storeId`.
  Teste novo: `ProductFiscalDetails.test.tsx` (mesmo `QueryClient`, troca de tenant entre dois
  renders, confere 2 chamadas de API em vez de 1 vinda do cache).
- **I4** — `src/modules/products/ui/use-products-page.ts:108-116`: `isError` passou a vir de
  `query.isLoadingError` (só a 1ª carga sem dados), não `query.isError` (que também fica
  verdadeiro num refresh/próxima página falhos). Testes: `use-products-page.test.tsx`
  ("isError só na 1ª carga") e `ProductsPage.test.tsx` ("refresh falhando mantém a lista visível").
- **I5** — `src/modules/dashboard/infrastructure/api-dashboard-repository.ts:39-95`: as 5 chamadas
  (loja) ou 3 (nuvem) viraram uma onda só de `Promise.allSettled` — a que falhar fica zerada e
  entra em `failedParts` (`src/modules/dashboard/domain/dashboard-snapshot.ts`, campo novo), sem
  derrubar o resto do snapshot nem gerar `isError` na query. `DashboardPage.tsx:38-49,79`: o botão
  "Atualizar dados" ganhou `handleRefresh` com toast de sucesso/falha (como as outras telas), e o
  `refetch()` de `snapshot()`+`loadSyncData()` (antes sequenciais) virou uma chamada só. Testes:
  `api-dashboard-repository.test.ts` ("uma rota falhando... não derruba as outras", "nenhuma
  falha: failedParts vem vazio") e `DashboardPage.test.tsx` (dois testes do toast do refresh).
- **I7** — `Tenant` (não `TenantHeaders`) no construtor de `ApiDashboardRepository`
  (`dashboard/infrastructure/api-dashboard-repository.ts:51`), `ApiOrderRepository`
  (`orders/infrastructure/api-order-repository.ts:17`) e `ApiUnitRepository`
  (`units/infrastructure/api-unit-repository.ts:11`) — `storeId` deixou de ser opcional/nulo por
  tipo, igual a Products/Transactions/Revenue. Sem teste novo: é checagem do compilador
  (`npm run typecheck`), não comportamento em runtime.
- **I8** — duplicações eliminadas, todas com uma fonte única em `src/shared/`:
  - **Mapeador/tipo de transação**: `src/shared/domain/transaction.ts` (tipo `Transaction` +
    `TefResultSnapshot`, completos) e `src/shared/infrastructure/transaction-mapper.ts`
    (`mapTransactionRow`, único). `transactions/domain/transaction.ts` e
    `transactions/infrastructure/transaction-mapper.ts` viraram re-exports (mantêm todo import
    existente funcionando). `orders/domain/transaction.ts` agora é um `Pick<>` do tipo
    compartilhado; `orders/infrastructure/order-mapper.ts` (novo — ver Menor 3) projeta o
    resultado do mapeador único no recorte de Comandas, em vez de recalcular
    `installments`/`tefCancelFbSaleAlreadyClosed` com lógica própria. As duas divergências viraram
    uma coisa só: `installments` sempre por `asNumber`, `tefCancelFbSaleAlreadyClosed` sempre
    `=== true` (nunca `undefined`). Teste ajustado (TDD): `transaction-mapper.test.ts` — o campo
    ausente agora mapeia para `false`, não `undefined` (+ teste novo confirmando `"true"` string
    não vira `true`). `transaction.test.ts`/`transaction-detail.test.ts`: fábricas de teste
    ajustadas de `tefCancelFbSaleAlreadyClosed: undefined` para `false` (o tipo virou boolean
    obrigatório).
  - **Rótulo de método de pagamento**: `paymentMethodLabel(method, unknownFallback?)` em
    `src/shared/domain/transaction.ts` — parâmetro novo cobre o fallback "Outro" de Comandas.
    `orders/domain/order-rules.ts:8-15`: `formatTransactionMethod` virou um `return
    paymentMethodLabel(method, "Outro")`. Testes existentes de ambos os módulos continuam
    passando sem alteração (comportamento idêntico).
  - **Query string / `DateRange`**: `src/shared/http/query-string.ts` (`toQueryString`, a versão
    genérica que já existia em Produtos) e `src/shared/domain/date-range.ts` (tipo `DateRange` —
    em `domain/`, não `http/`, porque `application/` não pode importar `@/shared/http/*`, regra
    de lint do próprio repo). `orders/application/order-repository.ts`,
    `transactions/application/transaction-repository.ts` re-exportam de lá.
    `api-order-repository.ts`, `api-transaction-repository.ts`, `api-product-repository.ts` usam
    `toQueryString` único (as três implementações locais — `toRangeQuery`, `buildQuery`, a cópia
    local de `toQueryString` — saíram).
  - **`Envelope<T>`**: `src/shared/http/envelope.ts`, usado por `api-dashboard-repository.ts`,
    `api-revenue-repository.ts` e `use-plan-history-window.ts` (as três declarações locais
    saíram).
  - **Guarda da janela do plano**: `src/shared/plan/use-plan-period-guard.ts` (novo hook
    `usePlanPeriodGuard`) — `minAllowed`, `minAllowedLabel`, `outOfWindow`, o efeito do toast e
    `handleAdjustToMinAllowed`, antes duplicados (e já divergentes) em `OrdersPage.tsx` e
    `TransactionsPage.tsx`. As duas telas passaram a usar o hook; o `eslint-disable` do efeito
    ficou só dentro do hook, uma vez. Receitas não usa este hook — o cálculo de janela por lá é
    outro domínio (`revenue/domain/revenue.ts`, `isOutOfWindow`/`minAllowedYmd` sobre
    `from`/`to`, não um preset), e o fix do I2 foi local.
- **I9** — `src/modules/units/domain/unit.ts`: `UnitQuery`/`DEFAULT_UNIT_QUERY` removidos;
  `application/unit-repository.ts`: `list()` sem parâmetro;
  `infrastructure/unit-mapper.ts:12` (novo arquivo): `toUnit()` usa `asNumber`/`asText`/`asBoolean`
  de `shared/infrastructure/convert`, em vez de `Number(...)`/`String(...)`/`Boolean(...)` —
  corrige o bug real de `Boolean("false") === true`; `infrastructure/api-unit-repository.ts`:
  `list()` só busca e mapeia, sem filtro em memória. `ui/use-units-query.ts` chama `repository.list()`.
  Teste ajustado: `api-unit-repository.test.ts` — chamadas viraram `.list()`, o teste do filtro por
  termo saiu (função não existe mais), e entrou um teste novo para o bug do `Boolean` nativo
  (`is_fractional`/`is_active: "false"` → `false`, não `true`).

### Menores

1. `src/shared/tenant/tenant-context.tsx`: `selection` memoizado com `useMemo` nos dois provedores
   (`useCloudTenant`, `useLanTenant`) — antes era recalculado (objeto novo) a cada render. Os 5
   hooks `use-*-repository.ts` (orders, dashboard, units, transactions, revenue) passaram a
   depender só de `[tenant]` (ou `[tenant, backend]` no Dashboard), sem `eslint-disable`.
   `products/ui/use-product-repository.ts` não mudou (já memoizava por `[tenant, backend]`; só
   passou a funcionar de fato, porque `tenant` agora é estável).
2. `src/modules/dashboard/infrastructure/dashboard-mappers.ts`: as 6 funções de mapeamento usam
   `asNumber`/`asText` de `shared/infrastructure/convert`, em vez de `Number(x ?? 0) || 0` /
   `String(x ?? "")` repetidos. Sem mudança de comportamento (testes existentes intactos).
3. `src/modules/orders/infrastructure/order-mapper.ts` (novo): `toOrder`, `toOrderItem` e
   `toTransaction` saíram de dentro de `api-order-repository.ts` (que ficou só com a classe).
4. `src/modules/products/application/product-use-cases.ts` removido;
   `application/product-repository.ts:19` (reexport de `Product`/`ProductPage`/`ProductQuery`)
   removido. `ui/use-products-page.ts` e `ui/ProductFiscalDetails.tsx` chamam o repositório
   direto (`repository.listPage(...)`, `repository.fiscal(...)`, `repository.fiscalIbsCbs(...)`).
5. `CHART_FILL` saiu de `revenue/domain/revenue.ts` para `revenue/ui/chart-format.ts` (é cor de
   UI, não regra de domínio). `RevenueTrendCharts.tsx` (gráfico "Receita por hora do dia") passou
   a usar `CHART_FILL.credit/.debit/.pix` em vez dos literais `"hsl(var(--chart-1))"` etc.;
   `RevenueCharts.tsx` e `SummaryCards.tsx` importam de `./chart-format` agora.
6. `src/modules/transactions/ui/TransactionsPage.tsx:38`: `statusFilter` agora é
   `useState<TransactionStatusFilter>`, não `useState<string>`.
7. `src/modules/revenue/ui/RevenuePage.test.tsx`: `vi.stubGlobal("IntersectionObserver"/
   "ResizeObserver", ObserverStub)` no lugar de `(globalThis as any).IntersectionObserver = ...`
   (2 `as any` + 2 `eslint-disable` a menos).
8. `src/modules/units/ui/UnitsPage.test.tsx`: descrições traduzidas para PT-BR + teste novo do
   estado de erro (`isError: true` cai em "Nenhuma unidade cadastrada", como o legado — nenhuma
   mudança de código, só o teste que faltava).
   `src/modules/dashboard/ui/DashboardPage.test.tsx`: descrições também traduzidas para PT-BR.
9. Coberto pela mesma mudança do I1 (`OrdersPage.tsx:67-76`): com o período fora do plano,
   "Atualizar dados" agora mostra "Período fora do plano" (não mais "Dados atualizados"), igual a
   Transações. Teste: cenário coberto indiretamente pelo `usePlanPeriodGuard` (hook único do
   Menor "guarda da janela", em I8) — o comportamento de bloqueio do refresh é o mesmo hook usado
   pelas duas telas.
10. `tests/visual/playwright.config.ts:32-40` e `tests/visual/scenario.ts:5`: o Next de nuvem subiu
    de `3001` para `3002` — `3001` é `IMAGE_SERVER_PORT` (`shared/ui/image-utils.ts:5`), a mesma
    porta que o cenário LAN usa para fotos de produto.
11. **Não alterado, de propósito** — `<div className="contents">` em `OrdersDesktopTable.tsx`,
    copiado do legado para paridade de pixels.
12. `src/server/backend/error-body.ts:41-49`: `isMachineCode` passou a valer também no ramo final
    (`code: errorText && isMachineCode(errorText) ? errorText : http_${status}`) — antes, `error`
    humano com `message` preenchido virava `code` por engano. Testes novos em
    `error-body.test.ts` (dois casos: `error` humano + `message`, e `error` código + `message`).
13. `src/modules/products/ui/ProductFiscalDetails.tsx:59-61`: o texto da nuvem sem dados fiscais
    trocou "Supabase" → "EasyFoodAPI" e "Electron / Admin API" → "loja (LAN)" — a Fase 2 não usa
    Electron nem Supabase; era cópia literal do legado.

### Resultado dos comandos (após as correções)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 erros |
| `npm run lint` | 0 erros / 0 avisos |
| `npm test` | 67 arquivos, **394 testes verdes** (eram 65/380) |
| `npm run build` (`BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999`) | sucesso |
| `npm run test:visual` | **24/24 verdes** (12 cenários × desktop/mobile), sem diff — inclusive com o Next de nuvem na porta 3002 (Menor 10) |

Nenhum comando de git (`commit`/`merge`/`push`/`stash`/`reset`/`checkout`/`restore`) foi usado;
tudo continua não commitado. Nenhum `.env` foi lido.
