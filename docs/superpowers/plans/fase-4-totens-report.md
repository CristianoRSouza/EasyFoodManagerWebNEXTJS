# Fase 4 — Totens (`/totems`) — relatório

> **Superado por `fase-4-integracao-report.md`** (e pelas "Correções pós-revisão" de
> `fase-4-revisao-final.md`). Este relatório descreve um estado intermediário; onde divergir do código, vale o código e aqueles dois documentos.

Agente A da Onda 1. Branch `feat/fase-1-fundacao`. Nada commitado (sem `git commit/merge/push/
stash/reset/checkout/restore`). Nenhum `.env` lido, nenhuma API/Supabase real chamada — tudo
testado com `fetch` mockado (`vi.spyOn`). Toquei apenas: `src/modules/totems/**`,
`src/app/(panel)/totems/page.tsx`, `tests/visual/fixtures/totems.ts`,
`tests/visual/scenarios/totems.ts`, e este relatório. `npx vitest`/`tsc`/`eslint` sempre a partir
de `/c/Users/crist/Desktop/easyfoodmanagerNEXT` (drive maiúsculo).

## Arquivos criados

```
src/modules/totems/
  domain/
    totem-config.ts               # TotemConfig, TotemConfigFormData, TotemSeriesStatus, TotemAuditLog, TotemLicenseSlot
    totem-fiscal.ts                # porta de lib/totem-fiscal.ts (sem as constantes SQL)
    totem-fiscal.test.ts
    totem-license-policy.ts        # cloudMode/localPgOnly/licensePoolMode, licença atual/seletável, isEditingPaidLicense
    totem-license-policy.test.ts
    totem-audit.ts                 # rótulos/filtros/formatação do histórico (sem ícones — ficam na UI)
    totem-audit.test.ts
    totem-form.ts                  # DEFAULTS, regexes, chaveRedigida, sanitizePlainText, omit(), buildTotemSubmitPayload, mapErrorsToTabs
    totem-form.test.ts
    totem-form-validate.ts         # validateTotemForm() — em arquivo próprio para caber em ~300 linhas
    totem-form-validate.test.ts
  application/
    totem-repository.ts            # porta: list/availableLicenses/licensesForLabeling/seriesStatus/auditLogs/create/update/setActive/requeueSync
  infrastructure/
    totem-mapper.ts                # row → domínio (INVARIANTE 2) e domínio → corpo da API
    totem-mapper.test.ts
    api-totem-repository.ts        # ApiTotemRepository(tenant, backend)
    api-totem-repository.test.ts
  ui/
    use-totems-repository.ts
    use-totems-page.ts             # queries, handlers (create/update/toggle/reativar/reenfileirar)
    use-totem-form-state.ts        # estado do diálogo (porta das linhas 162-534 do legado)
    TotemsPage.tsx                 # orquestrador (header, resumo, lista/loading/vazio, diálogos)
    TotemsPage.test.tsx            # loading/vazio/erro/dados + 2 testes de invariante + gate cloud
    TotemCard.tsx
    TotemStatusSwitch.tsx
    TotemAuditDialog.tsx
    TotemReactivateLicenseDialog.tsx
    TotemFormDialog.tsx            # shell (header, tabs, footer)
    TotemFormGeneralTab.tsx
    TotemFormLicenseTab.tsx
    TotemFormNfceTab.tsx
    TotemFormPixTab.tsx
    TotemFormTefTab.tsx
    TotemFormAditumTab.tsx         # segredos Aditum — INVARIANTE 2
    SwitchRow.tsx
src/app/(panel)/totems/page.tsx    # rota já estava no menu (nav-items.ts, Onda 0)
tests/visual/fixtures/totems.ts    # dono de /v1/totems*, /v1/totem-available-licenses, /v1/totem-licenses
tests/visual/scenarios/totems.ts   # cenário "totems-carregado" (mode: lan)
```

