# Fase 4 — Dispositivos: revisão final

Revisão somente leitura (nenhum comando git que altere índice/árvore/histórico, nenhum servidor ou
suíte executados). Evidência de execução: `fase-4-integracao-report.md` (typecheck 0, lint 0/0,
924 testes verdes, build OK, visual 42/42). Escopo: `src/modules/{totems,agents,pixnopdv,bootstrap}`,
`src/shared/{license,audit}`, primitivas novas, rotas `(panel)/{totems,agents,pixnopdv,bootstrap-codes}`,
fixtures/cenários visuais e `tests/visual/fake-api.ts`.

Referências conferidas: legado (`TotemConfigPage.tsx`, `TotemFormDialog.tsx`, `PixnopdvStoreCredentialsCard.tsx`,
`AgentConfigPage.tsx`, `BootstrapCodePage.tsx`, `issue-bootstrap-code.ts`, `data-service.ts`,
`cloud-api-data.ts`, `cloud-mode.ts`) e API real (`easyfoodmanagerAPI/src/routes/v1/{totems,service-agents,pixnopdv-store-credentials}.ts`).

---

## Crítico

### C1. PIXnoPDV ficou só leitura na nuvem por uma premissa errada: no legado a nuvem de produção GRAVA
- `src/modules/pixnopdv/ui/use-pixnopdv-store-credentials.ts:16-32` (`writable = backend === "lan"`),
  `src/modules/pixnopdv/ui/PixnopdvStoreCredentialsCard.tsx:18-22, 52-63`,
  `PixnopdvStoreCredentialsCard.test.tsx:72` ("paridade literal: writable=false").
- A decisão da integração partiu de "`isCloudApiMode()` nunca esteve na lista de `writable`". Isso é
  verdade, mas a lista tem `isCloudSupabaseMode()`, e no legado essa função devolve `true` **por
  hostname** antes de olhar qualquer flag (`LEGACY/src/lib/cloud-mode.ts:25-47`:
  `h.endsWith(".easysoftcloud.com.br")`). No Modo 3 de produção, as duas detecções de nuvem são
  verdadeiras ao mesmo tempo (regra registrada em `LEGACY/.claude/rules/convencoes-gerais.md`). Então
  `writable === true` no legado em produção, e o save vai por `salvarPixnopdvApi` (`PUT /v1/pixnopdv-store-credentials`).
- Efeito: o usuário da nuvem perde a edição das credenciais PIX da loja. A regra de paridade é violada,
  e o relatório documenta essa mudança como se fosse paridade.
- Correção: `const writable = backend === "lan" || backend === "cloud";`. Reescrever o JSDoc do hook
  e do cartão citando o gate por hostname e inverter o teste da linha 72 para "cloud grava". O alerta
  "Sem credenciais de produção" (`PixnopdvStoreCredentialsCard.tsx:97`) volta a ser alcançável.
  Opcional: adicionar o cenário visual `pixnopdv-nuvem`. Registrar no relatório que o
  comportamento só-leitura do legado existia apenas no Modo 3 fora dos hosts `*.easysoftcloud.com.br`
  (dev/local), um caso que o Next não tem.

### C2. Totens na nuvem chamam uma rota que o cliente cloud do legado nunca chama (`/v1/totems/series-status`)
- `src/modules/totems/infrastructure/api-totem-repository.ts:65-68` usa a mesma rota nos dois backends.
- No legado, `fetchTotemSeriesStatuses` (`data-service.ts:5054-5064`) só chama a rota com Admin API
  (LAN) e devolve `[]` em qualquer modo de nuvem. `cloud-api-data.ts` não tem essa rota. Como o
  contrato cloud só pode ser conferido pelo cliente legado, é uma divergência de contrato. Se a rota
  não existir na EasyFoodAPI, cada abertura da tela gera 404 + 3 retries do TanStack Query, sem
  aviso na tela (o rótulo "próximo número" fica "—", igual ao legado).
- Correção: em `seriesStatus()`, `if (this.backend === "cloud") return [];`, com um comentário que
  aponte `data-service.ts#fetchTotemSeriesStatuses`. Adicionar um teste que confirme que nenhum
  `fetch` é feito no cloud.

### C3. Escritas na nuvem (totens e agentes) ignoram `ok: false` no corpo da resposta
- `api-totem-repository.ts:77-91` (create) e `:100-115` (update); `api-agent-repository.ts:47-66`
  (create/update).
