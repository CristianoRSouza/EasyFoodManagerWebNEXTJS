# Fase 2 — Onda 2: integração e verificação (relatório)

Branch: `feat/fase-1-fundacao`. Nada commitado. Não usei `git commit`, `merge`, `push`, `stash`,
`reset`, `checkout` nem `restore`. Nenhum `.env` foi lido. Nenhum teste chega a uma API ou a um
Supabase de verdade. `MAX_DIFF_RATIO` continua em 0,001, e as diferenças foram corrigidas no Next.

## 0. O que o agente anterior deixou (cortado pelo limite da API)

Encontrado na árvore de trabalho e **mantido**:

- **Item 1, pronto.** `tests/visual/fake-api.ts` junta as rotas de `fixtures/*.ts` e **derruba o
  servidor** quando dois arquivos registram a mesma rota (ele diz quem é o dono de cada uma). O
  arquivo novo `tests/visual/fixture-data/operations.ts` guarda um conjunto único de comandas,
  itens e transações: a transação de crédito fecha a comanda `000789`, e as duas telas veem o
  mesmo dado. Cada rota tem um dono só: `fixtures/orders.ts` → `/v1/orders` e `/v1/order-items`;
  `fixtures/transactions.ts` → `/v1/transactions`, com o filtro `?orderId=` igual ao da API.
- **Item 2, pronto.** `tests/visual/scenario.ts#isolateNetwork` age nos dois contextos, legado e
  Next:
  - `*.supabase.co`: leitura REST responde 200 com `[]`, ou `null` quando o cliente pede objeto;
    qualquer outra chamada é abortada.
  - Google Fonts: liberado.
  - Qualquer outro host externo: abortado **e** anotado.
  - WebSockets externos: fechados.
  - Service workers: bloqueados.

  O teste falha se a lista de bloqueios não terminar vazia.
- **Item 3, pela metade.**
  - Pronto: o helper `src/shared/http/keep-only-first-page.ts`, com teste, já aplicado em
    Produtos e Receitas.
  - Faltava: testes da tela, o erro no refresh de Receitas e a análise de Transações.
- Fora da lista: `tsconfig.json` ganhou `allowImportingTsExtensions`, porque o `fake-api` roda
  com `--experimental-strip-types` e importa `fixture-data/*.ts` com a extensão. Também havia um
  ajuste em `src/server/backend/error-body.ts` (+ teste): `error` com espaços é texto, não código.
  Os dois foram mantidos.

## 1. Item 1 — colisão de fixtures

Já estava concluído (ver §0). Conferi que nenhuma rota aparece duas vezes entre `fixtures/*.ts`,
e o servidor sobe. Nada a mudar.

## 2. Item 2 — Supabase e hosts externos

Já estava concluído (ver §0). Fechei duas brechas do harness que impediam os cenários de
chegarem à tela:

- **A modal "Instalar EasyFood Manager neste computador?" do legado.** Vem do
  `DesktopAppInstallPrompt`, que a spec removeu do Next. Ela abria 1,2 s depois do login, marcava
  a tela como `aria-hidden` e os cenários esgotavam os 90 s de espera. A saída não foi recortar a
  imagem: `dismissRemovedLegacyUi(context)` grava, antes de qualquer página, a chave
  `easyfood_manager_desktop_install_dismissed_v1`, que é o estado de "Não perguntar novamente". O
  Next não lê essa chave.
- **Login.** O helper `login()` agora espera `networkidle` e confere os valores dos campos antes
  de clicar em "Entrar". O novo `openLanPanel(page, base, path)` espera o redirecionamento para
  `/` antes de navegar. Antes, um `goto` feito no meio do login cancelava a sessão, e isso
  acontecia em todos os cenários da Fase 2, exceto o Dashboard.

## 3. Item 3 — "Atualizar dados" volta à primeira página

| Tela | Paginação | Resultado |
|---|---|---|
| Produtos | infinita, pela API/em memória (`useInfiniteQuery`) | `keepOnlyFirstPage` antes do `refetch()`. Teste novo: `ui/use-products-page.test.tsx` |
| Receitas | infinita em `recentApproved` (`useInfiniteQuery`) | `keepOnlyFirstPage` antes do `refetch()`. **Bug corrigido:** `refetch()` não lança erro, então o `try/catch` nunca mostrava o toast "Falha". Agora o código olha `result.isError`. Testes novos: `ui/use-revenue-page.test.tsx` (só o offset 0 volta; a falha vira erro na tela) |
| Transações | nenhuma no servidor: uma resposta com o período inteiro, revelada no cliente | O helper não se aplica. Alinhei ao legado (`loadData(true)`): o refresh recarrega **só** `/transactions`. Antes, o Next recarregava também o mapa de comandas e acusava falha se ele caísse. Teste novo em `TransactionsPage.test.tsx` |
| Comandas | janela no cliente ("Mostrar mais") | Já igual ao legado: `invalidate` e a janela recomeça quando os dados mudam |

