# Fase 3 — Onda 1, agente A: Lista NFC-e (`/nfce`) — relatório

Escopo: só `src/modules/nfce/ui/list/**`, `src/app/(panel)/nfce/page.tsx`,
`tests/visual/{fixtures,scenarios}/nfce-list.ts` — a linha do agente A na tabela da Onda 1 do
plano (`2026-09-28-fase-3-fiscal.md`). Não editei o núcleo do módulo (`domain/`,
`application/`, `infrastructure/`, nem `ui/NfceStatusBadge.tsx` / `NfcePaymentBadge.tsx` /
`NfceSummaryCards.tsx` / `use-nfce-repository.ts` — todos da Onda 0) nem `ui/detail/**` (agente
B, rodando em paralelo). Nada commitado; nenhum `git commit/merge/push/stash/reset/checkout/
restore` usado. Nenhum `.env` lido. Nenhuma API real ou Supabase chamados.

## Arquivos criados

- `src/modules/nfce/ui/list/nfce-list-url-filters.ts` + `.test.ts` — parser puro de
  `URLSearchParams` para os filtros iniciais (invariante 3), testável sem montar componente.
- `src/modules/nfce/ui/list/use-nfce-list-page.ts` — estado e dados da tela (filtros, rolagem
  infinita, totais, contagens de atenção, refresh/reprocessar/baixar XML).
- `src/modules/nfce/ui/list/NfceListFilters.tsx` — card "Filtros" (Status, Período, datas
  custom, Busca, Buscar/Limpar).
- `src/modules/nfce/ui/list/NfceMobileList.tsx` — cartões (< md).
- `src/modules/nfce/ui/list/NfceDesktopTable.tsx` — tabela (md+).
- `src/modules/nfce/ui/list/NfceListPage.tsx` — composição (header, `NfceSummaryCards`, banner
  de atenção, filtros, `PlanWindowNotice`/tabela, paginação).
- `src/modules/nfce/ui/list/NfceListPage.test.tsx` — testes de componente.
- `src/app/(panel)/nfce/page.tsx` — rota.
- `tests/visual/fixtures/nfce-list.ts` — fixture da lista.
- `tests/visual/scenarios/nfce-list.ts` — cenário visual `nfce-lista`.

## Endpoints usados (modo LAN, via `NfceRepository` da Onda 0 — não alterado)

- `GET /nfce/notes?status&reconcileStatus&from&to&search&page&limit` — listagem paginada
  (`useInfiniteQuery`, `page` como `pageParam`, `limit=50`).
- `GET /nfce/totals?status&reconcileStatus&from&to&search` — totais dos cards (sempre o
  período inteiro, nunca somado das linhas carregadas — mesma regra do legado/Onda 0).
- `GET /nfce/attention-counts` — contagens do banner (sem parâmetros).
- `POST /nfce/notes/:id/reprocess` — botão "Reprocessar".
- `downloadXmlArchive` (`GET /nfce/notes-xml?...&afterId&limit`, paginado, ZIP montado no
  navegador) — botão "Baixar XML (.zip)".

## Decisões

1. **`usePlanPeriodGuard` + `PlanWindowNotice`** (compartilhados, padrão da Fase 2) em vez de
   reimplementar a lógica de "fora do plano" do legado. Consequência conhecida: o toast "Período
   fora do plano" agora dispara uma vez na transição para o estado bloqueado (efeito do hook
   compartilhado), não a cada tentativa de refresh silencioso enquanto bloqueado (como no
   legado). Sem diferença visual — só frequência do toast.
2. **Não usei `DatePeriodPresetControls`** (compartilhado) para Período/datas custom. Esse
   componente embrulha Período + datas num `<div>` próprio; dentro do grid do legado
   (`grid grid-cols-2` no mobile, que vira `flex flex-wrap` em `sm:`), isso muda quantas células
   cada filtro ocupa no mobile (o grupo inteiro vira 1 célula em vez de Período/Data
   início/Data fim serem 3 células independentes). Para manter o JSX/classes idênticos ao
   legado, escrevi o markup do zero em `NfceListFilters.tsx`, reaproveitando só as funções puras
   já compartilhadas (`computePeriodRange`, `fmtPtBrFromYmd`, `fromYmdLocal`, `toYmdLocal`,
   `PeriodPreset`) — nenhuma lógica de data duplicada, só o JSX é próprio.
3. **Paginação via `useInfiniteQuery`** com `page`/`limit` (não `from`/`to` como Produtos,
   porque é assim que `/nfce/notes` pagina). `hasNextPage` é `loaded < total`, mais simples que
   o `cameFull || belowEstimate` do legado: aquela heurística existia para um `total` estimado
   pelo planner; aqui a API faz `COUNT(DISTINCT n.id)` exato. Mantive o prefixo `~` no rodapé
   ("`~327` notas carregadas") por fidelidade textual ao legado, mesmo o número agora sendo
   exato.