- No cliente legado, o contrato é `Escrita = { ok: boolean; id?; error?; precisa_ativar? }`
  (`cloud-api-data.ts:395`). `createTotemConfig`/`updateTotemConfig`/`createAgentConfig`/`updateAgentConfig`
  devolvem `{ ok: r.ok, error: r.error }` (`data-service.ts:4340-4343, 4514-4517, 5082-5085, 5124-5129`),
  e a página mostra "Erro ao cadastrar/salvar" quando `ok` é falso. O Next só trata exceção HTTP, então
  uma resposta 2xx com `ok:false` vira toast de sucesso e o diálogo fecha sem ter gravado nada.
- Correção: no ramo `cloud`, `if (response.ok === false) throw new Error(response.error ?? "Falha ao gravar.")`
  antes da 2ª chamada de ativação (totens) e no create/update de agentes. Adicionar um teste por caso. O
  `ativarTotemApi` do legado força `ok: true` (a RPC não devolve `ok`), então `setActive` fica como está.

## Importante

### I1. Reenfileirar no LAN perdeu o toast "inicie o Sync PG-SB" e os fallbacks do hint
- `use-totems-page.ts:178-202` e `api-totem-repository.ts:149-157`.
- Legado (`TotemConfigPage.tsx:254-264`): quando `sync_diagnostics.recommendation === "start_sync_service"`
  ou `!sync_service_likely_running`, o título é `"<totem>: inicie o Sync PG-SB"` com
  `variant: "destructive"`. `requeueLocalTotemSyncToCloud` (`data-service.ts:3917-3936`) também usa
  `sync_hint?.trim() || diag?.hint_pt || "Aguarde o Sync PG-SB e vincule a licença no portal web."` e
  `outboxInserted = outbox_inserted !== false`. O Next mostra sempre o toast neutro, usa
  `Boolean(...)` e `sync_hint ?? ""`. É uma divergência não documentada, e esconde justamente o aviso
  operacional mais útil da ação.
- Correção: levar `sync_diagnostics` para `TotemRequeueResult` (no mínimo `recommendation` e
  `syncServiceLikelyRunning`), replicar `needsSync` e a cadeia de fallback, e cobrir com teste.

### I2. A leitura de totens na nuvem aplica a regra "licença ativa", que o `totemDaApi` do legado não aplica
- `totem-cloud-mapper.ts:20-39` parte de `toTotemConfig(row)`, que zera `is_active` e todos os
  campos de licença quando `license_status !== "active"` (`totem-mapper.ts:49-56, 121-127`). O
  `totemDaApi` (`cloud-api-data.ts:242-265`) espalha a linha crua e só troca os segredos/flags. Essa
  regra é do `mapTotemRowFromDb` (Electron/Admin API).
- Efeito: se a nuvem devolver um totem `is_active: true` com licença suspensa, expirada ou sem
  status, o Next mostra "Inativo", esconde o selo da licença e trata o switch/formulário como "sem
  licença". O legado mostra o dado da API. A divergência não está documentada.
- Correção: aplicar no cloud um mapper sem a regra de licença, só com normalização de tipos e com a
  tradução de `_set` e a redação de segredos. Outra saída é documentar a divergência e cobri-la com
  teste, se for intencional.

### I3. A comparação visual não cobre diálogos nem o modo nuvem destas telas
- `tests/visual/scenarios/{totems,agents,pixnopdv}.ts` só comparam a lista carregada no LAN. O
  formulário de totem (1.676 linhas no legado, hoje repartido em 6 abas + hook), o formulário de
  agente (4 abas), os diálogos de histórico, o de reativação e a variante cloud (botões, textos,
  toasts) não têm comparação de pixels. O "diferença zero" do relatório vale só para as listas.
- Correção: adicionar cenários que abram "Editar" no totem e troquem para as abas Geral, Licença,
  NFC-e e Aditum (esta confirma "(definido)" e os campos vazios), "Editar" no agente, "Histórico" e ao
  menos um cenário `mode: "cloud"` para Totens e PIXnoPDV (depois do C1).

## Menor

1. **Código morto `pixnopdv-store-merge.ts` (+ teste de 118 linhas).** Nada o importa, nem a fixture
   (`tests/visual/fixtures/pixnopdv.ts` devolve um objeto fixo), ao contrário do que o relatório da
   Onda 0 (§3, item 4) anunciou. Apagar, ou usar de fato na fixture para simular `PUT`.
2. **Ramos que nunca desviam.** `canWrite` é sempre `true` (`use-totems-page.ts:224`) e ainda assim
   condiciona `TotemsPage.tsx:70, 135, 153-158, 164`. O mesmo vale para `showEditButton`
   (`TotemCard.tsx:28, 148`) e `licensePoolMode` (sempre `true`). Isso multiplica os caminhos sem
   efeito. Remover `canWrite`/`showEditButton`, ou manter um único ponto documentado.
