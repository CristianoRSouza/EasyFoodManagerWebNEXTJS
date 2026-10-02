# Fase 4 — Integração (Onda 2): relatório

Branch `feat/fase-1-fundacao`. Nada commitado — nenhum `git commit/merge/push/stash/reset/checkout/
restore` usado. Nenhum `.env` lido. Nenhum teste fala com API/Supabase real (unitários com `fetch`
mockado; visuais só com `tests/visual/fake-api.ts` + isolamento de rede de `scenario.ts`).
`MAX_DIFF_RATIO` (0,001) **não** foi alterado.

Esta integração foi feita em três sessões; as duas primeiras foram interrompidas por limite de API
antes de escrever relatório. Esta terceira partiu do `git status`/datas de modificação e terminou o
trabalho, sem refazer o que já estava certo.

## 1. O que as sessões anteriores já tinham feito (encontrado na árvore)

- **PIXnoPDV `writable` por modo** — `use-pixnopdv-store-credentials.ts`: `writable = backend ===
  "lan"` (paridade literal: `isCloudApiMode()` nunca esteve na lista de `writable` do legado), JSDoc
  do hook e do cartão atualizados, e 3 testes novos em `PixnopdvStoreCredentialsCard.test.tsx`
  (aviso "não é possível editar" no cloud com e sem dados; sem aviso no LAN).
  > **Revertido (C1 da revisão final):** a premissa estava errada — no legado `isCloudSupabaseMode()`
  > é `true` por hostname (`*.easysoftcloud.com.br`), então a nuvem de produção GRAVA. Hoje
  > `writable = backend === "lan" || backend === "cloud"`; ver "Correções pós-revisão" em
  > `fase-4-revisao-final.md`.
- **Totens gravando no cloud** — `ApiTotemRepository` passou a receber `backend`; no cloud usa
  `toTotemCloudApiBody` (porta de `corpoTotem`, lista explícita `CAMPOS_TOTEM`, chaves redigidas
  omitidas, segredos Aditum só se digitados), dispara o 2º `PATCH .../active` quando a API responde
  `precisa_ativar` (como `criarTotemApi`/`editarTotemApi`), e `requeueSync` lê só
  `licenses_requeued` no cloud. `canWrite` = LAN **ou** cloud (legado testa `isCloudApiMode()`
  antes do ramo Admin API). Testes de repositório (cloud) e de página (cloud mostra "Novo Totem"/
  "Editar").
- **Visual / admin só no cenário de bootstrap** — `fake-api.ts`: o login da nuvem grava o e-mail
  no valor opaco do cookie (`efa_session=fake:<email>`) e `/me/context` devolve
  `is_company_admin: true` só para `admin-empresa@nuvem.dev` (`COMPANY_ADMIN_EMAILS`); todos os
  outros cenários continuam `false`. Cenário novo `bootstrap-codes-carregado` (preenche o e-mail,
  gera o código, compara o estado "Código gerado") com fixture DETERMINÍSTICA
  (`fixtures/bootstrap.ts`: código, e-mail, loja e validade fixos — nada mascarado no código).
- **`UserMenu`** ganhou `aria-label="Menu do usuário"` (sem efeito visual) para o cenário poder
  escondê-lo — motivo documentado em `scenarios/bootstrap.ts` (o legado só mostra esse menu no
  Modo 4/Supabase; no Modo 3 `userEmail` fica sempre `null` — bug do legado, não do Next).
  > **Trocado (Menor 11):** hoje é `data-testid="user-menu-trigger"` (`getByTestId` no cenário).

## 2. Mudanças desta sessão, por item

### Item 1 — PIXnoPDV gravável por modo
Já estava pronto (ver §1). Conferido contra `LEGACY/src/components/totem/
PixnopdvStoreCredentialsCard.tsx` (`writable = isElectronShell() || isAdminApiConfigured() ||
isCloudSupabaseMode() || isBrowserMockDatasetMode()`): LAN grava, cloud só leitura com o mesmo
early-return/aviso. Nada a acrescentar além da refatoração do item 4.
> **Revertido (C1):** cloud também grava — `isCloudSupabaseMode()` do legado é verdadeiro por
> hostname em produção. O só-leitura do legado existia apenas no Modo 3 fora de
> `*.easysoftcloud.com.br` (dev/local), caso que o Next não tem.