Maior arquivo de produção: `use-totem-form-state.ts` (266 linhas); todos os demais < 245. O
`TotemFormDialog` do legado (1.676 linhas) virou 1 shell (165 linhas) + 6 abas (113-244 linhas
cada) + 1 hook de estado + 2 arquivos de domínio puro.

## Endpoints usados (modo LAN, `easyfoodmanagerAPI/src/routes/v1/totems.ts`)

Conferido linha a linha contra o arquivo real (somente leitura, como pedido):

| Método | Rota | Uso |
|---|---|---|
| GET | `/v1/totems` | lista (`ApiTotemRepository.list`) — funciona nos dois backends (mesma rota) |
| GET | `/v1/totem-available-licenses[?totemId=]` | licenças livres + a do totem em edição |
| GET | `/v1/totem-licenses` | todas as licenças, para `buildLicenseLabelMap` |
| GET | `/v1/totems/series-status` | numeração NFC-e por totem/ambiente |
| GET | `/v1/totems/:id/audit-logs` | histórico de alterações |
| POST | `/v1/totems` | cadastro — **só LAN** |
| PATCH | `/v1/totems/:id` | edição — **só LAN** |
| PATCH | `/v1/totems/:id/active` | ativar/desativar (+ vínculo de licença) — **só LAN** |
| POST | `/v1/totems/:id/requeue-cloud-sync` | reenfileirar outbox PG→nuvem — **só LAN** |

Corpo de `POST`/`PATCH /v1/totems*`: `toTotemApiBody()` (porta de
`totemFormDataToAdminApiBody` do legado) remove os campos derivados/só-leitura (ciphertext, flags
`_set`, heartbeat, licença achatada) e inclui `license_id` só quando informado — confirmado 1:1
contra o `totemBodySchema`/`totemPatchBodySchema` (zod) do arquivo real.

**Não portado**: `GET /v1/totems/:id/cloud-sync-diagnostics`. Não encontrei nenhum caminho do
modo Admin API/LAN do legado que o chame — só o branch Electron
(`readTotemPgToCloudSyncDiagnosticsLocal`, SQL direta) o usa; em LAN, o `POST
.../requeue-cloud-sync` já devolve `sync_diagnostics` inline na mesma resposta. Como o brief
restringe a referência de contrato ao arquivo de rotas do easyfoodmanagerAPI e o Next não tem
branch Electron, esta rota fica sem consumidor — nenhuma perda de funcionalidade do modo loja.

## Invariante crítica (segredos TEF/PIX do totem)

Os únicos segredos realmente cifrados neste cadastro são `aditum_partner_token`/
`aditum_activation_code` (TEF Aditum) — confirmado no arquivo real da API
(`encryptSensitiveLocalAesGcmV1`, colunas `aditum_*_encrypted`/`_kid`). Os três `*_api_key`
(`nfce_service_api_key`, `tef_http_api_key`, `pix_http_api_key`) são chaves de serviço HTTP da
própria LAN, gravadas em texto simples até no legado (o servidor não as cifra) — preservei esse
comportamento exatamente, sem "corrigir" para parecer mais seguro do que o legado é.

- **`infrastructure/totem-mapper.ts#toTotemConfig`**: força `aditum_partner_token`/
  `aditum_activation_code` a `null` incondicionalmente (defesa redundante — a API já não os
  devolve) e deriva os flags `_encrypted_set` a partir da presença do CIPHERTEXT
  (`aditum_*_encrypted`), não de um flag que o servidor possa esquecer de enviar. Testado com um
  cenário adversarial: mesmo que a linha viesse com os campos em claro (bug hipotético do
  servidor), o mapper nunca os expõe.
- **`ui/use-totem-form-state.ts`**: ao popular o formulário a partir de um totem existente, os
  dois campos sempre abrem `null` (nunca herdam nada da linha carregada).
- **`domain/totem-form.ts#buildTotemSubmitPayload`**: campo de segredo deixado em branco na
  edição (com cifra já gravada) vira `undefined` — **omitido** do corpo, nunca `null` — para não
  apagar a cifra existente ao salvar outra coisa (mesma regra do legado). Testado nos dois
  sentidos (omite quando vazio + `_set`; envia quando preenchido; nunca omite no cadastro novo).
