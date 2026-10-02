# Fase 5: revisão final (sync e demais)

Branch `feat/fase-1-fundacao`, com tudo ainda sem commit. A revisão foi **somente leitura**: não rodei
nenhum comando git que altere índice, árvore ou histórico, não subi servidores e não rodei suítes. A
evidência de execução é `fase-5-integracao-report.md`: typecheck 0, lint 0/0, 1192 testes verdes,
build OK e 96/96 cenários visuais.

Conferi contra:
- o plano da Fase 5 (regra de paridade, armadilha da nuvem, "sem Supabase no navegador");
- os relatórios `fase-5-*`;
- o legado (`easyfoodmanagerWEB`);
- a API real da loja (`easyfoodmanagerAPI/src/routes/v1/{sync,sync-local-panel,sync-fbpg-panel}.ts`);
- o cliente de nuvem do legado (`src/lib/cloud-api*.ts`, `cloud-sync-{inbox,outbox}.ts`).

## Crítico

### C1. Relatório de erros na loja: a sessão não é verificada, e a rota vira relay aberto com o segredo

- **Onde:**
  - `src/app/api/error-report/route.ts:16`
  - `src/server/session/lan-session-gateway.ts:47-51`
  - `src/server/session/jwt-claims.ts:3-18`
- **O que acontece:** a rota autentica com `gateway.currentUser(cookie)`. No backend `lan`, isso
  chama `readClaims`, que decodifica o JWT **sem validar a assinatura**. O próprio comentário diz
  "serve só para exibir quem está logado".
- **Impacto:** o relatório de erros é o primeiro uso desse método como **autorização**. Na rede da
  loja, qualquer um monta um cookie `efm_session=x.<base64url {"sub":"…","email":"…"}>.y` e consegue:
  - passar do 401;
  - forjar `user_id`/`user_email`. A garantia "o usuário vem da sessão, nunca do corpo" cai;
  - usar o servidor como repasse ao EasyGuardian com `x-report-secret`, até 4 MiB por chamada e sem
    limite de frequência.

  Na nuvem não há o problema, porque o `CloudSessionGateway.currentUser` consulta `/v1/auth/me`.
- **Correção:**
  1. Separar "quem exibir" de "quem autenticar". Um método novo no `SessionGateway`
     (`verifiedUser(cookie)`) valida de verdade:
     - na loja, com `GET /v1/auth/me` (ou equivalente) na easyfoodmanagerAPI, com o Bearer do
       cookie; ou com a verificação da assinatura pela chave pública da API;
     - na nuvem, com o `/auth/me` atual.
  2. A rota passa a usar `verifiedUser`.
  3. Teste novo: um token forjado (assinatura inválida) recebe 401 e o destino não é chamado.

## Importante

### I1. A rota lê o corpo inteiro, sem teto, antes de autenticar

- **Onde:** `src/app/api/error-report/route.ts:10-15`
- **O que acontece:** o 413 antecipado só funciona quando existe `content-length`. Um envio
  *chunked* (sem esse cabeçalho) passa direto para `await request.text()`, que junta o corpo inteiro
  em memória. Só depois `handleErrorReport` mede o tamanho e confere a sessão.
- **Impacto:** negação de serviço por memória, sem autenticação. O `proxy.ts` não cobre `/api`, e o
  Next não impõe limite de corpo em route handler.
- **Correção:**
  1. Autenticar (C1) **antes** de ler o corpo.
  2. Ler `request.body` em stream, somando bytes e abortando com 413 ao passar de `MAX_REPORT_BYTES`.
  3. Teste com corpo *chunked* acima do teto.

### I2. Sem limite de frequência no servidor

- **Onde:** `src/server/error-report/handle-error-report.ts:28-59`
- **O que acontece:** o anti-inundação (5 relatórios por sessão, deduplicação de 60 s) só existe no
  navegador, e o atacante o ignora. O proxy do legado também não tinha limite. O Next já é mais
  estrito que ele (sessão, zod, teto), mas o objetivo desta rota é justamente não ser um repasse
  barato do segredo.
- **Correção:**
  - Balde de fichas em memória por `user.id`, alinhado ao cliente (por exemplo 5/min), e por IP
    (por exemplo 20/min).
  - Acima do limite, responder 429 sem encaminhar.
  - Teste com a sexta chamada seguida.

