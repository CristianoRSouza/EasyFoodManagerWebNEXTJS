# Fase 3 — Integração (Onda 2): relatório

Agente de integração/controller da Onda 2 (`2026-09-28-fase-3-fiscal.md`). Retomando uma sessão
anterior cortada por limite de API — as mudanças dela já estavam na árvore de trabalho,
não commitadas; este relatório cobre o que ela tinha feito e o que foi terminado agora. Nada
commitado — nenhum `git commit/merge/push/stash/reset/checkout/restore` foi usado em nenhum
momento. Nenhum `.env` foi lido. Nenhum teste bateu API real ou Supabase.

## O que o agente anterior já tinha feito (achado ao retomar)

Via `git status`/`git diff` no início desta sessão, a árvore de trabalho já continha, sem
commit:

- **Correções de bugs achados durante a integração visual** (fora do escopo das 4 telas, mas
  necessárias para o `test:visual` passar):
  - `src/server/backend/error-body.ts` (+ teste): a `easyfoodmanagerAPI` às vezes devolve
    `{ error: "<texto humano>" }` sem `error_code`; o parser antigo promovia esse texto a
    `code`. Corrigido para só tratar como código de máquina strings `[a-z0-9_.-]+`.
  - `src/app/globals.css`: `--font-heading`/`--font-body` trocaram `var(--font-sora)` por
    `'Sora'` literal — o `next/font` usa a variável para a fonte de FALLBACK ("Sora
    Fallback"/Arial ajustada), não a fonte real; um glifo ausente no fallback (ex. "→") caía em
    Arial em vez do `system-ui` do legado.
  - `src/shared/layout/AppLayout.tsx` (+ teste): novo estado `LanIdentityPending` — na loja
    (LAN), sem a identidade do servidor (`/site-identity`) ainda carregada, o conteúdo
    esperava com "Carregando…" em vez de tentar renderizar telas que exigem tenant
    (`useRequiredTenant`) sem ele.
  - `src/shared/tenant/tenant-context.tsx`: `selection` (Cloud e LAN) virou `useMemo` — sem
    isso, cada render devolvia um objeto novo e os hooks `use-*-repository.ts` recriavam o
    repositório a cada render (regressão do tipo já documentado em `fase-2-revisao-final.md`,
    Menor 1).
  - `src/app/(panel)/page.tsx`: `HomePage` passou a renderizar `<DashboardPage />` (estava
    retornando `null`).
  - `package.json`/`package-lock.json`: dependências novas para os componentes das 4 telas —
    `@radix-ui/react-popover`, `@radix-ui/react-select`, `date-fns`, `fflate`,
    `react-day-picker`, `recharts`.
  - `tsconfig.json`: `allowImportingTsExtensions: true` (usado pelo carregamento dinâmico de
    fixtures/cenários do harness visual, que importa `.ts` com extensão explícita).
  - `eslint.config.mjs`: exceção `@typescript-eslint/no-empty-object-type` para primitivas
    copiadas verbatim do legado, e `react-hooks/set-state-in-effect` desligada só para
    `LazyFiscalCard.tsx` (fila de carregamento sequencial/paralelo, comportamento
    intencional).
- **Infraestrutura nova do harness de teste visual** (para suportar módulos além da Fase 1 sem
  editar um arquivo compartilhado por todos):
  - `tests/visual/scenario.ts` (novo): `APPS`, `Scenario` (tipo), `login`/`openLanPanel`,
    `waitForVisibleText`, e o isolamento de rede (`isolateNetwork` — bloqueia qualquer host
    externo não-local/não-fonte, com fulfillment específico para leituras REST do Supabase que
    o legado ainda consulta em modo LAN) e `dismissRemovedLegacyUi` (esconde o prompt de
    instalação desktop do legado, removido da spec do Next).
  - `tests/visual/fake-api.ts`: passou a carregar `tests/visual/fixtures/*.ts` dinamicamente
    (uma rota, um dono só — o servidor recusa subir se duas fixtures registrarem a mesma rota).
  - `tests/visual/visual.spec.ts`: os cenários passaram a ser carregados dinamicamente de
    `tests/visual/scenarios/*.ts`; a captura ganhou espera de estabilidade (duas screenshots
    consecutivas idênticas, até 10 s) — necessária porque os gráficos do Recharts animam por
    ~1,5 s e o legado carrega os cards por `lazy()`.
  - `tests/visual/playwright.config.ts`: o Next de nuvem passou da porta 3001 para 3002 (3001
    colide com o servidor de imagens do backend LAN, `IMAGE_SERVER_PORT`).
- **As 4 telas da Onda 1** (`nfce`, `issuer`, `taxreform` completos, conforme os relatórios
  `fase-3-{nfce-list,nfce-detail,emitente,taxreform}-report.md`) e o núcleo `src/modules/nfce`
  + `src/shared/ui/issuer-sections`/primitivas da Onda 0/0a.

Todos os testes (`npx vitest run`) já estavam verdes (618/618) e `npx eslint src`/`tsc --noEmit`
limpos ao retomar — o corte por limite de API aconteceu depois de deixar a árvore num estado
íntegro, mas antes de rodar `build`/`test:visual` e antes de tratar os itens 1/2/4 do brief.

## Item 1 — Mensagens de correção manual idênticas ao legado

**Problema encontrado**: `validateNfceManualCorrection` (`src/modules/nfce/domain/nfce-correction.ts`)
já espelhava `saveNfceManualCorrection` (o GATE do `LEGACY/src/lib/data-service.ts`, autoridade
que a API real também refaz), mas o legado tem uma SEGUNDA validação — `validateManualCorrectionBeforeSave`,
inline em `LEGACY/src/pages/NfceDetailPage.tsx` — que roda ANTES de qualquer chamada de rede e
mostra ao operador mensagens MAIS específicas e, em vários pontos, DIFERENTES do gate (ex.: "NCM
deve ter 8 dígitos." vs "dados fiscais inválidos (NCM/CFOP/CST-CSOSN)."; troco "não pode ser
maior que o valor." vs "...informado."; o total dos pagamentos usa o valor formatado em R$). O
agente B da Onda 1 tinha deliberadamente usado só o gate, documentando a divergência textual como
conhecida.

**Correção**: fundi as duas fontes em `validateNfceManualCorrection`, na mesma ordem em que o
legado as executa — estado (`manual_review`) → por item, com os textos do INLINE (NCM 8 dígitos,
CFOP 4 dígitos, CFOP 5/6, CFOP×UF unificado em uma mensagem com `expectedLabel`, CSOSN/CST por
CRT) → por pagamento, idem (INLINE) → invariante 1a (total dos itens, só existe no GATE — a UI
nunca edita quantidade/preço, então é rede de segurança) → invariante 1b (pagamentos − troco ≥
total, texto do INLINE, com o valor formatado via `formatCurrency`, a mesma função já portada do
legado). Documentado no topo do arquivo qual mensagem vem de qual das duas fontes e por quê.

Efeito colateral descoberto e corrigido: `formatCurrency` duplicava `formatBrl`
(`src/shared/format/money.ts`) — o mesmo `Intl.NumberFormat("pt-BR", {style:"currency", currency:"BRL"})`,
só que `formatCurrency` também aceita `string|null|undefined` com fallback "R$ 0,00". Fiz
`formatCurrency` delegar para `formatBrl` (housekeeping do item 4).

**Testes**: `src/modules/nfce/domain/nfce-correction.test.ts` reescrito — uma asserção por
mensagem (19 casos: NCM, CFOP tamanho, CFOP 5/6, CFOP×UF interno, CFOP×UF interestadual, CSOSN
Simples 1 e 2, CST Regime Normal, forma de pagamento inválida, valor inválido, troco inválido,
troco > valor, troco em forma ≠ dinheiro, aceite com troco em dinheiro, invariante 1a, invariante
1b com valor formatado, vírgula decimal, estado fora de `manual_review`, aceite consistente).
Verifiquei também que o parser de erro por campo em
`src/modules/nfce/ui/detail/use-nfce-correction-form.ts` (regex `^Item (\d+):`/`^Pagamento (\d+):`/
`startsWith("Pagamentos:")`, usado para destacar a linha do item/pagamento com erro) continua
batendo com todas as mensagens novas — não precisou de ajuste.

## Item 2 — Paridade do aviso "Período fora do plano"

O brief pedia checar se `usePlanPeriodGuard` toasta a cada tentativa de refresh bloqueado, como o
legado. Investigação no legado mostrou que **não há um comportamento único**:

- `Orders.tsx`: só avisa NA TRANSIÇÃO para o estado bloqueado (um `useEffect`); `refresh()` não
  tem nenhum código lidando com `outOfWindow` — clicar em "Atualizar" bloqueado não repete o
  aviso.
- `NfcePage.tsx` e `Transactions.tsx`: avisam na transição E a CADA tentativa de refresh
  enquanto bloqueado (`loadData({silent:true})` mostra o toast de novo a cada clique).
- `ReceitasPage.tsx` (Fase 2, não tocado agora): segue o mesmo padrão de NFC-e/Transações.

`usePlanPeriodGuard` (compartilhado) só implementa o aviso de TRANSIÇÃO — correto para Comandas,
insuficiente para NFC-e/Transações. Ao conferir as 3 telas que o usam:

- **`OrdersPage.tsx`**: tinha um bloco a mais (`if (outOfWindow) { toast(...); return; }` dentro
  de `refresh`) que o legado `Orders.tsx` NÃO tem — avisava a cada clique quando não deveria.
  Removido; ficou só `if (outOfWindow) return;` (sem toast), que é o comportamento real do
  legado.
- **`src/modules/nfce/ui/list/use-nfce-list-page.ts`** (`handleRefresh`): tinha só
  `if (outOfWindow) return;` — faltava o toast por tentativa que `NfcePage.tsx` tem. Adicionado
  o toast idêntico ("Período fora do plano" / "O seu plano permite consultar a partir de
  {label}." / destructive).
- **`TransactionsPage.tsx`**: já estava correto (toast a cada tentativa) — conferido, sem
  mudança.

**Testes** (novos, um por tela, usando o mesmo padrão de
`src/modules/revenue/ui/use-revenue-page.out-of-window.test.tsx` — backend `cloud` real via
`RuntimeProvider`, para que `usePlanHistoryWindow` de fato consulte `/billing/plan-window` e
force `outOfWindow=true`):
- `NfceListPage.test.tsx`: "Atualizar avisa a CADA tentativa" — 3 cliques, 3 toasts.
- `OrdersPage.test.tsx`: "Atualizar NÃO repete o aviso a cada clique" — 2 cliques depois da
  transição, nenhum toast novo.
- `TransactionsPage.test.tsx`: mesmo teste de NFC-e (já passava, sem mudança de produção).

## Item 3 — Visual (`build` + `test:visual`)

`BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999 npm run build`: **sucesso**, sem erros de
TypeScript/compilação, todas as 18 rotas geradas.

`npm run test:visual` (Fases 1–3, desktop + mobile, 16 cenários × 2 viewports = 32 testes):
primeira rodada completa **2 falhas** (`nfce-issuer-carregado`, desktop e mobile) — as outras 30
já bateram diff 0 de cara, incluindo o cartão mobile de NFC-e (`<div role="button">` em vez de
`<button>` aninhado, decisão do agente A) e as 14 seções da Reforma Tributária.

### Investigação do diff em `nfce-issuer-carregado`

Ratio inicial: desktop 0,234 %, mobile 5,59 % (limite: 0,1 %). Hipótese inicial (mascarar só o
botão "Editar" com um retângulo pintado por cima nas duas capturas) reduziu o ratio mas não
zerou (desktop 0,195 %, mobile 1,86 %) — a causa raiz era outra: o cabeçalho do emitente é um
`flex items-center gap-2 flex-wrap` dentro de uma linha `justify-between`; com um item a mais (o
botão "Editar", só no Next), o GRUPO inteiro fica mais largo e, como a borda DIREITA do grupo é
que fica ancorada (mesma margem do cartão nos dois apps), os badges de status ANTERIORES ao
botão (Ativo/Homologação/Cert. Xd) nasciam mais à ESQUERDA no Next do que no legado — um
retângulo fixo sobre a área do botão não cobre esse deslocamento dos vizinhos.

Confirmado via `boundingBox()` direto: o botão "Editar" do Next ocupava EXATAMENTE a mesma faixa
de coordenadas em que o badge "Cert. Xd" do legado é desenhado (ambos são o ÚLTIMO item do
mesmo grupo ancorado à direita) — meu primeiro mascaramento por retângulo estava, sem querer,
pintando por cima do badge real do legado, mascarando o sintoma errado.

**Correção**: troquei o mecanismo de `mask` de "pintar um retângulo sólido" para "esconder do
FLUXO do layout" — `display: none` nos elementos, aplicado ANTES da primeira screenshot
(`applyMask` em `tests/visual/visual.spec.ts`), para que o `flex` do Next recalcule sem o(s)
botão(ões) e os badges anteriores voltem à mesma posição do legado. `Scenario.mask` (tipo em
`tests/visual/scenario.ts`) documenta o motivo da escolha. `tests/visual/compare.ts` voltou à
forma original (sem a complexidade de retângulos de máscara, que deixou de ser necessária).

Único elemento excluído da comparação nesta tela: o botão **"Editar"** do cabeçalho (mostrado em
TODOS os breakpoints) e o **"Editar configuração"** da barra fixa mobile (`MobileStickyActionBar`,
`md:hidden`) — ambos exclusivos do Next (ruling do controller: o Next substitui o app Electron, e
a loja perderia a única forma de editar o emitente se a tela ficasse travada em leitura; ver
`fase-3-emitente-report.md`). Documentado com comentário extenso em
`tests/visual/scenarios/issuer.ts`, citando esta investigação.

### Resultado final

`npm run test:visual` (rodada completa, `--reporter=json` para extrair o ratio anotado por
teste): **32/32 passou**. Nenhuma outra exclusão de comparação foi necessária em nenhuma tela.

| Cenário | desktop | mobile |
|---|---|---|
| dashboard-carregado | 0 | 0 |
| login-loja | 0 | 0 |
| login-nuvem | 0 | 0 |
| nfce-detail-carregado | 0 | 0 |
| **nfce-issuer-carregado** | **0** | **0,0000729** |
| nfce-lista | 0 | 0 |
| orders-lista | 0 | 0 |
| painel-404-loja | 0 | 0 |
| painel-seletor-nuvem | 0 | 0 |
| primeiro-acesso | 0 | 0 |
| products-lista | 0 | 0 |
| receitas-carregada | 0 | 0 |
| reset-sem-link | 0 | 0 |
| taxreform-configuracao-fiscal | 0 | 0 |
| transactions-lista | 0 | 0 |
| units-lista | 0 | 0 |

**Diferença residual**: `nfce-issuer-carregado` no viewport mobile fica em 0,00729 % (bem abaixo
do limite de 0,1 %) — poucos pixels de anti-aliasing de fonte nos badges cuja posição X mudou
1 pixel (arredondamento de subpixel) depois do `display:none` recalcular o `flex`; dentro da
tolerância documentada em `MAX_DIFF_RATIO` (`tests/visual/compare.ts`). Sem causa a investigar.

## Item 4 — Housekeeping

- **Comentário de dono de rota desatualizado** (`tests/visual/fixtures/nfce-detail.ts`): dizia
  que `/v1/nfce/attention-counts` era do agente A (`fixtures/nfce-list.ts`); na verdade já
  pertencia a `fixtures/dashboard.ts` desde a Fase 2 (o próprio Dashboard consome a mesma rota).
  Corrigido.
- **Stub de `IntersectionObserver`/`ResizeObserver` no jsdom**: três arquivos de teste
  (`NfceListPage.test.tsx`, `RevenuePage.test.tsx`, `TaxReformFiscalPage.test.tsx`) repetiam a
  mesma classe-stub local. Unificado em `vitest.setup.ts` (guardado com
  `typeof globalThis.X === "undefined"`, mesmo padrão já usado para `matchMedia`); os 3 arquivos
  tiveram o stub local removido.
- **Duplicata `formatCurrency`/`formatBrl`**: `src/modules/nfce/domain/nfce-formatters.ts` tinha
  sua própria instância de `Intl.NumberFormat` idêntica à de `src/shared/format/money.ts`
  (mesmas opções — só a formatação de MOEDA, não a de data, que segue com boa razão para
  divergir: NFC-e lê `YYYY-MM-DD` à meia-noite LOCAL, um bug real já corrigido antes).
  `formatCurrency` agora delega para `formatBrl`, mantendo o parse tolerante a
  `string|number|null|undefined` que só ela precisa.
- **`InfoRow`/`SectionCard` do detalhe de NFC-e vs. `InfoRow`/`IssuerSectionCard` do
  `issuer-sections`**: avaliados e mantidos SEPARADOS — são portas de DOIS arquivos diferentes
  do legado (`NfceDetailPage.tsx` inline vs. `nfce-issuer/InfoRow.tsx`), com classes Tailwind e
  props diferentes (`cloudUnavailable` só existe na versão do emitente). Unificar arriscaria
  divergir de um dos dois legados sem ganho real (a lista de NFC-e não usa nenhum dos dois).
- **Nomenclatura `ui/XPage.tsx`/`ui/use-x-repository.ts`**: conferida em todos os 9 módulos
  (`dashboard`, `issuer`, `nfce`, `orders`, `products`, `revenue`, `taxreform`, `transactions`,
  `units`) — consistente; `nfce` não tem um `ui/XPage.tsx` de topo por ter DUAS telas
  (`ui/list/NfceListPage.tsx`, `ui/detail/NfceDetailPage.tsx`), estrutura deliberada, não
  inconsistência.
- **Tamanho de arquivo**: maior arquivo de produção dos módulos da Fase 3 é
  `src/modules/nfce/ui/list/use-nfce-list-page.ts` (291 linhas) — dentro do limite de ~300.
  Nenhum arquivo tocado nesta integração passou de 300 linhas.

## Resultado final de cada comando

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 erros |
| `npm run lint` (`eslint src`) | 0 erros / 0 avisos |
| `npx vitest run` | **97 arquivos, 623 testes, todos verdes** |
| `BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999 npm run build` | sucesso, 18 rotas geradas |
| `BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999 npm run test:visual` | **32/32 passou** (ver tabela acima) |

## Arquivos alterados nesta sessão de integração (além do que o agente anterior já tinha feito)

```
src/modules/nfce/domain/nfce-correction.ts        # item 1 — validação fundida
src/modules/nfce/domain/nfce-correction.test.ts    # item 1 — 19 testes, um por mensagem
src/modules/nfce/domain/nfce-formatters.ts         # item 4 — formatCurrency delega para formatBrl
src/modules/orders/ui/OrdersPage.tsx               # item 2 — removido toast extra no refresh bloqueado
src/modules/orders/ui/OrdersPage.test.tsx          # item 2 — teste de não-repetição
src/modules/nfce/ui/list/use-nfce-list-page.ts     # item 2 — adicionado toast por tentativa bloqueada
src/modules/nfce/ui/list/NfceListPage.test.tsx     # item 2 — teste de repetição; item 4 — stub local removido
src/modules/transactions/ui/TransactionsPage.test.tsx  # item 2 — teste de paridade (sem mudança de produção)
src/modules/revenue/ui/RevenuePage.test.tsx        # item 4 — stub local removido
src/modules/taxreform/ui/TaxReformFiscalPage.test.tsx   # item 4 — stub local removido
vitest.setup.ts                                    # item 4 — stub único de IntersectionObserver/ResizeObserver
tests/visual/fixtures/nfce-detail.ts               # item 4 — comentário de dono de rota corrigido
tests/visual/scenario.ts                           # item 3 — `Scenario.mask` (display:none, não retângulo)
tests/visual/visual.spec.ts                        # item 3 — `applyMask`, sem mais `collectMaskRects`/`MaskRect`
tests/visual/scenarios/issuer.ts                   # item 3 — mask do botão "Editar"/"Editar configuração" + comentário
docs/superpowers/plans/fase-3-integracao-report.md # este relatório
```

`tests/visual/compare.ts` foi editado e depois revertido para a forma original nesta mesma
sessão (a complexidade de retângulos de máscara não sobreviveu à correção do item 3) — sem
diferença líquida em relação ao que o agente anterior tinha deixado.

## Pendências / observações para quem revisar

- Nenhum item do brief ficou pendente. Os 5 itens (mensagens de correção, paridade do aviso de
  plano, visual, housekeeping, gates verdes) estão concluídos e verificados.
- `AGENTS.md`/`CLAUDE.md` e os relatórios de Fase 2 (`fase-2-*.md`) na raiz de
  `docs/superpowers/plans/` já estavam presentes (não criados nesta sessão) — não foram
  revisados neste relatório por estarem fora do escopo da Fase 3.
- Tudo pendente de commit, como determinado pelas regras do brief.