- **`TotemsPage.test.tsx`**: teste de integração ponta a ponta — abre "Editar", troca para a aba
  Aditum e confirma que os `<Input type="password">` de Partner Token/Ativation Code renderizam
  vazios (não a cifra), com o texto "(definido)" vindo só do flag.

## Endpoints/telas restritos ao backend LAN (decisão documentada)

O brief cita o arquivo de rotas do easyfoodmanagerAPI como referência "somente leitura" — não há
confirmação do contrato de escrita da EasyFoodAPI (nuvem) para totens dentro do escopo desta
tela. Segui a mesma decisão já tomada pelo módulo `issuer` na Fase 3 (`canEdit = backend ===
"lan"`, ver `fase-3-emitente-report.md`): `ApiTotemRepository.create/update/setActive/
requeueSync` lançam erro imediato (sem chamar a rede) fora do LAN, e a UI (`TotemsPage`) esconde
"Novo Totem", "Editar" e o botão de reenfileirar quando `backend !== "lan"` — o switch de
status fica travado (`lockActiveToggle`). Leitura (`list`, licenças, numeração, histórico) roda
nos dois backends, mesma rota, mesmo padrão de `ApiIssuerRepository#list`/
`ApiPixnopdvRepository`.

## Mapeamento do modo legado → backend do Next

O legado tem 4 modos de execução; a tela de Totens usa `cloudMode = isCloudSupabaseMode()` e
`localPgMode/localDemoOnly = isLocalPgTotemMode()` (Electron OU Admin API, nunca Supabase). Como
o Next só tem `lan` e `cloud` (mutuamente exclusivos, sem Electron), documentei a equivalência em
`domain/totem-license-policy.ts`:

- `cloudMode` (legado) → `backend === "cloud"`
- `localPgMode`/`localDemoOnly` (legado) → `backend === "lan"`
- `licensePoolMode = cloudMode || localPgMode` (legado) → **sempre `true`** no Next (os dois
  backends cobrem o "ou" — não existe um 3º modo/mock que precise desligar o pool de licenças)

Isso é uma simplificação, não uma omissão: o comportamento condicional de `licensePoolMode`
continua existindo no código (o campo é passado explicitamente por toda a cadeia de props,
inclusive nos testes), só que sempre resolve para `true` porque o legado tinha um caso a mais
(mock de navegador) que a Fase 2/3 já decidiu não migrar.

## Diferenças conhecidas em relação ao legado (documentadas, com motivo)

1. **Escrita restrita ao LAN** (ver seção acima) — sem paralelo direto no legado, que sempre
   permitia cadastro/edição em qualquer modo não-Electron-puro. Consequência visual: o botão
   "Novo Totem" com tooltip de "licenças em uso" (`policy.cloudMode && freeLicenses.length ===
   0`) fica hoje inalcançável no Next, porque esse botão só renderiza quando `canWrite` (LAN) e
   `policy.cloudMode` é sempre `false` no LAN — código morto por ora, mantido por fidelidade
   estrutural ao legado e porque volta a fazer sentido se/quando a escrita em nuvem for
   confirmada.
2. **`license_device_key` omitido do domínio** — grep no legado confirmou que nenhum componente
   de Totens o lê (`TotemFormDialog` usa `totem.totem_name` como *fallback* de rótulo da licença
   atual, nunca `license_device_key`); o módulo de referência
   (`EASYCOMMAND REFATORADO/src/modules/totems/domain/totem.ts`) também não tem campo
   equivalente. Nenhuma tela perde informação.
3. **Faixa "Dados de demonstração" (mock de navegador) removida** — decisão já tomada pela Fase 2
   ("Regras que valem para todos": ramos mock não migram).