### I3. `keepalive` com corpo acima de 64 KiB: o relatório com captura de tela é descartado em silêncio

- **Onde:** `src/shared/errors/error-reporter.ts:98-104`, combinado com `report-limits.ts` (4 MiB)
- **O que acontece:** o spec do Fetch recusa com erro de rede toda requisição `keepalive` com corpo
  acima de 64 KiB (o Chrome aplica isso).
  - A captura JPEG 0,6 de 1280 px quase sempre passa disso.
  - O `.catch(() => {})` engole o erro.
  - Na prática, **todo relatório com captura se perde**. Só chegam os relatórios em que o
    `html2canvas` falhou.
- **Impacto:** o texto "Um relatório foi enviado automaticamente" (`ErrorBoundary`) continua falso,
  e o teto de 4 MiB do `fase-5-integracao-report.md` (B1) não tem efeito. O legado tem o mesmo defeito,
  então isto conta como **bug claro** pela regra de paridade.
- **Correção:**
  - Usar `keepalive: true` só com corpo ≤ ~60 KiB. Acima disso, fazer o envio normal (a tela de erro
    fica aberta) ou mandar sem captura.
  - Teste: corpo grande leva `keepalive: false` ou vai sem captura; corpo pequeno leva `keepalive: true`.
  - Registrar como correção de bug do legado.

### I4. Assistente: o cache local é gravado no servidor antes da carga, e a troca de tenant arrasta a conversa

- **Onde:**
  - `src/modules/assistant/ui/use-ai-chat.ts:31-35`
  - `src/modules/assistant/ui/use-chat-sessions.ts:67-81` e `29-58`
  - `src/modules/assistant/ui/chat-storage.ts:8-12`
- **O que acontece:**
  - O `AIChatPanel` fica montado sempre, porque o botão o mantém. Na montagem, `messages` vem do
    `localStorage` e o efeito chama `syncToday(messages)` **antes** de `loadSessions` responder.
  - A guarda só cobre a lista vazia. Com cache cheio, sai `PUT /v1/ai/sessions/today` com o cache em
    **toda carga completa de página na nuvem**.
- **Consequências:**
  1. Uma conversa mais nova, feita em outro dispositivo, é sobrescrita pelo cache velho (perda de dados).
  2. Num PC compartilhado, as chaves `easycommandpay:ai-chat:*` não separam usuário nem empresa. A
     conversa do usuário A é gravada como a "de hoje" do usuário B.
  3. Ao trocar de empresa/loja, o `repo` muda, `syncToday` muda e o efeito reenvia as mensagens do
     tenant anterior ao tenant novo.
- **Paridade:** no ramo de produção do legado (Supabase), o `syncToday` sai cedo enquanto
  `userIdRef` é nulo, então o item 1 não acontece lá na montagem. O item 3 existe também no legado.
  Isso também é bug claro.
- **Correção:**
  - Um `loadedRef` por tenant: `syncToday` não grava nada enquanto `loadSessions` do repo atual não
    terminou.
  - Na troca de `repo`, zerar `messages` e `todaySessionIdRef` (ou dar `key={storeId}` ao `AIChatButton`).
  - Chavear o cache por `userId + companyId`.
  - Testes: montagem com cache e servidor com outra conversa não gera `PUT`; troca de loja não
    reenvia as mensagens.

### I5. Auditoria mostra `nfce_service_api_key` e `tef_http_api_key` em claro (paridade, sinalizado)

- **Onde:** `src/modules/audit/ui/AuditLogTimelineEntry.tsx:65-70`. Vale o mesmo para o
  `TotemAuditDialog` da Fase 4.
- **O que acontece:** é idêntico ao legado (`formatValue` sem máscara), e o relatório da onda C
  (decisão 5) já registra. A tela é só para admin do sistema, mas as chaves de TEF e de NFC-e ficam
  visíveis e vão parar em capturas de tela (inclusive na do relatório de erros).
- **Decisão do usuário:** mascarar na UI (por exemplo `••••1234` para campos `*_api_key|*_secret|*_token`)
  e, de preferência, também na EasyFoodAPI. Se a decisão for mascarar, isso é um desvio consciente
  da paridade e deve ser documentado.

## Menor

