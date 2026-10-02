# Fase 2 — Agente C: tela Comandas (`orders`) — relatório

Branch: `feat/fase-1-fundacao`. Nada commitado — tudo pendente na árvore de trabalho. Tocados
apenas: `src/modules/orders/**`, `src/app/(panel)/orders/page.tsx`,
`tests/visual/fixtures/orders.ts`, `tests/visual/scenarios/orders.ts`.

## Arquivos criados

```
src/modules/orders/domain/order.ts
src/modules/orders/domain/order-item.ts
src/modules/orders/domain/transaction.ts
src/modules/orders/domain/order-rules.ts
src/modules/orders/domain/order-rules.test.ts
src/modules/orders/application/orders-repository.ts
src/modules/orders/infrastructure/api-orders-repository.ts
src/modules/orders/infrastructure/api-orders-repository.test.ts
src/modules/orders/use-orders-query.ts
src/modules/orders/use-order-items-query.ts
src/modules/orders/use-order-transactions-query.ts
src/modules/orders/ui/order-item-image.tsx
src/modules/orders/ui/order-transactions-panel.tsx
src/modules/orders/ui/orders-mobile-list.tsx
src/modules/orders/ui/orders-desktop-table.tsx
src/modules/orders/ui/orders-page.tsx
src/modules/orders/ui/orders-page.test.tsx
src/app/(panel)/orders/page.tsx
tests/visual/fixtures/orders.ts
tests/visual/scenarios/orders.ts
```

Nenhum arquivo passa de ~280 linhas (o maior é `orders-desktop-table.tsx`, 275). A tela original
do legado (920 linhas) foi dividida em: `orders-page.tsx` (estado/filtros/janela do plano),
`orders-mobile-list.tsx` (cards), `orders-desktop-table.tsx` (tabela), `order-transactions-panel.tsx`
(painel de transações por comanda) e `order-item-image.tsx` (foto do item).

Convenção de nomes de arquivo (kebab-case) e de campos de domínio (camelCase) seguidas conforme o
módulo `units` (agente E), já presente na árvore quando comecei — é o padrão real já em uso no
repo, mais consistente do que o `snake_case` do legado.

## Endpoints usados (idênticos ao legado em modo LAN)

- `GET /v1/orders?from=YYYY-MM-DD&to=YYYY-MM-DD` (querystring omitida quando ausente) — comandas
  do período.
- `GET /v1/order-items?from=&to=` — itens de TODAS as comandas do período (carregado à parte,
  igual ao legado — precisa somar subtotal de cada linha da listagem simultaneamente).
- `GET /v1/transactions?orderId=<uuid>` — transações vinculadas a UMA comanda; só é buscado
  quando a linha é expandida (lazy), igual ao legado (`fetchTransactionsByOrderId`).

Confirmado contra `C:\Users\crist\Desktop\easyfoodmanagerAPI\src\routes\v1\orders.ts` e
`transactions.ts` (mesmos parâmetros e envelope `{ data: [...] }`).

## Decisões

- **Domain em camelCase, mapeamento snake_case→camelCase na infraestrutura**
  (`api-orders-repository.ts`, funções `toOrder`/`toOrderItem`/`toTransaction`, testadas). Valores
  numéricos (`amount`, `subtotal`, `unit_price`, `quantity`) são coeridos com `Number`/`parseFloat`
  no mapeamento (equivalente ao `Number(...)` que o legado aplica na renderização) — evita repetir
  a coerção em cada componente de UI.
- **`OrdersRepository` com 3 métodos** (`listOrders`, `listOrderItems`,
  `listTransactionsByOrderId`) em vez do desenho `list(query)+detail(order)` do módulo REF
  (`EASYCOMMAND REFATORADO/src/modules/orders`) — o REF pagina no servidor e busca itens/pagamentos
  só ao abrir uma comanda; o legado (e esta tela) carregam TODAS as comandas e TODOS os itens do
  período de uma vez (para render de subtotal em toda linha simultaneamente) e só adiam a busca de
  transações — comportamento visual e de rede que a tela precisa reproduzir 1:1. Reaproveitei do
  REF apenas a forma dos tipos de domínio (Order/OrderItem/Transaction em inglês, `TefResultSnapshot`)
  e o padrão de mapeamento defensivo (`asText`/`asNumber`), não a UI nem a paginação.
- **Regras de negócio puras em `domain/order-rules.ts`**, com teste unitário para cada uma:
  `getFirebirdLinkStatus` (prioridade cabeçalho→linhas), `totemItemsPendingSync`,
  `getOrderTefCancelInfo`/`getTransactionTefCancelInfo` (fallback de mensagem), `filterOrders`
  (busca+status), `sumActiveItemsSubtotal`, `formatDateTime`, `formatTransactionMethod` — extraídas
  do componente legado (que as tinha como funções soltas no arquivo da página) para poderem ser
  testadas sem montar React.
