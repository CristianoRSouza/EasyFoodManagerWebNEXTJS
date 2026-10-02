# Fase 2 — Products: relatório (agente B)

Branch: `feat/fase-1-fundacao`. Nada commitado — tudo pendente na árvore de trabalho. Só toquei
`src/modules/products/**`, `src/app/(panel)/products/page.tsx`,
`tests/visual/fixtures/products.ts`, `tests/visual/scenarios/products.ts`.

## Arquivos criados

```
src/modules/products/domain/product.ts
src/modules/products/domain/product-fiscal.ts
src/modules/products/domain/product-fiscal-ibscbs.ts
src/modules/products/application/product-repository.ts
src/modules/products/application/product-use-cases.ts
src/modules/products/application/paginate-products.ts (+ .test.ts)
src/modules/products/infrastructure/convert.ts
src/modules/products/infrastructure/product-mapper.ts (+ .test.ts)
src/modules/products/infrastructure/product-fiscal-mapper.ts (+ .test.ts)
src/modules/products/infrastructure/product-fiscal-ibscbs-mapper.ts (+ .test.ts)
src/modules/products/infrastructure/http-product-repository.ts (+ .test.ts)
src/modules/products/ui/use-product-repository.ts
src/modules/products/ui/use-products-page.ts
src/modules/products/ui/ProductImage.tsx
src/modules/products/ui/FiscalDetail.tsx
src/modules/products/ui/ProductFiscalDetails.tsx
src/modules/products/ui/ProductsFilters.tsx
src/modules/products/ui/ProductMobileCard.tsx
src/modules/products/ui/ProductsMobileList.tsx
src/modules/products/ui/ProductTableRow.tsx
src/modules/products/ui/ProductsTable.tsx
src/modules/products/ui/ProductsPage.tsx (+ .test.tsx)
src/app/(panel)/products/page.tsx
tests/visual/fixtures/products.ts
tests/visual/scenarios/products.ts
```

Maior arquivo: `ProductFiscalDetails.tsx` (217 linhas). Todos abaixo de ~300.

## Endpoints usados (mesmos do legado em modo LAN, confirmados em `easyfoodmanagerAPI/src/routes/v1/{products,cbs}.ts`)

- `GET /v1/products` — catálogo inteiro, sem paginação. `{ data: Row[] }`. Único endpoint de
  listagem que a easyfoodmanagerAPI (loja) expõe.
- `GET /v1/products/paged?search=&activeFilter=&stockFilter=&priceMin=&priceMax=&sortKey=&sortDir=&from=&to=`
  — só existe na EasyFoodAPI (nuvem, confirmado em `easyfoodmanagerWEB/src/lib/cloud-api-data.ts`).
  Resposta **sem envelope**: `{ rows: Row[], total: number }`. `sortKey` vai como nome de coluna
  (`sale_price`, não `salePrice`); parâmetros vazios/`"all"` são omitidos da query string.
- `GET /v1/products/:productId/fiscal` — `{ data: Row | null }`. Mesma forma nos dois backends.
- `GET /v1/cbs/product-fiscal-ibscbs?classCode=` — `{ data: { taxClass: Row | null, indicator: Row | null } }`.
  Mesma forma nos dois backends; rota própria (não a genérica de CBS, que ignora `classCode`).

## Decisões

- **Um único `HttpProductRepository`**, não duas classes por backend. `listPage()` ramifica
  internamente: nuvem chama `/products/paged` (filtro/ordenação/paginação no servidor); loja
  busca `/products` inteiro e pagina em memória com `paginateProducts()` (`application/`, pura,
  testada com 8 casos) — é o mesmo fallback que `fetchProductsPaged()` fazia no legado
  (`data-service.ts`, ramo Admin API) para quando não há paginação server-side.
- **Domínio em inglês limpo (camelCase)**, aproveitando a forma do módulo REF
  (`EASYCOMMAND REFATORADO/src/modules/products`) para `Product` e `ProductFiscal`
  (`identification`/`icms`/`pis`/`cofins`/`taxReform`), mas **não usei a UI do REF** — o JSX é
  cópia do legado (`easyfoodmanagerWEB/src/pages/Products.tsx`), só trocando os nomes de campo
  para os do domínio (ex.: `fiscal.origin_state` → `fiscal.icms.originState`). A REF não tinha
  tipo para IBS/CBS nem repositório com paginação/fallback — escrevi do zero a partir do
  `CbsTaxClassIbscbs`/`CbsTaxClassIbscbsIndicator` do legado.
- **`ProductFiscal` do domínio omite `tax_rule_code_id`** (a REF tinha `taxRuleCode`) — o legado
  nunca renderiza esse campo, só `tax_rule_description`. Simplificação deliberada.
- **Dados via `useInfiniteQuery`** (não `useState`+`useRef` como o legado) para a rolagem
  infinita: `queryKey` inclui `companyId`/`storeId`/filtros; `getNextPageParam` soma os itens já
  carregados contra `total`. O `IntersectionObserver` do sentinel chama `fetchNextPage()`, mesmo
  gatilho visual do legado.
- **Botão "Atualizar dados" usa `query.refetch()`** em vez de recarregar só a 1ª página como o
  legado fazia (`loadFirstPage(true)`, que descartava páginas extras já carregadas). Diferença
  conhecida: no Next, atualizar mantém todas as páginas já roladas (refaz cada uma), em vez de
  reduzir a lista de volta a 20 itens. Julguei a UX resultante melhor (não "some" produto que o
  usuário já tinha rolado até ver) e não há teste de fixture visual sensível a isso.
