# Fase 5 — Onda 1, agente B: Espelho FB↔PG (`/sync/espelho`)

> **Superado em parte por `fase-5-integracao-report.md`** (markdown/captura de tela, relator em `src/shared/errors`, licença em `src/shared/license`, Auditoria na loja, máscaras visuais removidas). Em caso de conflito, vale o relatório de integração.

Branch `feat/fase-1-fundacao`. Nada commitado. Não usei `git commit`, `merge`, `push`, `stash`,
`reset`, `checkout` nem `restore`. Nenhum `.env` foi lido. Nenhum teste chama API ou Supabase de
verdade: os unitários simulam `apiRequest`/`fetch`, e a fixture visual responde pelo `fake-api`.

## 1. Arquivos criados

Só os da linha B da Onda 1. Nenhum arquivo compartilhado foi editado.

**`src/modules/sync-mirror/`**

| Camada | Arquivo | Origem no LEGACY |
|---|---|---|
| domain | `sync-mirror.ts` (tipos, em inglês/camelCase) | tipos de `lib/sync-mirror-data.ts` |
| domain | `sync-jobs.ts` + teste | `lib/sync-mirror-jobs.ts` |
| domain | `field-labels.ts` + teste (portado) | `lib/sync-mirror-campos.ts` + `__tests__/sync-mirror-campos.test.ts` |
| domain | `mirror-format.ts` + teste | funções `fmt*` de `components/sync-mirror/mirror-ui.tsx` |
| domain | `job-rows.ts` + teste | `montarLinhas` / "fora do catálogo" de `LiveMirrorPanel.tsx` |
| domain | `cycle-rules.ts` + teste | `situacao`, `escala`, `FAIXAS` e pontos do gráfico de `CyclesPanel.tsx` |
| domain | `track-timeline.ts` + teste | montagem/ordenação dos itens, `diaDe` e lacunas de `TrackKeyPanel.tsx` |
| domain | `sync-mirror-availability.ts` + teste (portado) | `lib/sync-mirror-mode.ts` + `__tests__/sync-mirror-mode.guard.test.ts` |
| application | `sync-mirror-repository.ts` | — |
| infrastructure | `sync-mirror-mapper.ts` + teste | formato de fio de `API/src/routes/v1/sync-fbpg-panel.ts` |
| infrastructure | `api-sync-mirror-repository.ts` + teste | ramo Admin API de `lib/sync-mirror-data.ts` |
| ui | `SyncMirrorPage.tsx` + teste | `pages/SyncMirror.tsx` (gate e abas) |
| ui | `SyncMirrorHeader.tsx`, `SyncMirrorUnavailable.tsx` | `pages/SyncMirror.tsx` (cabeçalho e cartão fora da loja) |
| ui | `use-sync-mirror-page.ts`, `use-sync-mirror-repository.ts`, `sync-mirror-query-keys.ts` | consultas de `pages/SyncMirror.tsx` e `lib/query-keys.ts` |
| ui | `mirror-ui.tsx` (`Tag`, `StatusTag`, `DirectionTag`, `Measure`), `MirrorNotices.tsx` | `mirror-ui.tsx` |
| ui | `LiveMirrorPanel.tsx`, `JobDirectionCard.tsx`, `QueuesCard.tsx` | `LiveMirrorPanel.tsx` (296 linhas), `QueuesCard.tsx` |
| ui | `CyclesPanel.tsx`, `CycleRangeSelect.tsx`, `CycleHistoryView.tsx`, `CycleDetailView.tsx`, `CyclesTable.tsx` | `CyclesPanel.tsx` (413 linhas) |
| ui | `EventsPanel.tsx` | `EventsPanel.tsx` |
| ui | `TrackKeyPanel.tsx`, `TimelineEntry.tsx`, `RecordChangeDiff.tsx` | `TrackKeyPanel.tsx` (363 linhas) |
| ui | `HealthPanel.tsx`, `AlarmsCard.tsx` | `HealthPanel.tsx` |

**Fora do módulo:**

- `src/app/(panel)/sync/espelho/page.tsx`
- `tests/visual/fixtures/sync-mirror.ts`
- `tests/visual/scenarios/sync-mirror.ts`

O maior arquivo de produção tem 220 linhas (`sync-mirror-mapper.ts`). O maior de teste tem 241.

**Não portados, conforme a instrução:** `sync-mirror-sample.ts` (o conjunto de exemplo) e todo o
ramo de mock.

## 2. Endpoints usados

