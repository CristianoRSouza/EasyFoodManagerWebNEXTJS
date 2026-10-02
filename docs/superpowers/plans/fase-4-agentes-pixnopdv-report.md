# Fase 4 — Agentes de Serviço (`/agents`) + PIXnoPDV (`/pixnopdv`) — relatório (agente B)

> **Superado por `fase-4-integracao-report.md`** (e pelas "Correções pós-revisão" de
> `fase-4-revisao-final.md`). Este relatório descreve um estado intermediário; onde divergir do código, vale o código e aqueles dois documentos.

Branch `feat/fase-1-fundacao`. Nada commitado (nenhum `git commit/merge/push/stash/reset/checkout/
restore` foi usado). Nenhum `.env` lido. Nenhum teste chama API real/Supabase (tudo com `fetch`
mockado via `vi.spyOn`, ou `apiRequest` mockado no nível de repositório). `npx vitest`/`tsc`/`eslint`
sempre executados a partir de `/c/Users/crist/Desktop/easyfoodmanagerNEXT`.

`src/modules/pixnopdv/**` (núcleo pronto da Onda 0) **não foi tocado** — fora da minha linha na
tabela da Onda 1. `npm run build` e `npm run test:visual` **não foram rodados** (outros agentes
editando a mesma árvore).

## Arquivos criados

### `src/modules/agents/` (módulo novo)

```
domain/
  agent-config.ts                    # AgentConfig, AgentConfigFormData, AgentAuditLog,
                                      # createAgentFormDefaults, formatMs, agentConfigToFormData,
                                      # agentConfigFormDataWithoutName
  agent-config.test.ts               # 9 casos
  agent-form-validation.ts           # porta pura de AgentFormDialog#validate/nameStatus/errorTabs
  agent-form-validation.test.ts      # 13 casos
  agent-audit.ts                     # labels de ação/campo, filterAgentAuditLogs, formatAuditValue
  agent-audit.test.ts                # 10 casos
application/
  agent-repository.ts                # interface AgentRepository
infrastructure/
  agent-config-mapper.ts             # toAgentConfig, toAgentAuditLog (asText/asNumber/asBoolean)
  agent-config-mapper.test.ts        # 5 casos
  api-agent-repository.ts            # ApiAgentRepository (GET/POST/PATCH /v1/service-agents*)
  api-agent-repository.test.ts       # 9 casos
ui/
  use-agent-repository.ts            # useAgentRepository()
  use-agents-page.ts                 # estado da tela + handlers create/update/toggle (toast+invalidate)
  AgentsPage.tsx                     # página (cópia fiel de pages/AgentConfigPage.tsx)
  AgentsPage.test.tsx                # 8 casos (carregando/vazio/erro/dados/toggle/editar/criar/histórico)
  AgentCard.tsx                      # AgentCard + AgentSummaryCard (cópia fiel)
  AgentStatusSwitch.tsx              # cópia fiel de components/agent/AgentStatusSwitch.tsx
  AgentFormDialog.tsx                # shell do diálogo (abas, header, footer) — cópia fiel
  AgentFormFieldHint.tsx             # FieldHint + SectionHeader (cópia fiel)
  AgentFormGeneralTab.tsx            # aba "Geral" (cópia fiel, extraída por causa do limite ~300 linhas)
  AgentFormApiTab.tsx                # aba "API" (idem)
  AgentFormContingencyTab.tsx        # aba "Contingência" (idem)
  AgentFormSyncTab.tsx               # aba "Sync" (idem)
  AgentAuditDialog.tsx               # diálogo de histórico (cópia fiel, filtro extraído para domínio)
```

### Rotas

- `src/app/(panel)/agents/page.tsx` — `<AgentsPage />`.
- `src/app/(panel)/pixnopdv/page.tsx` — página fina sobre `PixnopdvStoreCredentialsCard` (cópia
  fiel de `pages/PixnopdvStoreCredentialsPage.tsx`); **sem** `ui/PixnopdvPage.tsx` próprio porque
  `src/modules/pixnopdv` não está na minha linha (núcleo da Onda 0) — o wrapper vive direto na
  rota, como o próprio legado faz.
- `src/app/(panel)/pixnopdv/page.test.tsx` — 2 casos (cabeçalho + delega dados ao cartão; botão
  Atualizar dispara nova busca). **Nota de escopo:** este arquivo não está literalmente nomeado na
  tabela da Onda 1 (que lista só `page.tsx`); mantive por ser teste (não produção), no mesmo
  diretório que já posso tocar, e por cobrir o requisito de TDD "pelo menos um teste de componente
  da tela" também para PIXnoPDV. Se o controller preferir removê-lo por rigor de escopo, é seguro
  apagar sem afetar o resto.

### Visual

- `tests/visual/fixtures/agents.ts` — dona de `/v1/service-agents`, `/v1/service-agents/:id/audit-logs`
  (2 agentes determinísticos: um ativo+contingência+sync, outro inativo+simples).
- `tests/visual/fixtures/pixnopdv.ts` — dona de `/v1/pixnopdv-store-credentials` (credenciais
  preenchidas para a loja `sL`, a mesma que `openLanPanel`/`fake-api.ts` usam em modo `lan`).