4. **`/v1/nfce/attention-counts` não foi registrada na minha fixture.** Já tem dono —
   `tests/visual/fixtures/dashboard.ts` (Fase 2; o próprio Dashboard consome a mesma rota) — e o
   `fake-api` derruba o servidor em rota duplicada. Conferi que o formato de resposta é
   idêntico ao que `ApiNfceRepository.attentionCounts()` espera
   (`{ data: { manualReview, reconcileFailed, unusable } }`), então reaproveitar não muda nada
   no fluxo. O comentário no topo de `fixtures/nfce-detail.ts` (agente B) ainda diz "attention-
   counts é do agente A" — não colide (eu não registro essa rota), só ficou desatualizado; fora
   do meu escopo tocar naquele arquivo.
5. **Cartão mobile: `<div role="button" tabIndex={0}>` em vez de `<button>`.** O legado aninha
   `<Button>` do shadcn (ações "Reprocessar"/"Ver detalhes") dentro do `<button>` do cartão
   inteiro — HTML inválido (botão dentro de botão) que o React 19 deste app **recusa a
   renderizar** (`<button> cannot contain a nested <button>`, erro real, não só aviso — vi a
   tela cair vazia no teste de componente até corrigir). Troquei só a tag externa por
   `role="button"` + `tabIndex` + `onKeyDown` (Enter/Espaço); classes Tailwind idênticas. Com o
   preflight do Tailwind já ativo, `<div>` e `<button>` sem estilo nativo renderizam igual, então
   não deve haver diferença visual — vale conferir no `test:visual` do controller.
6. **Busca só em "Buscar"/Enter**, nunca por tecla — `searchInput` (rascunho) vs `search`
   (valor que entra na `queryKey`), mesmo comportamento do legado.
7. **`reconcileFilter` sem controle na UI** (igual ao legado) — só chega via URL
   (`?reconcileStatus=failed`) e é limpo por "Limpar".

## Invariante 3 (leitura de `?status=`/`?reconcileStatus=` da URL)

Lida uma única vez na montagem (`useState(() => parseNfceListUrlFilters(searchParams))`), como o
legado faz com `location.state`/preset inicial. Testada em dois níveis: unitário
(`nfce-list-url-filters.test.ts`, 4 casos incluindo os 3 links reais do
`NfceAttentionPanel.tsx`) e de integração (`NfceListPage.test.tsx`, 2 casos que mockam
`useSearchParams` e conferem a query string realmente enviada pelo `apiRequest`).

## Candidatos a compartilhado

Nenhum novo — tudo que precisava já existia (`usePlanPeriodGuard`, `PlanWindowNotice`,
`PageRefreshButton`, `keepOnlyFirstPage`, `date-period-presets.ts`). `parseNfceListUrlFilters`
ficou local por ora (só esta tela lê filtro de URL vindo de outra tela); se outra tela do painel
ganhar o mesmo padrão, vale promover para `src/shared`.

## Testes e verificação

- `npx vitest run src/modules/nfce/ui/list` — **2 arquivos, 11 testes, verdes** (4 do parser de
  URL + 7 de componente: carregando, vazio, erro com toast, com dados, refresh com sucesso, e as
  2 de invariante 3).
- `npx vitest run src/modules/nfce` (módulo inteiro — meu código + Onda 0 + `ui/detail` do
  agente B, em paralelo) — **17 arquivos, 129 testes, verdes**.
- `npx tsc --noEmit` (repo inteiro) — **0 erros**.
- `npx eslint src/modules/nfce/ui/list "src/app/(panel)/nfce"` — **0 erros, 0 avisos**.
- Fixture verificada fora do Playwright: importei `tests/visual/fixtures/nfce-list.ts` direto
  via `node --experimental-strip-types` e chamei os 2 handlers — resposta bem formada. Também
  escrevi um script ad hoc que importa todas as `fixtures/*.ts` e confere duplicidade de rota:
  **36 rotas, 10 arquivos, nenhuma duplicata** (inclui a checagem do item 4 acima).
- Não rodei `npm run build` nem `npm run test:visual` (outros agentes editando a mesma árvore;
  fica para o controller na Onda 2, como pedido no brief).

## Preocupações para a Onda 2 (integração)

- Confirmar visualmente (`test:visual`) que `<div role="button">` no cartão mobile não introduz
  diferença de pixel em relação ao `<button>` do legado (decisão 5) — esperado que não, dado o
  preflight do Tailwind, mas não pude rodar Playwright aqui.
- O comentário desatualizado em `fixtures/nfce-detail.ts` sobre quem é dono de
  `attention-counts` (decisão 4) — cosmético, sem efeito funcional; sinalizando para quem for
  consolidar os relatórios da Onda 1.