São as 10 rotas `GET` da easyfoodmanagerAPI (`/api/v1/...` pelo repasse do Next → `/v1/...`), com
os mesmos parâmetros e padrões com que o legado as chamava no Modo 2. Todas levam o
`x-company-id`/`x-store-id` do tenant.

| Rota | Parâmetros | Quando |
|---|---|---|
| `/sync/fbpg/health` | — | sempre; a cada 5 s ao vivo |
| `/sync/fbpg/jobs` | `minutes` (janela 1/5/15/60; padrão 5) | sempre; 5 s |
| `/sync/fbpg/job-stats` | `minutes` | sempre; 5 s |
| `/sync/fbpg/queues` | — | sempre; 5 s |
| `/sync/fbpg/cycles` | `limit=120` | sempre; 5 s |
| `/sync/fbpg/cycle-history` | `hours`, `bucket_min` (da faixa: 6h/5, 24h/15, 168h/60, 720h/360) | só fora da faixa "detalhe"; 5 s |
| `/sync/fbpg/events` | `limit=100`, `offset=página×100`, `direction`, `table`, `status` (`error`/`success`), `q` | só com a aba "Log do serviço" aberta; 5 s |
| `/sync/fbpg/events` (rastreio) | `limit=300`, `offset=0`, `q=termo` | só com termo na aba Alterações; sem polling |
| `/sync/fbpg/changes` | `limit=200`, `offset=0`, `q` (opcional) | sempre; 5 s |
| `/sync/fbpg/alarms` | `hours=24` | sempre; sem polling |
| `/sync/fbpg/retention` | — | sempre; sem polling |

Filtros vazios não vão na URL (`null`/`""` são omitidos, como no `query()` do legado). "Pausar"
desliga todo o polling. "Atualizar dados" invalida todas as chaves que começam com `sync-mirror-`.
As chaves são as do legado, com `companyId`/`storeId` logo após o prefixo.

## 3. Decisões

- **Gate.** A tela só existe no modo loja (`backend === "lan"`, o antigo Modo 2). Não há
  Electron nem conjunto de exemplo no Next, então o gate ficou com dois casos, ambos testados.
- **O que a nuvem mostra.** O plano pede "Indisponível nesta instalação". Mas o próprio legado
  tem uma tela para esse caso: o cartão **"Disponível apenas na loja"**, que é exatamente o que
  ele mostra na nuvem de produção, onde `isSyncMirrorAvailable()` é falso. Pela regra de
  paridade, portei esse cartão com texto e classes idênticos, e os links usam `next/link`.
  **Se o controller preferir o texto genérico, basta trocar `SyncMirrorUnavailable.tsx`.**
- **Domínio em inglês/camelCase**, como nas Fases 2–4.
  - O formato de fio usa colunas em português. A tradução fica no mapper e é testada campo a
    campo. O mapper converte `bigint` em texto para número e aceita `jsonb` que chegue como texto.
  - Os textos de tela e os valores que aparecem nela continuam em português. Exemplos: os
    rótulos dos jobs, as situações `quieto`/`com efeito`/`lento`/`atenção` e os ids de faixa
    `detalhe`/`6h`.
- **Sem estados de carregando/erro próprios.** É paridade: o legado não tem nenhum dos dois.
  - Os painéis montam vazios enquanto carregam.
  - Uma consulta que falha deixa o painel dela vazio, sem derrubar a tela.
  - O teste de componente cobre carregando, vazio, erro e com dados exatamente nesse
    comportamento.
- **Cópia fiel de JSX e classes.**
  - As peças grandes foram divididas em componentes do módulo (`JobDirectionCard`,
    `CycleHistoryView`, `CycleDetailView`, `CyclesTable`, `TimelineEntry`, `RecordChangeDiff`,
    `AlarmsCard`, `SyncMirrorHeader`, `SyncMirrorUnavailable`).
  - O DOM gerado não muda. Por exemplo, o separador de dia de cada item da linha do tempo
    continua como primeiro filho do wrapper, com o mesmo `first:pt-0`.
- **Reuso do `src/shared`.**
  - `syncLogStatusIsSuccess`, de `@/shared/sync/sync-log-status`, alimenta a etiqueta
    GRAVOU/ATENÇÃO.
  - Também vêm de lá: `PageRefreshButton`, as primitivas (`tabs`/`select`/`table`/`card`/
    `input`/`button`), `cn` e `convert`.
  - Os `fmt*` do espelho não foram trocados por `formatDateTime`/`formatRelativeAgo` porque
    produzem textos diferentes (`30/09 12:00:00`, "há 20 s"/"agora").