### Item 2 — Escrita no cloud: Totens e Agentes
- **Totens — leitura no cloud faltava a tradução de `totemDaApi`.** Com a escrita no cloud ligada,
  isso era um risco real: a EasyFoodAPI responde `aditum_partner_token_set` (não o ciphertext), e o
  mapper comum derivava o flag só do ciphertext → a aba Aditum mostraria "sem credencial". Novo
  `infrastructure/totem-cloud-mapper.ts`:
  - `toTotemConfigFromCloudApi(row)` — porta de `totemDaApi`: traduz `aditum_*_set` →
    `*_encrypted_set`, força segredos e as três `*_api_key` a `null` e lê seus `_set`. Assim o
    formulário não completa as chaves com o DEFAULT e `toTotemCloudApiBody` as omite (sem gravar a
    chave padrão por cima da real). `ApiTotemRepository.list()` usa este mapper quando
    `backend === "cloud"`.
  - `toTotemCloudApiBody` foi movido de `totem-mapper.ts` para cá (mantém `totem-mapper.ts` em 216
    linhas, abaixo de ~300).
  - Teste novo `totem-cloud-mapper.test.ts` (3 casos: tradução do flag; segredos/chaves nunca
    expostos; formulário + corpo não reenviam chave gravada nem segredo vazio).
- **Agentes — o corpo do cloud divergia do legado.** `ApiAgentRepository` mandava sempre
  `install_path: null`; no legado isso é só do ramo Admin API (LAN). O ramo `isCloudApiMode()`
  manda o formulário cru (`criarAgenteApi(data)`) e, no PATCH, sem `agent_name`
  (`editarAgenteApi(id, resto)`) — nunca `install_path` (schema estrito da EasyFoodAPI → 400).
  Agora o repositório recebe `(tenant, backend)` como o de Totens; `install_path: null` só no LAN.
  `use-agent-repository.ts` passa `useRuntime().backend`. Rotas iguais nos dois backends
  (`/v1/service-agents*`, `.../active` com `{ is_active }`). 3 testes novos de cloud em
  `api-agent-repository.test.ts`; `AgentsPage.test.tsx` passou a envolver a página em
  `RuntimeProvider` (LAN).
- `setActive` de Totens: o legado chama `toggleTotemActive(id, v, licenseId ?? null)` nos dois
  modos, então `license_id` sempre vai no corpo — igual ao Next. Sem mudança.

### Item 3 — Visual do bootstrap com contexto de admin
Pronto desde a sessão anterior (§1). A primeira rodada completa desta sessão falhou só em
`bootstrap-codes-*` **mobile** (0,00137 e 0,00134). Os diffs mostraram uma única diferença: o botão
flutuante do **Assistente IA do legado** (`components/ai-chat/AIChatButton.tsx`,
`aria-label="Abrir Assistente IA"`, renderizado quando `cloudActive && selectedStoreId`) — recurso
de IA que chega ao Next só na Fase 5 (mesmo motivo já registrado em `Scenario.region`). Estes são os
primeiros cenários a chegar ao painel logado da nuvem, por isso só agora apareceu. Acrescentado ao
`mask` dos dois cenários (constante renomeada para `HIDE_NON_PARITY_CHROME`), com o motivo no
comentário. É `position: fixed` — escondê-lo não desloca nada; no Next o locator não casa com nada.
Nenhum outro pixel diferia (desktop já passava com o botão dentro da tolerância).