Conferi que os testes pegam o defeito: com o `keepOnlyFirstPage` comentado, os dois testes de
refresh falham.

## 4. Item 4 — consistência (sem mudança de comportamento ou de visual)

**Convenção da maioria**, que também é a da Fase 1 (`shared/layout/AppLayout.tsx`,
`shared/session/use-sign-out.ts`):

- Componentes React em `PascalCase.tsx`.
- Hooks e utilitários em `kebab-case.ts`.
- Todo hook do módulo em `ui/`.
- `ui/use-<entidade>-repository.ts` devolve o repositório, memoizado pelos campos do tenant.
- Hooks de consulta ficam em `ui/use-*-query.ts`.
- Classe de infraestrutura: `Api<Entidade>Repository`.

**Renomeações:**

- dashboard:
  - `ui/*.tsx` → `DashboardPage`, `DashboardCharts`, `DashboardStatCards`,
    `NfceAttentionPanel`, `RecentSyncErrorsPanel`, `ServiceHealthGrid`, `SyncChartPanel`,
    `TransactionsChartPanel`.
  - `use-dashboard-repository.ts`, que era uma *query*, virou `ui/use-dashboard-repository.ts`
    (repositório) + `ui/use-dashboard-snapshot-query.ts`.
- orders:
  - `ui/*.tsx` → `OrdersPage`, `OrdersDesktopTable`, `OrdersMobileList`,
    `OrderTransactionsPanel`, `OrderItemImage`.
  - Os três `use-*-query.ts` foram da raiz para `ui/` e usam o novo
    `ui/use-order-repository.ts`.
  - `OrdersRepository`/`orders-repository.ts` → `OrderRepository`/`order-repository.ts`.
  - `ApiOrdersRepository` → `ApiOrderRepository`.
  - Identificadores em português → inglês: `LIMIAR_JANELA`, `TAMANHO_PAGINA`, `visiveis` e
    outros.
- units:
  - `units-page.tsx` → `UnitsPage.tsx`.
  - `use-units-repository.ts` (raiz, era uma *query*) → `ui/use-unit-repository.ts` +
    `ui/use-units-query.ts`.
- products: `HttpProductRepository`/`http-product-repository.ts` →
  `ApiProductRepository`/`api-product-repository.ts`.
- revenue: `use-revenue-screen.ts`/`useRevenueScreen`/`RevenueScreen` →
  `use-revenue-page.ts`/`useRevenuePage`/`RevenuePageState`, no mesmo padrão de
  `use-products-page`.
- `app/(panel)/{orders,units}/page.tsx`: mesmo formato das outras páginas.

**Duplicatas levadas para `src/shared/`, todas com teste:**

- `shared/infrastructure/convert.ts`
  - Conteúdo: `asText`, `asNumber(value, fallback)`, `asNumberOrNull`, `asBoolean`,
    `asBooleanOrNull`, `asJsonObject`.
  - Substitui: `products/infrastructure/convert.ts` (removido), os `asText`/`asNumber` locais de
    orders e transactions, e os dois `parseTefResult` idênticos.
- `shared/format/date-time.ts`
  - Conteúdo: `formatDateTime`/`formatDate` (pt-BR, "—" quando o valor falta).
  - Substitui: `new Date(x).toLocaleString("pt-BR")` espalhado pelos seis módulos e o
    `formatDateTime` de `orders/domain/order-rules.ts`.
- `shared/format/money.ts`
  - Conteúdo: `formatBrl`, que saiu de `revenue/domain`.
- `shared/ui/Money.tsx`
  - Formato `R$ 8.50` do legado, em Produtos, Comandas e Transações.
  - É **componente** de propósito: `formatMoney()` devolvia um nó de texto só, o legado usa dois
    (`R$ {v.toFixed(2)}`), e o Chrome posicionou o último dígito 1 px diferente (visto no
    diff de `products-lista`).
- `shared/plan/plan-window.ts`
  - Conteúdo: `minAllowedYmd` (saiu de `revenue/domain`) e `isPeriodOutsidePlanWindow` (regra
    que Comandas e Transações repetiam).
  - Os rótulos usam `fmtPtBrFromYmd`, que já existia.