- **Reset da paginação sem `useEffect`**: o legado reseta `visiveis` num `useEffect` disparado por
  `[search, statusFilter, orders]`. O ESLint deste repo (regra `react-hooks/set-state-in-effect`,
  ligada por padrão no preset Next) rejeita `setState` direto dentro de efeito. Troquei pelo padrão
  documentado do React ("ajustar estado quando uma prop muda"): comparar a tripla atual com um
  estado-espelho durante a renderização e disparar o `setState` ali, fora de `useEffect` — mesmo
  comportamento, zero warning.
- **Imagem do item**: sem a consulta em lote `productImagesQuery` (Cloud) do legado — a onda 0 já
  havia decidido que `useProductImageUrl(barcode, imageUrl)` (2 backends) resolve por item, não por
  lote via `product_id`. `OrderItem.imageUrl` vem do campo opcional `image_url` da resposta da API;
  a LAN não o envia (mapeia para `null`, foto resolvida por barcode no servidor local de imagens);
  não havia repositório da EasyFoodAPI (nuvem) disponível localmente para confirmar se ela já
  populará esse campo — mesmo aviso que a onda 0 deixou registrado para Products/Orders.
- **Upsell de plano**: `usePlanHistoryWindow` (onda 0) + `useExternalAccess().openBilling` (em vez
  de `useBillingSSO`), como instruído. Textos/classes do card "Período fora do seu plano" copiados
  do legado.

## Diferenças conhecidas vs. legado

- Nenhuma diferença visual pretendida — JSX e classes Tailwind copiados 1:1 (renomeando só
  identificadores para os campos de domínio camelCase).
- A única divergência funcional real é a de imagem de item em modo nuvem descrita acima (herdada
  de uma decisão da onda 0, não desta tela).

## Candidatos a compartilhado

Nenhum. Tudo que a tela precisava (`useRequiredTenant`, `usePlanHistoryWindow`,
`useExternalAccess`, `DatePeriodPresetControls`, `StatusBadge`, `PageRefreshButton`,
`useProductImageUrl`, primitivas `card/button/input/select/table/badge`) já existia em
`src/shared/**` da onda 0 ou já estava disponível no repo.

## Testes

- `npx vitest run src/modules/orders` — **3 arquivos, 44 testes, todos verdes**:
  - `domain/order-rules.test.ts` (25 testes): formatação de data/método, avisos de cancelamento
    TEF (comanda e transação, com fallback de mensagem), `totemItemsPendingSync`,
    `getFirebirdLinkStatus` (7 casos, incluindo o caso "sem item ativo usa todos os itens"),
    `sumActiveItemsSubtotal`, `filterOrders` (status/busca/nulo).
  - `infrastructure/api-orders-repository.test.ts` (10 testes, `apiRequest` mockado): querystring
    de período, mapeamento completo de `Order`/`OrderItem`/`Transaction`, `image_url`
    presente/ausente, `tef_result` como objeto/string-JSON/string-inválida, `orderId` em branco
    não chama a API.
  - `ui/orders-page.test.tsx` (4 testes, `apiRequest` mockado via `vi.mock`, `RuntimeProvider` real
    em modo `lan`, `useTenant` mockado): carregando, vazio, **erro** (a busca falha e a tela cai no
    mesmo estado vazio do legado — o legado não tem um banner de erro distinto nesta tela; documentado
    no teste, não é uma lacuna introduzida aqui) e com dados (comanda + subtotal somando só o item
    ativo, R$ 10,00, excluindo o cancelado de R$ 8,00).
- `npx tsc --noEmit` — sem erros nos meus arquivos (o único erro do projeto é pré-existente em
  `src/modules/dashboard/ui/dashboard-page.test.tsx`, de outro agente rodando em paralelo).
- `npx eslint src/modules/orders "src/app/(panel)/orders"` — **0 erros / 0 avisos**.
- Não rodei `npm run build` nem `npm run test:visual`, conforme instruído.

## Preocupações para a Onda 2

- `tests/visual/fixtures/orders.ts`/`scenarios/orders.ts` não foram executados (proibido nesta
  onda). A fixture devolve dados fixos independente de `from`/`to`, então deve ser determinística;
  vale conferir no `npm run test:visual` do controller se o legado em modo LAN (que também bate
  nesses endpoints via Admin API) renderiza a mesma comanda sem diffs de layout.
- `usePlanHistoryWindow` do LEGADO consulta o Supabase diretamente mesmo em modo LAN (não passa
  pela Admin API/fake-api), condicionado a `selectedCompanyId` estar definido no
  `CompanyStoreContext`. Não investiguei se isso afeta o cenário visual — é comportamento do app
  legado, não desta migração, e outras telas da Onda 1 têm a mesma exposição.