### Item 4 — Convenções
- **PIXnoPDV em camelCase + mapper.** A justificativa da Onda 0 ("cópia fiel do JSX referencia os
  nomes crus") não se sustentou: o cartão só lê 4 campos da resposta, a fidelidade é de markup/
  classes/textos (inalterados), e as Fases 2/3 e o `bootstrap` já usam camelCase no domínio. Agora:
  - `domain/pixnopdv-store-credentials.ts`: `PixnopdvStoreCredentials` e
    `PixnopdvStoreCredentialsInput` (camelCase).
  - `infrastructure/pixnopdv-mapper.ts` (novo): formato de fio (`PixnopdvCredentialsApiView`/
    `PixnopdvCredentialsApiPutBody`), `toPixnopdvStoreCredentials(row)` (flags de segredo só `true`
    quando a API diz `true`; resposta sem objeto → `null`) e `toPixnopdvPutBody(input)` (preserva a
    semântica "ausente mantém, `null` apaga" — nunca transforma `undefined` em chave).
    `pixnopdv-mapper.test.ts` (5 casos).
  - `pixnopdv-store-merge.ts` (+teste) movido de `domain/` para `infrastructure/`: é simulação do
    lado servidor no formato de fio, não regra de domínio.
    > **Apagado (Menor 1):** nada o importava (nem a fixture visual).
  - Repositório, hook e cartão atualizados; `get()`/`save()` devolvem `PixnopdvStoreCredentials |
    null` (o legado trata `data == null` como "sem cadastro" no cloud).
- **Agentes e Totens continuam em snake_case**, agora documentado com o motivo correto nos
  JSDocs de `agent-config.ts`/`totem-config.ts` (≈20 e ≈60 campos que o formulário edita e que
  voltam como corpo da API; o custo de tradução bidirecional é o inverso do PIXnoPDV). Os dois têm
  mapper de validação de tipo na entrada.
- **`TotemConfig extends TotemLicenseFields`** (`src/shared/license/totem-license-display.ts`) —
  compatibilidade estrutural garantida pelo compilador. `toTotemConfig` passou a usar
  `hasActiveTotemLicense` do shared em vez da cópia inline da regra.
- **Duplicatas unificadas em `src/shared/audit/audit-log.ts`** (+ teste): o filtro ação/período,
  `formatAuditValue` e `formatAuditDateTime` estavam copiados em `totems/domain/totem-audit.ts`,
  `agents/domain/agent-audit.ts` e `agents/ui/AgentAuditDialog.tsx` (este com um `formatDateTime`
  local). Os módulos mantêm só os rótulos próprios e reexportam/envolvem o shared.
- **Nomes:** `totems/ui/use-totems-repository.ts` → `use-totem-repository.ts`
  (`useTotemRepository`, singular como todos os outros módulos). PIXnoPDV ganhou
  `ui/PixnopdvPage.tsx` (+ `PixnopdvPage.test.tsx`, movido de `app/(panel)/pixnopdv/page.test.tsx`);
  a rota ficou fina (`<PixnopdvPage />`), como as demais.
- **Tamanho:** maior arquivo de produção da Fase 4 = `totems/ui/use-totem-form-state.ts` (266
  linhas); nenhum acima de ~300.

## 3. Resultado final dos comandos

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 erros |
| `npm run lint` | 0 erros / 0 avisos |
| `npm test` | 129 arquivos, 924 testes, todos verdes |
| `BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999 npm run build` | OK (todas as rotas, incluindo `/totems`, `/agents`, `/pixnopdv`, `/bootstrap-codes`) |
| `npm run test:visual` (Fases 1–4, desktop+mobile) | 42/42 verdes (21 cenários × 2 viewports) |

## 4. Diff ratio por cenário × viewport (rodada final)

| Cenário | Modo | desktop | mobile |
|---|---|---|---|
| login-loja | lan | 0 | 0 |
| login-nuvem | cloud | 0 | 0 |
| reset-sem-link | lan | 0 | 0 |
| primeiro-acesso | lan | 0 | 0 |
| painel-404-loja | lan | 0 | 0 |
| painel-seletor-nuvem | cloud | 0 | 0 |
| dashboard-carregado | lan | 0 | 0 |
| receitas-carregada | lan | 0 | 0 |
| orders-lista | lan | 0 | 0 |
| transactions-lista | lan | 0 | 0 |
| products-lista | lan | 0 | 0 |
| units-lista | lan | 0 | 0 |
| nfce-lista | lan | 0 | 0 |
| nfce-detail-carregado | lan | 0 | 0 |
| nfce-issuer-carregado | lan | 0 | 0,0000729 |
| taxreform-configuracao-fiscal | lan | 0 | 0 |
| totems-carregado | lan | 0 | 0 |
| agents-carregada | lan | 0 | 0 |
| pixnopdv-carregada | lan | 0 | 0 |
| bootstrap-codes-sem-permissao | cloud | 0 | 0 |
| bootstrap-codes-carregado | cloud | 0 | 0 |

## 5. Diferenças residuais e causa

1. **`nfce-issuer-carregado` mobile, 0,0000729** — já existente e investigada na Fase 3
   (`fase-3-integracao-report.md`, "Diferença residual"): anti-aliasing de fonte por
   arredondamento de subpixel depois do `display:none` recalcular o `flex`; bem abaixo do limite.
2. **Máscaras documentadas (só nos dois cenários de bootstrap):** menu do usuário do Next (o
   legado não o mostra no Modo 3 por depender da sessão Supabase — bug do legado) e o botão do
   Assistente IA do legado (Fase 5). O código gerado NÃO é mascarado: vem de fixture determinística.
3. **Comportamentais, documentadas nos módulos:** ~~PIXnoPDV só leitura no cloud~~ (revertido
   pelo C1 — cloud grava, como o legado em produção); o aviso Electron "Não foi
   possível resolver a loja" do cartão PIXnoPDV foi omitido; `GET /v1/totems/:id/
   cloud-sync-diagnostics` e a checagem `assertAdminApiTotemRuntimePersisted` não portados (ver
   `fase-4-totens-report.md`).

4. **Omissão deliberada — anexo de diagnóstico nos erros de escrita de totem (Menor 4 da revisão
   final).** No legado, "Erro ao cadastrar"/"Erro ao salvar" baixa `admin-api-diag-*.json` e
   acrescenta "Foi gerado admin-api-diag-*.json (Downloads)." à descrição
   (`TotemConfigPage.tsx#handleCreate/handleUpdate`, via `lib/admin-api-diag.ts`). O Next não porta
   o log de diagnóstico da Admin API do navegador (a chamada sai do servidor Next, não do browser);
   a toast mostra só a mensagem de erro.
5. **Risco herdado em paridade — "Restaurar padrões" na edição (Menor 8 da revisão final).**
   `use-totem-form-state.ts#handleRestoreDefaults` (= `TotemFormDialog.tsx` do legado) repõe os
   tokens sandbox do Aditum e as chaves de API padrão e descarta os flags `_set`; salvar em seguida
   sobrescreve as credenciais reais do totem. Mantido igual ao legado pela regra de paridade;
   **sinalizado para decisão do usuário** (ex.: na edição, não repor os campos secretos).

## 6. Pontos de atenção

- **Nenhum cenário visual exercita Totens/Agentes/PIXnoPDV no modo cloud** — os caminhos de escrita
  cloud estão cobertos só por testes unitários contra o contrato do cliente legado
  (`cloud-api-data.ts`); o contrato de escrita da EasyFoodAPI para totens/agentes não foi conferido
  contra o código do servidor (não está no repo `easyfoodmanagerAPI`).
- **Emissão de código de primeiro acesso** (`POST /v1/stores/:id/bootstrap-code`) continua sem
  handler encontrado no `easyfoodmanagerAPI` (ver `fase-4-bootstrap-codes-report.md`).
- Os relatórios da Onda 0/1 citam caminhos antigos (`pixnopdv/domain/pixnopdv-store-merge.ts`,
  `use-totems-repository.ts`, `app/(panel)/pixnopdv/page.test.tsx`); este relatório é a referência
  atual.