4. **Prefetch on-hover dos diálogos (`prefetchFormDialog`/`prefetchAuditDialog`, `React.lazy`)
   omitido** — otimização de performance pura do legado (reduz o JS inicial da rota Vite), sem
   efeito visual/comportamental; o Next já faz code-splitting por rota via App Router.
5. **`GET /v1/totems/:id/cloud-sync-diagnostics` não portado** — ver seção de endpoints.
6. **Checagem pós-salvamento `assertAdminApiTotemRuntimePersisted`** (releitura de
   `/v1/totems` após `updateTotemConfig` para detectar campos TEF Runtime não persistidos por
   migração desatualizada) não portada — é uma rede de segurança interna do legado para detectar
   drift de schema em ambientes desatualizados, sem UI própria (só aparece embutida na mensagem
   de erro genérica). Fora do escopo funcional desta tela.
   **Atualização (2026-10-01, decisão do controlador — desvio deliberado):** a checagem continua
   não portada, mas o caso que ela pegava na prática (API da loja sem as colunas de voucher da
   migração 045 — o legado mostra "Erro ao salvar" em toda edição, embora grave o resto) agora é
   avisado: o Next mostra o "Totem atualizado com sucesso" normal **e**, só quando o usuário mexeu
   no voucher e a linha devolvida pela API não tem as colunas de voucher, um aviso extra
   "Configuração de voucher não gravada" / "A API desta loja ainda não suporta voucher.".
   O aviso vai pelo Sonner (`toast.warning`) porque o Toaster do shadcn tem `TOAST_LIMIT = 1` (igual
   ao legado) e apagaria o sucesso. Código: `domain/totem-form.ts:191` (`VOUCHER_NOT_PERSISTED_TOAST`),
   `:202` (`voucherChangeNotPersisted`), `ui/use-totems-page.ts:135`. Testes:
   `domain/totem-form.test.ts` ("voucherChangeNotPersisted…") e `ui/TotemsPage.test.tsx` ("voucher sem
   suporte na API da loja…").

Nenhuma divergência decorre de comportamento Electron-dependente: ao contrário do módulo
`issuer` (onde só o Electron editava), a tela de Totens do legado já permitia cadastro/edição
completos em modo Admin API — a restrição a LAN aqui é só por falta de contrato de escrita
confirmado para a EasyFoodAPI, não uma substituição de comportamento Electron.

## Candidatos a compartilhado

Nenhum. Tudo que precisei já existia: `src/shared/ui/primitives/{alert,switch,radio-group,...}`,
`src/shared/license/{license-labels,totem-license-display,LicensePlanBadge}` e
`src/shared/ui/{PageRefreshButton,use-auto-hide-scroll}` (Onda 0), mais `src/shared/format/
date-time.ts` e `src/shared/infrastructure/convert.ts` (Fase 2).

## Resultados dos testes

- `npx vitest run src/modules/totems` — **10 arquivos, 115 testes, todos verdes**.
- `npx vitest run` (projeto inteiro, todos os módulos já entregues) — **126 arquivos, 905 testes,
  todos verdes** — sem regressão nos módulos dos outros agentes da Onda 1.
- `npx tsc --noEmit` — **0 erros no projeto inteiro**.
- `npx eslint "src/modules/totems" "src/app/(panel)/totems"` — **0 erros / 0 avisos** (incluindo
  os avisos do React Compiler — `react-hooks/set-state-in-effect` tratados com
  `eslint-disable-next-line` no mesmo padrão já estabelecido em `AgentFormDialog.tsx`/
  `AgentAuditDialog.tsx`/`AppLayout.tsx`, comentado caso a caso com o motivo).
- Não rodei `npm run build` nem `npm run test:visual` (regra da Fase 4 — outros agentes editando
  a mesma árvore; o controller roda ao final). `tests/visual/fixtures/totems.ts` registra rotas
  próprias (`/v1/totems*`, `/v1/totem-available-licenses`, `/v1/totem-licenses`), sem colisão com
  B (`agents`/`pixnopdv`) ou C (`bootstrap`).