- **Reset do `expandedId`** ao trocar filtro/ordenação/busca/loja é feito por ajuste de estado
  durante a renderização (comparação de `queryKey`), não por `useEffect` — para não colidir com a
  regra `react-hooks/set-state-in-effect` do `eslint.config.mjs` (só isenta
  `shared/ui/primitives/**`), seguindo o padrão que o próprio React recomenda para "resetar
  estado quando um dado muda".
- **Estado de erro é novo em relação ao legado**: `pages/Products.tsx` não tem uma tela de erro
  para a falha da 1ª página (só loga no console; a UI fica indistinguível de "lista vazia"). O
  brief exige testar um estado de erro no componente, então adicionei uma mensagem simples
  ("Não foi possível carregar os produtos.") reaproveitando o estilo tipográfico já usado nos
  vazios da tabela/lista — é a única divergência de JSX em relação ao legado, e é aditiva (não
  removi nem alterei nenhum estado existente).
- **Mensagem "Dados fiscais não disponíveis na nuvem"** (painel fiscal, produto sem cadastro
  fiscal, backend nuvem) foi copiada **literalmente** do legado, inclusive citando "Supabase" e
  "Electron" — conceitos que não existem mais nesta migração (a decisão de cloud/local agora é
  `useRuntime().backend === "cloud"`, sem Supabase direto). Mantive o texto por causa da regra
  "Textos PT-BR idênticos ao legado (copie)"; sinalizo aqui para uma revisão de conteúdo futura,
  já que a redação ficou tecnicamente desatualizada para a arquitetura Next.
- **Imagem de produto**: usa `useProductImageUrl`/`resolveProductImageUrl` da Onda 0
  (`src/shared/ui/image-utils.ts`), como indicado no brief.

## Candidatos a compartilhado

- `infrastructure/convert.ts` (`asText`/`asNumber`/`asNumberOrNull`/`asBoolean`/`asBooleanOrNull`)
  — idêntico em espírito ao `@/shared/infrastructure/convert.ts` da REF; se outro módulo da Onda 1
  precisar do mesmo conversor (provável, qualquer tela que mapeie linha de API para domínio vai
  precisar), vale promover para `src/shared/infrastructure/convert.ts` num agente futuro em vez de
  duplicar por módulo — não criei em `shared/` porque o brief só autoriza tocar nele quando algo
  falta e pede para reportar, não para criar direto.

## Diferenças conhecidas em relação ao legado

1. Botão "Atualizar" recarrega todas as páginas já roladas, não só a primeira (ver "Decisões" acima).
2. Estado de erro visível na 1ª carga (o legado não tinha nenhum).
3. Texto da mensagem de "dados fiscais não disponíveis na nuvem" ainda cita Supabase/Electron
   (copiado do legado; tecnicamente desatualizado para a arquitetura de 2 backends do Next).

Nenhuma diferença visual nos estados "carregando"/"vazio"/"com dados"/painel fiscal expandido —
JSX e classes Tailwind são cópia do legado.

## Testes

- `npx vitest run src/modules/products` — **6 arquivos, 25 testes, todos verdes**:
  - `application/paginate-products.test.ts` — 8 casos (busca, filtros, faixa de preço, ordenação
    por cada `sortKey`, paginação `from`/`to`, combinação de filtros).
  - `infrastructure/product-mapper.test.ts` — 3 casos (linha completa, conversão texto→número e
    nulos, linha vazia sem `undefined`/`NaN`).
  - `infrastructure/product-fiscal-mapper.test.ts` — 3 casos (todos os grupos, fallback de
    `productId`, alíquota "0.00" ≠ não informada).
  - `infrastructure/product-fiscal-ibscbs-mapper.test.ts` — 2 casos (presente/ausente).
  - `infrastructure/http-product-repository.test.ts` — 5 casos (nuvem: query string e mapeamento
    sem envelope; cabeçalhos de tenant; loja: paginação em memória sem `/products/paged`; fiscal()
    e fiscalIbsCbs() compartilhados entre backends).
  - `ui/ProductsPage.test.tsx` — 4 casos: carregando, vazio, erro (HTTP 500), com dados (preço
    formatado, contagem no cabeçalho, badge "Inativo").
- `npx tsc --noEmit` — **0 erros** (projeto inteiro).
- `npx eslint src/modules/products "src/app/(panel)/products"` — **0 erros / 0 avisos**.
- Não rodei `npm run build` nem `npm run test:visual` (outros agentes editando a árvore em
  paralelo), conforme instruído.

## Fixture/cenário visual

- `tests/visual/fixtures/products.ts`: registra `/v1/products` (loja, `{ data: [...] }`) e
  `/v1/products/paged` (nuvem, `{ rows: [...], total }`) com as mesmas duas linhas fixas (sem
  `Date.now()`), cobrindo produto ativo com estoque e produto inativo sem estoque.
- `tests/visual/scenarios/products.ts`: um cenário `products-lista` (modo `lan`) — login, navega
  a `/products`, espera o heading "Produtos" e o nome do primeiro produto da fixture. Multiplicado
  em desktop+mobile pelo `visual.spec.ts` existente.