- `shared/plan/PlanWindowNotice.tsx`
  - O card "Período fora do seu plano", que estava triplicado.
  - Substitui: `orders` (inline), `transactions/ui/TransactionPlanWindowNotice.tsx` (removido) e
    `revenue/ui/OutOfWindowCard.tsx` (removido).
  - Só mudam a frase de bloqueio e a dica de ajuste, que vêm por prop com o texto do legado de
    cada tela.

## 5. Correções no Next achadas pela verificação

1. **Qualquer tela de dados quebrava ao ser aberta direto no modo LAN** (link, F5, `goto`): "Algo
   deu errado — useRequiredTenant: nenhuma loja selecionada". O `AppLayout` só bloqueava o
   conteúdo na nuvem, e na LAN as telas montavam antes de `/site-identity` responder. Agora, na
   LAN sem identidade, o conteúdo espera com o mesmo "Carregando…" do legado. Se a identidade
   falhar, aparece "Não foi possível identificar a loja deste servidor.". Dois testes novos em
   `AppLayout.test.tsx`.
2. **O glifo "→"/"↔" saía diferente** ("Sync (FB → PG)", "Espelho FB↔PG" na barra lateral em
   todas as telas, "menu Infra → …" no primeiro acesso).
   - Causa: `--font-body`/`--font-heading` usavam `var(--font-manrope)`, onde o next/font põe
     "Manrope Fallback" (Arial com métricas ajustadas). Um glifo que a Manrope não tem saía em
     Arial, e não no `system-ui` do legado.
   - Correção: `globals.css` usa os nomes literais `'Sora', 'Manrope', system-ui`, como o legado.
   - Tentei `adjustFontFallback: false`, mas o Turbopack ignorou; revertido.
3. **Captura instável dos gráficos** (`receitas-carregada`). A animação do recharts roda em JS, e
   o legado carrega os gráficos por `lazy()`, então cada app era fotografado num quadro diferente.
   `capture()` agora espera duas capturas seguidas idênticas (até 10 s). A comparação não mudou.

## 6. Resultado dos comandos (execução final)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 erros |
| `npm run lint` | 0 erros / 0 avisos |
| `npm test` | 65 arquivos, **380 testes verdes** (eram 57/356) |
| `npm run build` (`BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999`, `.next` limpo) | sucesso |
| `npm run test:visual` | **24/24 verdes** (12 cenários × desktop/mobile), node_modules do legado instalados |

## 7. Diferença por cenário × viewport (execução final)

| Cenário | desktop | mobile |
|---|---|---|
| login-loja | 0 | 0 |
| login-nuvem | 0 | 0 |
| reset-sem-link | 0 | 0 |
| primeiro-acesso | 0 | 0 |
| painel-404-loja | 0 | 0 |
| painel-seletor-nuvem (recorte `dialog`, da Fase 1) | 0 | 0 |
| dashboard-carregado | 0 | 0 |
| products-lista | 0 | 0 |
| orders-lista | 0 | 0 |
| transactions-lista | 0 | 0 |
| units-lista | 0 | 0 |
| receitas-carregada | 0 | 0 |

**Recortes (`region`) novos: nenhum.** O único continua sendo o da Fase 1
(`painel-seletor-nuvem` → só o `dialog`, porque o cabeçalho de nuvem tem plano, licença e IA,
previstos para a Fase 5). A modal de instalação do legado foi neutralizada por estado, não por
recorte (§2).

## 8. Diferenças residuais e riscos

- **Ruído de rasterização de fonte.** Numa das execuções intermediárias, `login-nuvem` desktop deu
  0,000135, com pixels soltos nas bordas dos glifos, espalhados pela tela inteira. Na execução
  seguinte, com o mesmo código, deu 0. Não é diferença de layout; é a margem de anti-aliasing que
  o `MAX_DIFF_RATIO` cobre.
- **Os cenários da Fase 2 são só LAN.** O caminho de nuvem das seis telas (`/products/paged`,
  janela do plano via `/billing/plan-window`, card "fora do plano") não tem comparação visual. O
  card compartilhado tem teste de componente (`PlanWindowNotice.test.tsx`).
- **Digitar antes da hidratação no login do Next pode perder o valor.** Só suspeita, porque não
  confirmei qual dos dois apps perdeu o e-mail. O HTML chega por SSR, e o helper do harness agora
  confere os valores. Vale checar à mão num PC lento.
- `OrdersPage` e `TransactionsPage` tratam o `toast` do efeito "fora do plano" de jeitos
  diferentes (deps × `eslint-disable`). As duas funcionam; deixei como estava.