3. **`SummaryCard` duplicado** em `TotemsPage.tsx:200-227` e `AgentCard.tsx` (`AgentSummaryCard`),
   com JSX idêntico. Mover para `src/shared/ui/SummaryCard.tsx` (o legado também duplica, mas a Onda 2
   pedia unificar duplicatas).
4. **Toast de erro sem o anexo de diagnóstico.** O legado baixa `admin-api-diag-*.json` e acrescenta
   "Foi gerado admin-api-diag-*.json (Downloads)." em "Erro ao cadastrar/salvar"
   (`TotemConfigPage.tsx:170-178, 195-203`). A omissão é razoável (não depende de Electron, mas não
   tem utilidade no Next), porém não está documentada. Registrar no relatório.
5. **`syncHint` vazio no cadastro LAN.** O Next usa `response.sync_hint ?? null`
   (`api-totem-repository.ts:97`) e o legado usa `sync_hint?.trim() || undefined`
   (`data-service.ts:4366`). Com hint `""`, o Next mostra a descrição vazia em vez do texto padrão
   da outbox. Usar `response.sync_hint?.trim() || null`.
6. **Loja no bootstrap.** `BootstrapCodesPage.tsx:71` usa `||` e o legado usa `??`
   (`BootstrapCodePage.tsx:30`). Com `trade_name: ""`, o Next mostra o id da loja. Trocar para `??`.
7. **Rejeição não tratada ao falhar o salvamento.** `TotemFormDialog.tsx:67-70` faz `await
   handleSubmit()`, que relança depois do toast, e gera um *unhandled rejection* no console. O
   legado faz o mesmo. Envolver em `try/catch` vazio e conferir o mesmo padrão em `AgentFormDialog`.
8. **Risco herdado, em paridade: "Restaurar padrões" na edição** (`use-totem-form-state.ts:228-231`
   = `TotemFormDialog.tsx:1631-1634` do legado) repõe os tokens sandbox do Aditum e as chaves de API
   padrão e descarta os flags `_set`. Salvar em seguida sobrescreve as credenciais reais. Não é
   defeito do Next. Fica registrado para decisão do usuário (ex.: na edição, não repor os campos
   secretos).
9. **Relatórios contraditórios com o código.** `fase-4-totens-report.md` ("Escrita restrita ao LAN",
   "Endpoints … só LAN"), `fase-4-onda-0-report.md` (`writable` sempre `true`, tipos snake_case,
   merge usado pela fixture, "Totens reutiliza o cartão") e `fase-4-agentes-pixnopdv-report.md`
   ("não recebe `backend`") descrevem estados superados. Pôr no topo de cada um uma linha
   "Superado por `fase-4-integracao-report.md`".
10. **Comentário errado na fixture.** `tests/visual/fixtures/pixnopdv.ts:4-5` fala na "loja `s1`",
    mas os dados usam `sL`.
11. **`aria-label="Menu do usuário"` só para o harness** (`src/shared/layout/UserMenu.tsx:37-40`).
    É inofensivo e até melhora a acessibilidade, mas o comentário o justifica como gancho de teste.
    Preferir `data-testid`, ou justificar como acessibilidade.

## Conferido e correto (sem ação)

- **Segredos Aditum**: nunca voltam ao formulário (`use-totem-form-state.ts:92-93`) nem aos
  mappers (`totem-mapper.ts:72,76`, `totem-cloud-mapper.ts:25-26`). Campo vazio na edição com cifra
  gravada é omitido (`totem-form.ts:159-167`, `totem-mapper.ts:191-192`,
  `totem-cloud-mapper.ts:117-120`), e a API real mantém a cifra quando a chave está ausente
  (`totems.ts:915-930`). "(definido)" e o placeholder vêm só dos flags. Tudo idêntico ao legado.
- **Chaves `*_api_key`**: no LAN vão em claro (a API não as cifra, como no legado). Na nuvem vêm
  redigidas e são omitidas quando em branco (`chaveRedigida`), iguais a `corpoTotem`/`CAMPOS_TOTEM`.
- **PIXnoPDV**: `basic_token`/`secret_key` só entram no PUT se digitados; "Limpar" manda `null`;
  ausente mantém (`pixnopdv-mapper.ts:62-69`, API `pixnopdv-store-credentials.ts:115-127`). A
  resposta traz só `_set`.
- **Contratos LAN**: caminhos, query `totemId`, corpo de ativação `{is_active, license_id}`, corpo
  de agente (com `install_path: null` e sem `agent_name` no PATCH) e requeue conferem com as rotas
  reais. **Contratos cloud**: `corpoTotem`, a 2ª chamada `PATCH …/active` quando `precisa_ativar` e
  o requeue (`licenses_requeued`) conferem com `cloud-api-data.ts`, exceto C2/C3.