1. **A sessão semeada no legado tem e-mail fixo.** Em `tests/visual/scenario.ts:205`, a
   `seedLegacyProductionSession` usa `admin@nuvem.dev`, mesmo quando o cenário entra como
   `licenca-vencida@…` ou `admin-sistema@…`. Hoje não aparece na tela, porque o menu fica fechado,
   mas um cenário que abra o menu compararia e-mails diferentes.
   - **Correção:** passar o e-mail do cenário para `seedLegacyProductionSession`, ou ler o
     `efa_session` no próprio script.
2. **A comparação visual da nuvem usa o ramo `VITE_CLOUD_API` do legado, não o ramo de produção
   (Supabase).** Para a IA, a licença e a sincronização na nuvem, "diferença 0" prova paridade
   **visual** com o ramo da API, e não com o comportamento de produção. Por exemplo, a classificação
   da licença no navegador e a edge `ai-chat` ficam de fora. Está coerente com a armadilha da nuvem,
   mas vale uma linha explícita no relatório de integração.
3. **A versão é lida duas vezes.** `src/shared/errors/error-reporter.ts:92` lê
   `process.env.NEXT_PUBLIC_APP_VERSION` de novo. Exportar a versão crua de `src/shared/version.ts`
   e reutilizar.
4. **`ERROR_REPORT_URL` aceita qualquer esquema.** Em `src/server/error-report/error-report-config.ts:21`,
   o segredo iria em claro para um `http://`. Exigir `https:` e, sem isso, desligar e registrar no log.
5. **Defesa em profundidade na rota**, em `src/server/error-report/error-report-payload.ts:27-30` e
   `handle-error-report.ts`:
   - exigir `content-type: application/json` e `Origin` igual ao host (hoje o cookie `SameSite=Lax`
     cobre o CSRF);
   - validar `screenshot` como `^data:image/jpeg;base64,`;
   - reaplicar `maskObject` (de `shared/errors/telemetry.ts`) no servidor antes de encaminhar.
6. **Captura de tela com dados de clientes vai para um terceiro.** A captura (CPF, valores, chaves do
   I5) segue sem máscara para o EasyGuardian. Isso é paridade com o legado. O relatório D anterior
   tinha omitido a captura justamente por isso. Registrar como decisão do usuário.
7. **Licença e selo de plano diferem no estado "empresa escolhida, sem loja".** Em
   `src/shared/license/use-license-status.ts:20-21`, a consulta é por loja e só roda com `selection`.
   O legado consulta por **empresa** e mostra a faixa assim que há `selectedCompanyId`, inclusive na
   tela de escolha de loja com uma empresa só. É diferença pequena, e ainda gera uma consulta a mais
   por loja.
   - **Correção:** usar `selectedCompanyId` do `useTenant` na chave e no `enabled`, se o repasse
     aceitar só o `x-company-id`. Se não aceitar, documentar.
8. **`shared` importa de `modules`.** `src/shared/layout/AppLayout.tsx:9` importa `@/modules/assistant`.
   Está documentado como composição da casca. Mais limpo: o `app/(panel)/layout.tsx` injeta o botão
   por *slot* ou `prop`.
9. **Utilitário de teste misturado com produção.** `src/modules/assistant/ui/test-helpers.tsx` está
   entre os arquivos de UI. Renomear para `*.test-utils.tsx` ou mover para `__tests__/`.
10. **Cobertura visual pendente** (já listada no relatório de integração):
    - aba Outbox do `/sync` na loja;
    - abas Ciclos, Log, Alterações e Saúde do Espelho;
    - cenários de nuvem de Totens, Agentes e PIXnoPDV.

    Em especial, a correção da data das falhas do outbox (relatório de sync, diferença 4) não tem
    cenário visual. Hoje só testes de componente cobrem esses pontos.

## Verificado e sem achado

- **Contratos com a API da loja.**
  - `/v1/sync/logs?limit=500`.
  - As 16 rotas `/v1/sync/{inbox,outbox}/*`:
    - colunas `apply_status`/`dispatch_status`, `received_at`/`changed_at`,
      `aplicados_por_minuto`/`despachados_por_minuto`, `dispatch_error`;
    - resumo como objeto na loja e como array na RPC;
    - `reset-to-pending` com `{event_id}`.
  - As 10 rotas `/v1/sync/fbpg/*`:
    - nomes em português;
    - `media_ms` calculado pela API;
    - `{disponivel, linhas}`;
    - `fechamentos_detalhe`;
    - `detalhe.{de,para}`.

  Tudo bate com `sync-local-panel.ts` e `sync-fbpg-panel.ts`. O mapper é tolerante a `bigint` em
  texto.