- `tests/visual/scenarios/agents.ts` — cenário `agents-carregada` (`mode: "lan"`).
- `tests/visual/scenarios/pixnopdv.ts` — cenário `pixnopdv-carregada` (`mode: "lan"`).

## Endpoints usados (Admin API / easyfoodmanagerAPI, `easyfoodmanagerAPI/src/routes/v1/service-agents.ts`)

Confirmado que o mesmo caminho relativo atende os dois backends do Next (`lan` e `cloud`) — ver
`easyfoodmanagerWEB/src/lib/cloud-api-data.ts` (`fetchApiAgentConfigs`, `criarAgenteApi`,
`editarAgenteApi`, `ativarAgenteApi` chamam exatamente `/v1/service-agents*`, igual ao ramo Admin
API). Por isso `ApiAgentRepository`, como `ApiPixnopdvRepository` da Onda 0, **não** recebe
`backend` no construtor.

| Operação | Rota | Corpo | Observações |
|---|---|---|---|
| Listar | `GET /v1/service-agents` | — | `{ data: AgentConfig[] }` |
| Criar | `POST /v1/service-agents` | `AgentConfigFormData` + `install_path: null` | Igual ao legado (ramo Admin API): `install_path` sempre `null` ao criar. |
| Editar | `PATCH /v1/service-agents/:id` | `AgentConfigFormData` **sem** `agent_name`, + `install_path: null` | `agent_name` nunca é reenviado (chave de identificação, imutável nos dois ramos do legado); `install_path: null` também sempre reenviado — mesmo comportamento do legado, não é bug meu. |
| Ativar/Desativar | `PATCH /v1/service-agents/:id/active` | `{ is_active }` | |
| Histórico | `GET /v1/service-agents/:agentId/audit-logs` | — | `{ data: AgentAuditLog[] }` |

PIXnoPDV: `GET`/`PUT /v1/pixnopdv-store-credentials` — inalterado, já implementado pelo núcleo da
Onda 0 (`src/modules/pixnopdv`); minha página só consome `PixnopdvStoreCredentialsCard` e invalida
a query pelo prefixo `["pixnopdv-store-credentials-producao"]`.

## Decisões

1. **Tipos em `snake_case`, sem mapper para camelCase** — mesma decisão (e mesmo motivo) da Onda 0
   para `pixnopdv`: a tela é cópia fiel do JSX do legado, que referencia os campos crus
   (`a.agent_name`, `form.sefaz_timeout_ms`, …). Um mapper para camelCase afastaria os componentes
   do "cópia fiel" pedido pela regra de paridade. Ainda assim escrevi um mapper de **validação de
   tipo** (`agent-config-mapper.ts`, `asText/asNumber/asBoolean`) porque a resposta HTTP é sempre
   `unknown` na prática — não é tradução de vocabulário, é defesa contra campo ausente/tipo
   inesperado (mesmo padrão de `modules/units/infrastructure/unit-mapper.ts`).
2. **Validação do formulário extraída para o domínio** (`agent-form-validation.ts`) — porta pura de
   `AgentFormDialog.tsx#validate`/`nameStatus`/`errorTabs`, sem mudança de regra: nome obrigatório
   e no formato `/^[A-Za-z0-9-]+$/`, duplicado só ao criar, mínimos numéricos (timeout≥1000,
   tentativas≥1, backoff≥0, rate limit≥1). As abas Contingência/Sync continuam sem validação
   nenhuma — igual ao legado (não é uma omissão minha).
3. **Filtro do histórico extraído para o domínio** (`agent-audit.ts#filterAgentAuditLogs`) — porta
   pura de `AgentAuditDialog.tsx#filteredLogs` (ação + período `hoje/7d/30d`), testável com um
   `now` fixo em vez de `new Date()` implícito.
4. **`install_path: null` forçado em create/update** — replica literalmente o legado
   (`data-service.ts`, ramo Admin API): a coluna não é editável pelo painel e o legado sempre a
   reseta. Documentado no JSDoc do repositório para não parecer acidental.
5. **`refetchInterval: 30_000`** em `use-agents-page.ts`, igual ao legado
   (`AgentConfigPage.tsx#useCompanyQuery`) — mesmo raciocínio do `use-dashboard-snapshot-query.ts`
   já existente (TanStack Query já pausa em background, sem reimplementar o polling manual).
6. **Formulário de 436 linhas dividido em 6 arquivos** (`AgentFormDialog` + 4 abas +
   `AgentFormFieldHint`), todos < 300 linhas, JSX/classes idênticos ao legado — só a fronteira dos
   componentes mudou (uma div a mais por `TabsContent`, mesmas classes, sem efeito visual).
7. **`fetchAgentSeriesStatuses`/`AgentSeriesStatus` NÃO portado** — não é usado por
   `AgentConfigPage`/`components/agent/*` (só por telas de Totens, fora da minha linha).

## Divergência conhecida do legado — PIXnoPDV `writable` (requer ação de outro agente)