- **Tenant, camadas e logs**: todos os repositórios recebem `Tenant` por `useRequiredTenant`, as
  query keys levam empresa e loja, o bootstrap põe a loja no caminho, nada do escopo importa
  `src/server` e não há `console.*` nos módulos.
- **Tamanho**: nenhum arquivo de produção passa de ~300 linhas. Os textos visíveis do formulário, do
  cartão e das páginas batem com o legado (varredura de literais sem ausências relevantes).

## Veredito

**Pronto para o usuário revisar: Com correções.** C1–C3 são pequenos e localizados (uma linha
cada, mais testes). I1 e I2 pedem ajuste de mapper/resultado com teste, e I3 pede cenários
visuais novos.

---

## Correções pós-revisão

Aplicadas antes da integração da Fase 5 (sem commits). Evidência: suíte inteira e `test:visual`
verdes, em `fase-5-integracao-report.md`.

| Item | Situação | Onde |
|---|---|---|
| C1 | **Corrigido.** `writable = backend === "lan" \|\| backend === "cloud"`, com JSDoc citando o gate por hostname. O teste passou a afirmar "cloud grava". | `use-pixnopdv-store-credentials.ts`, `PixnopdvStoreCredentialsCard.test.tsx` |
| C2 | **Corrigido.** `seriesStatus()` devolve `[]` no cloud sem rede (paridade com `fetchTotemSeriesStatuses`). Há teste. | `api-totem-repository.ts` (+ teste "C2") |
| C3 | **Corrigido.** `ok: false` num 2xx vira erro. Totens: checado depois da 2ª chamada de ativação, na mesma ordem de `criarTotemApi`/`editarTotemApi`. Agentes: create/update/setActive. Um teste por caso. | `api-totem-repository.ts`, `api-agent-repository.ts` |
| I1 | **Corrigido.** `sync_diagnostics` entra em `TotemRequeueResult`. `needsSync` gera o título "<totem>: inicie o Sync PG-SB" (`destructive`). Fallbacks do legado: `outbox_inserted !== false` e `sync_hint?.trim() \|\| hint_pt \|\| texto padrão`. | `api-totem-repository.ts`, `use-totems-page.ts`, `TotemsPage.test.tsx` |
| I2 | **Corrigido.** O cloud usa `toTotemConfigWithoutLicenseRule`: `is_active` e a licença chegam como a API manda, como em `totemDaApi`. | `totem-cloud-mapper.ts` (+ teste "I2") |
| I3 | **Corrigido no LAN.** Cenários novos: formulário do totem (Geral, Licença, NFC-e, PIX, TEF, Aditum), histórico e reativação de licença; formulário do agente (Geral, API, Conting., Sync) e histórico. Cenários `mode: "cloud"` de Totens/PIXnoPDV continuam pendentes (ver `fase-4-integracao-report.md` §6). | `tests/visual/scenarios/{totems,agents}.ts` |
| Menor 1 | **Corrigido.** `pixnopdv-store-merge.ts` e o teste dele foram apagados. | — |
| Menor 2 | **Corrigido.** Saíram `canWrite`/`showEditButton`, que eram sempre `true`. `licensePoolMode` continua só como regra de domínio testada. | `TotemsPage.tsx`, `TotemCard.tsx` |
| Menor 3 | **Corrigido.** `SummaryCard` único, usado por Totens e Agentes. | `src/shared/ui/SummaryCard.tsx` |
| Menor 4 | **Documentado** como omissão deliberada. | `fase-4-integracao-report.md` §5 item 4 |
| Menor 5 | **Corrigido.** `sync_hint?.trim() \|\| null`. | `api-totem-repository.ts` |
| Menor 6 | **Corrigido.** `trade_name ?? id`. Há teste. | `BootstrapCodesPage.tsx` |
| Menor 7 | **Corrigido.** `try/catch` no clique de salvar do `TotemFormDialog`. O `AgentFormDialog` já tratava o erro no próprio `handleSubmit`. | `TotemFormDialog.tsx` |
| Menor 8 | **Mantido e documentado** (risco herdado, em paridade). Fica para decisão do usuário. | `fase-4-integracao-report.md` §5 item 5 |
| Menor 9 | **Corrigido.** Linha "Superado por `fase-4-integracao-report.md`" no topo dos três relatórios. | relatórios da Fase 4 |
| Menor 10 | **Corrigido.** O comentário da fixture agora cita a loja `sL`. | `tests/visual/fixtures/pixnopdv.ts` |
| Menor 11 | **Corrigido, e o gancho deixou de existir.** O `aria-label` virou `data-testid` e depois foi removido na Fase 5: nenhum cenário esconde mais o menu do usuário, que é comparado de verdade. O `UserMenu.tsx` voltou a ser idêntico ao da Fase 1. | `src/shared/layout/UserMenu.tsx` |