## 4. Diferenças conhecidas em relação ao legado

1. **`data: null` na saúde, nas filas ou na retenção.** O legado caía no conjunto de exemplo. O
   Next trata como ausente:
   - saúde → "sem heartbeat recente";
   - filas → o cartão some;
   - retenção → "—".

   O motivo é que o conjunto de exemplo não foi portado, por instrução. Na prática a API sempre
   devolve uma linha para a saúde e para a retenção.
2. **Sem o aviso "Dados de exemplo."** Só aparecia no browser sem backend, que não existe no Next.
3. **`toQueryString` do shared não é usado.** Ele também descarta o texto `"all"`, e isso faria
   a busca por "all" no Log do serviço virar "sem filtro". O repositório tem o seu `buildQuery`,
   igual ao do legado, e um teste cobre esse caso.
4. **Mensagem vazia (`""`) no Log do serviço.** Continua célula vazia, como no legado. O mapper
   não converte `""` em `null` nesse campo.

## 5. Visual

- **Cenário:** `sync-mirror-carregado` (LAN, desktop + mobile), aba "Ao vivo".
- **Relógio congelado.** A tela mostra idades relativas ("há 20 s", "há 15 min"). Por isso o
  cenário congela o relógio do navegador em `2026-09-30T12:00:00Z` com
  `page.clock.setFixedTime`, nos dois apps. É o mesmo instante da fixture, que exporta
  `SYNC_MIRROR_NOW`. Sem isso as capturas divergiriam pelo tempo entre uma e outra. **Nenhum
  cenário anterior usava `page.clock`; vale conferir na Onda 2 se isso convive bem com o login.**
- **Fixture:**
  - Tem as 10 rotas no formato exato de `sync-fbpg-panel.ts`: envelope `{ data }`, colunas em
    português e `disponivel` nos rollups.
  - Os dados cobrem jobs nas duas direções, o rollup disponível (colunas Lidos e Inalterados),
    uma comanda travada na fila, alarme, alterações e retenção.
  - Carreguei o módulo com `node --experimental-strip-types`: ele exporta as 10 rotas.
  - O `/v1/sync/fbpg/*` não colide com nenhuma outra fixture.
- **Não rodei `test:visual`**, conforme o brief.

## 6. Candidatos a compartilhado

- **`buildQuery` sem o descarte de `"all"`.** Serve para qualquer tela com busca livre. Pode
  virar uma opção do `toQueryString`.
- **`formatRelative(iso, now)` / `formatDayTime`, de `domain/mirror-format.ts`.** Úteis se outra
  tela quiser "há N s" no formato do espelho. Hoje só o espelho usa.

## 7. Testes e verificação

| Comando | Resultado |
|---|---|
| `npx vitest run src/modules/sync-mirror --no-file-parallelism` | **10 arquivos, 66 testes verdes** |
| `npx tsc --noEmit` | 0 erros no projeto inteiro no momento da execução |
| `npx eslint src/modules/sync-mirror "src/app/(panel)/sync/espelho" tests/visual/{fixtures,scenarios}/sync-mirror.ts` | 0 erros / 0 avisos |

- **`--no-file-parallelism`:** a primeira execução em paralelo passou (9 arquivos, 58 testes).
  Uma execução seguinte teve workers derrubados com "Zone Allocation failed - process out of
  memory" a cerca de 60 MB de heap. Foi falta de memória da máquina, com os outros agentes
  rodando ao mesmo tempo; nenhum teste falhou por asserção. Em série, tudo verde.
- **O que os testes cobrem:**
  - domínio: catálogo de jobs, rótulos e valores de campo (o teste do legado portado), formatos,
    linhas do Ao vivo, regras de ciclo e escala p90, linha do tempo, gate;
  - mapper: cada rota, incluindo `null`, `bigint` em texto e `jsonb` em texto;
  - repositório: caminhos e parâmetros das 10 rotas, padrões, `"all"` como termo e propagação de
    erro;
  - página, com 8 casos:
    - gate da nuvem sem chamar a API;
    - carregando;
    - vazio;
    - erro 500 em todas as rotas;
    - com dados, incluindo as URLs pedidas e o fato de o Log e o histórico longo não buscarem de
      início;
    - aba Log buscando a primeira página;
    - aba Alterações com o de→para traduzido;
    - Pausar/Retomar e "Atualizar dados" refazendo as consultas.