- **Contratos com o cliente de nuvem do legado.**
  - Sincronização: rotas derivadas da RPC (`cloud_sync_inbox_failures_by_error` →
    `/sync/inbox/failures-by-error`), com `limit`/`offset`.
  - Auditoria: `/v1/audit-logs?limit=500`.
  - IA: `/v1/ai/{sessions,sessions/today,sessions/:id,chat}`, SSE no formato OpenAI e textos de
    402/429/401.
  - Billing: `/v1/billing/{usage,credits}?limit=200`, `/v1/billing/license`, `/v1/billing/plan-window`.
  - `/v1/auth/me` → `{id,email}`.
- **Sem token nem Supabase no JS.** O chat e o billing vão pelo repasse `/api/v1` com cookie
  httpOnly e cabeçalhos de tenant. Não há `supabase` importado nos módulos da Fase 5, e `src/modules`
  e `src/shared` não importam `@/server`. O segredo `ERROR_REPORT_SECRET` só existe no servidor
  (`server-only`), e a resposta do destino nunca volta ao navegador (há teste).
- **Créditos da IA.**
  - A cota de 10 por dia no fuso de Brasília, a regra de suporte fora da cota e o saldo como soma
    do extrato são iguais ao legado.
  - A aplicação real é do servidor (402), como no legado; o painel não bloqueia o envio, e o legado
    também não.
  - Correção documentada: a recarga pós-resposta dispara uma vez só.
- **Redação no relator.** As regexes de chave e de `Bearer`/JWT, o corte em 2048 caracteres e os
  buffers 100/50/50 são cópia fiel do legado.
- **Paridade por modo.**
  - Faixa de licença, selo e alerta no cabeçalho, e botão de IA: só na nuvem, com as mesmas
    condições do `AppLayout` legado (`cloudActive`, `selectedStoreId`). Os textos da faixa e do
    tooltip são idênticos.
  - Auditoria na loja mostra "Acesso restrito", e na nuvem só para admin do sistema.
  - Espelho mostra "Disponível apenas na loja" na nuvem, e a nuvem não oferece "reenfileirar".
  - Os estados de erro e vazio seguem o legado, com as correções documentadas.
- **Tenant.** Toda `queryKey` inclui empresa e loja. Os painéis de sincronização são remontados por
  loja, e a seleção é memoizada, de modo que os repositórios ficam estáveis.
- **Tamanho.** Nenhum arquivo de produção do escopo passa de 300 linhas (o maior é `ManualPage.tsx`,
  com 226).

## Veredito

**Pronto para o usuário revisar: Com correções.** Primeiro C1 (autenticação real na rota de
relatório no modo loja). Depois, I1 a I4. I5 e os menores 6 e 7 pedem decisão do usuário.

## Correções pós-revisão

Tudo continua sem commit. Legado e easyfoodmanagerAPI só lidos. Nenhum teste fala com API ou
Supabase de verdade.