A Onda 0 decidiu que `writable` no cartão (`src/modules/pixnopdv/ui/use-pixnopdv-store-credentials.ts`,
linha 33) seria `backend === "lan" || backend === "cloud"` (sempre `true`), classificando a
divergência do legado como bug claro: lá, `writable = isElectronShell() || isAdminApiConfigured() ||
isCloudSupabaseMode() || isBrowserMockDatasetMode()` — **não inclui** `isCloudApiMode()` (Modo 3,
"Cloud via EasyFoodAPI", que é o modo real por trás do backend `cloud` do Next), mesmo a tela tendo
`fetchApiPixnopdvCredentials`/`salvarPixnopdvApi` funcionais para esse modo.

**Instrução recebida para esta tarefa:** o controller decidiu pela paridade literal, não pela
correção do bug — `writable` deve seguir EXATAMENTE o legado por modo: `lan` (≈ Admin
API/Electron) grava; `cloud` (≈ Modo 3 EasyFoodAPI) **não** grava no legado, mesmo tendo os
endpoints prontos, e o Next deve reproduzir esse mesmo comportamento, não corrigi-lo.

**Não posso aplicar essa mudança**: `src/modules/pixnopdv/**` está fora da minha linha na tabela da
Onda 1 (é núcleo compartilhado da Onda 0, tocado por outro agente). Além disso
`PixnopdvStoreCredentialsCard` não aceita nenhuma prop de override de `writable` — só
`{ embedInPage?: boolean }` — então minha página em `src/app/(panel)/pixnopdv/page.tsx` não tem
como compensar isso de fora.

**Mudança exata que a integração precisa aplicar** (fora do meu escopo):

```diff
--- a/src/modules/pixnopdv/ui/use-pixnopdv-store-credentials.ts
@@
-  // Os dois backends do Next (`lan` ≈ Modo 2 Admin API, `cloud` ≈ Modo 3 EasyFoodAPI) já são
-  // graváveis pela API real — ver o comentário do JSDoc acima sobre o bug do legado.
-  const writable = backend === "lan" || backend === "cloud";
+  // Paridade literal com o legado (decisão do controller na Fase 4, não correção do bug):
+  // isCloudApiMode() nunca esteve na lista de `writable` do legado — só Electron/Admin
+  // API/Supabase legado. O backend `cloud` do Next é o Modo 3 (EasyFoodAPI), que portanto
+  // reproduz o comportamento SÓ-LEITURA do legado, mesmo tendo os dois endpoints prontos.
+  const writable = backend === "lan";
```

E atualizar o JSDoc do arquivo (linhas 16-22) e do componente
(`PixnopdvStoreCredentialsCard.tsx`, linhas 18-20), que hoje documentam a decisão oposta ("um BUG
conhecido... corrigido aqui"). Nenhum teste existente deveria quebrar: os testes atuais do cartão
(`PixnopdvStoreCredentialsCard.test.tsx`) só cobrem `backend: lan` além do estado vazio em `cloud`
— um novo caso (`cloud` não editável) precisaria ser adicionado por quem aplicar a mudança.

Meu cenário visual (`pixnopdv-carregada`) roda em `mode: "lan"`, então não é afetado por essa
divergência de qualquer jeito.

## Candidatos a compartilhado

Nenhum. Todas as primitivas/hooks necessários (`alert` não foi usado nesta tela; `switch`, `select`,
`tabs`, `dialog`, `card`, `badge`, `button`, `tooltip`, `input`, `label`, `useAutoHideScroll`,
`PageRefreshButton`, `useToast`) já existiam de fases anteriores/Onda 0.

## Resultados dos testes

| Comando | Resultado |
|---|---|
| `npx vitest run src/modules/agents` | **6 arquivos, 50 testes, todos verdes** |
| `npx vitest run src/modules/agents "src/app/(panel)/pixnopdv" "src/app/(panel)/agents"` | **7 arquivos, 52 testes, todos verdes** |
| `npx tsc --noEmit` | 0 erros nos meus arquivos (1 erro pré-existente em `src/modules/totems/ui/TotemsPage.tsx`, do agente A, em andamento na mesma árvore — não é meu) |
| `npx eslint src/modules/agents "src/app/(panel)/agents" "src/app/(panel)/pixnopdv"` | 0 erros / 0 avisos |
| `npx eslint tests/visual/fixtures/agents.ts tests/visual/fixtures/pixnopdv.ts tests/visual/scenarios/agents.ts tests/visual/scenarios/pixnopdv.ts` | 0 erros / 0 avisos |

Sub-resultados por arquivo: `domain/agent-config.test.ts` (9), `domain/agent-form-validation.test.ts`
(13), `domain/agent-audit.test.ts` (10), `infrastructure/agent-config-mapper.test.ts` (5),
`infrastructure/api-agent-repository.test.ts` (9), `ui/AgentsPage.test.tsx` (8),
`app/(panel)/pixnopdv/page.test.tsx` (2).

`npm run build` e `npm run test:visual` **não foram rodados** (regra da Fase 4 — o controller roda
tudo no fim da Onda 1/2).