| Item | Mudança (arquivo:linha) | Teste que cobre |
|---|---|---|
| **C1** | Método novo `SessionGateway.verifiedUser` (`src/server/session/session-gateway.ts:40`); `currentUser` documentado como "só exibir". Loja: `GET /v1/meta/app-info` com o Bearer do cookie — a easyfoodmanagerAPI não tem `/auth/me`; essa rota passa pelo `requireAuth` (valida assinatura e validade) e não tem efeito colateral (`src/server/session/lan-session-gateway.ts:27,62`). Token malformado/vencido nem chama a API; 401, erro ou API fora do ar = `null` (falha fechada). Nuvem: delega ao `/auth/me` (`src/server/session/cloud-session-gateway.ts:72`). A rota usa `verifiedUser` (`src/app/api/error-report/route.ts:21`). | `lan-session-gateway.test.ts` › "verifiedUser (autorização, não exibição)" (4 casos, incl. token forjado); `cloud-session-gateway.test.ts` › "verifiedUser é o /auth/me"; `handle-error-report.test.ts` › "C1 — token forjado … 401, corpo nem lido e nada encaminhado"; `api-routes.test.ts` › "/api/error-report" (a rota usa `verifiedUser`, nunca `currentUser`) |
| **I1** | Autentica antes de ler; corpo lido em fluxo com teto e cancelado ao passar dele (`src/server/error-report/read-capped-body.ts:7`, chamado em `handle-error-report.ts:93`). O 413 antecipado por `content-length` continua (`handle-error-report.ts:82`). | `read-capped-body.test.ts` (4 casos, incl. fluxo sem fim cancelado); `handle-error-report.test.ts` › "I1 — teto do corpo" (declarado; *chunked* sem `content-length`, com leitura interrompida; `content-length` mentindo) |
| **I2** | Janela deslizante em memória; recusa não conta; teto de chaves (`src/server/error-report/rate-limiter.ts:25`). 20/min por IP antes da verificação (que custa uma chamada ao backend) e 5/min por usuário depois (`handle-error-report.ts:30,84,90`); 429 com `retry-after`. IP = 1º de `x-forwarded-for` (`route.ts:11`). | `rate-limiter.test.ts` (4 casos); `handle-error-report.test.ts` › "I2" (6ª chamada do usuário → 429; 21ª do IP → 429 sem verificar nem encaminhar) |
| **I3** (bug do legado) | `keepalive` só com corpo ≤ 60 KiB (`src/shared/errors/report-limits.ts:14`, `error-reporter.ts:112`); acima disso, fetch normal COM a captura; acima de 4 MiB, sem a captura (já existia). Registrado como correção de bug no JSDoc (`error-reporter.ts:14`). | `error-reporter.test.ts` › "I3 — keepalive só com corpo pequeno" (pequeno → `true`; captura de 300 KiB → `false` e captura enviada; acima do teto → sem captura e `true`) |
| **I4** (bug do legado) | Nada é gravado antes de a carga do tenant atual terminar (`use-chat-sessions.ts:101`); a conversa recém-carregada não é regravada (`:104`); resposta de carga antiga é descartada (`:58`); troca de tenant zera a tela no mesmo render (`use-ai-chat.ts:36`); cache com dono `:<userId>:<companyId>:<storeId>` (`chat-storage.ts:27`) — as chaves antigas, sem dono, não são lidas. | `AIChatPanel.test.tsx` › "I4 — cache local e troca de tenant" (5 casos: cache velho + servidor mais novo → nenhum `PUT`; nada antes da carga; cache de outro usuário/loja ignorado; chave com dono; troca de loja não regrava na loja nova) |
| **I5** | Mantido (paridade). Risco documentado em `fase-5-integracao-report.md` › "Adendo pós-revisão". | — |
| **Menor 1** | `Scenario.cloudEmail` (`tests/visual/scenario.ts:41`); `seedLegacyProductionSession(context, email)` (`:211,230`) e `visual.spec.ts:77`; os cenários com e-mail próprio o declaram (`audit.ts`, `bootstrap.ts`, `billing.ts`). | `test:visual` (cenários de nuvem, diferença 0) |
| **Menor 2** | Documentado em `fase-5-integracao-report.md` › "Adendo pós-revisão". | — |
| **Menor 3** | `APP_VERSION` exportado (`src/shared/version.ts:11`) e reutilizado (`error-reporter.ts:99`). | `error-reporter.test.ts` › "a versão enviada é a do pacote" |
| **Menor 4** | `ERROR_REPORT_URL` precisa ser `https:`; senão desliga e avisa uma vez no log, só com esquema+host (`error-report-config.ts:49`). README e `.env.example` atualizados. | `handle-error-report.test.ts` › "ERROR_REPORT_URL sem https … desliga e avisa no log, sem o segredo" |
| **Menor 5** | `content-type: application/json` (415) e `Origin` igual ao host, aceitando `x-forwarded-host` (403) (`handle-error-report.ts:80-81`); `screenshot` só `data:image/jpeg;base64,…` (`error-report-payload.ts:14,30`; o navegador descarta captura de outro formato, `error-reporter.ts:35`); `maskObject` reaplicado no servidor em tudo menos a captura (`error-report-payload.ts:55`). | `handle-error-report.test.ts` › "Menor 5 — defesa em profundidade" (415; 403 com e sem proxy; redação no servidor sem corromper a captura) e "captura que não é JPEG: 400" |
| **Menor 6** | Mantido (paridade). Risco documentado no adendo do relatório de integração. | — |
| **Menor 7** | Licença por EMPRESA, como o legado: `queryKey ["license-status", companyId]`, habilitada com `selectedCompany` (inclui "empresa escolhida, sem loja"); `x-store-id` só quando há loja (`src/shared/license/use-license-status.ts:23-26`; `api-billing-repository.ts` aceita `TenantHeaders`). | `LicenseExpiredBanner.test.tsx` › "Menor 7" (empresa sem loja consulta só com `x-company-id`; trocar de loja na mesma empresa não consulta de novo) |
| **Menor 8** | `AppLayout` recebe o botão pela `prop` `assistant` (`src/shared/layout/AppLayout.tsx:110`); `app/(panel)/layout.tsx:17` injeta `<AIChatButton />`. `shared` não importa mais `modules`. | `AppLayout.assistant.test.tsx` (só nuvem e com loja) |
| **Menor 9** | `test-helpers.tsx` → `src/modules/assistant/ui/assistant.test-utils.tsx`. | `AIChatPanel.test.tsx` |
| **Menor 10** | Cenários novos (abaixo). Fixture: falha terminal no outbox com a data em `changed_at` (`tests/visual/fixtures/sync.ts`). | `test:visual` |

### Cenários visuais novos

| Cenário | Modo | desktop | mobile | Observação |
|---|---|---|---|---|
| sync-outbox-carregado | loja | 0 | 0 | Afirma a correção da data (Next `01/01/2024 … 05:07`, legado `—`) e tira da comparação só a coluna de data do card "Últimas falhas" (`mask`); o resto da aba é comparado |
| sync-mirror-ciclos | loja | 0 | 0 | relógio congelado em `SYNC_MIRROR_NOW` |
| sync-mirror-log | loja | 0 | 0 | idem |
| sync-mirror-alteracoes | loja | 0 | 0 | idem |
| sync-mirror-saude | loja | 0 | 0 | idem |
| totems-nuvem-carregado | nuvem | 0 | 0 | legado `VITE_CLOUD_API` → `GET /api/v1/totems` (`totemDaApi`) |
| agents-nuvem-carregada | nuvem | 0 | 0 | `GET /api/v1/service-agents` |
| pixnopdv-nuvem-carregada | nuvem | 0 | 0 | `GET /api/v1/pixnopdv-store-credentials` |

O caminho de nuvem do legado para as três telas de dispositivos pôde ser dirigido pelo harness (as
rotas canônicas das fixtures servem aos dois modos), então nenhum ficou de fora.

### Consequências de comportamento a conhecer

- **Assistente:** o painel abre vazio até a lista do servidor chegar (o cache local só é lido depois
  que o servidor diz quem é o usuário). Se a carga falhar, a conversa do dia não é gravada no
  servidor (fica só na tela) — gravar sem conhecer o estado do servidor é o que causava a perda.
- **Relatório de erros na loja:** cada relatório custa uma chamada `GET /v1/meta/app-info` à
  easyfoodmanagerAPI (limitada pelo teto por IP).

### Resultado final dos comandos

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 erros |
| `npm run lint` | 0 erros / 0 avisos |
| `npm test` | 173 arquivos, **1228 testes verdes** (antes: 171 / 1192) |
| `npm run build` (`BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999`) | OK |
| `npm run test:visual` (Fases 1–5, desktop + mobile; rodado por projeto) | **112/112 verdes** (56 cenários × 2), sem *flaky* |

Diferenças não nulas, todas abaixo de 0,001: `nfce-issuer-carregado` mobile 0,0000729,
`totems-form-pix` 0,0000093 / 0,0000243 e `totems-reativar-licenca` mobile 0,0000334 (as mesmas do
relatório de integração); e `licenca-vencida-nuvem` desktop **0,000191** — os dois rótulos de eixo do
gráfico "Transações (7 dias)", a mesma corrida do recharts com fontes `display: swap` descrita em
`fase-5-integracao-report.md` (item 3). O contorno do harness reduz a corrida, mas não a elimina
(numa rodada parcial anterior ela apareceu em `licenca-vencendo-nuvem` desktop). Não tem relação com
estas correções.
