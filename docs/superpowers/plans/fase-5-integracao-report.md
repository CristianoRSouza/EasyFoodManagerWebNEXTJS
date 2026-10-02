# Fase 5: integração (e fechamento das correções da Fase 4)

Branch `feat/fase-1-fundacao`. Nada foi commitado. Não usei `git commit`, `merge`, `push`, `stash`,
`reset`, `checkout` nem `restore`. Nenhum `.env` foi lido. Nenhum teste fala com API ou Supabase
de verdade: os unitários simulam `fetch`, e o harness visual usa `fake-api.ts` e intercepta todo
host externo. `MAX_DIFF_RATIO` continua em 0,1%.

## Parte A: Fase 4, correções da revisão final

Conferi item a item contra o código. As rodadas anteriores tinham deixado quase tudo aplicado,
com teste, e não refiz nada. Esta rodada fechou dois pontos:

- **Menor 11**: o gancho `data-testid="user-menu-trigger"` saiu do `UserMenu.tsx`. Nenhum cenário
  esconde mais o menu (ver B4), e o arquivo voltou a ser idêntico ao da Fase 1.
- **Registro**: a tabela "Correções pós-revisão" foi acrescentada ao fim de
  `fase-4-revisao-final.md`.

Situação de cada item:

- **Corrigidos, com teste**: C1 (a nuvem grava PIXnoPDV), C2 (`series-status` não é chamado na
  nuvem), C3 (`ok:false` num 2xx vira erro em totens e agentes), I1 (título "inicie o Sync PG-SB"
  e fallbacks do hint) e I2 (a leitura de totens na nuvem não aplica a regra de licença).
- **I3**: 13 cenários de diálogo no LAN (formulários de totem e de agente por aba, histórico e
  reativação). Os cenários de nuvem de Totens e PIXnoPDV continuam pendentes.
- **Menores 1, 2, 3, 5, 6, 7, 9, 10 e 11**: corrigidos.
- **Menor 4**: documentado como omissão deliberada.
- **Menor 8**: mantido em paridade com o legado e documentado para decisão do usuário.

## Parte B: integração da Fase 5

### B1. Markdown e captura de tela como no legado

- **Dependências**: entraram as mesmas faixas de versão do legado.
  - `react-markdown@^10.1.0` (instalada 10.1.x)
  - `remark-gfm@^4.0.1`
  - `html2canvas@^1.4.1`
- **`MessageBubble.tsx`**:
  - Agora renderiza com `<ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a }}>`, com o
    mesmo `components.a` do `AIChatPanel.tsx` legado: link interno navega e fecha o painel; link
    externo abre em nova aba.
  - A única troca é `navigate` → `router.push`.
  - As classes `prose` não mudaram.
  - O renderizador mínimo (`ui/markdown/*`, 4 arquivos e 2 testes) foi apagado. Com isso somem
    as duas diferenças que ele tinha: HTML cru aparecia como texto, e `---` sob um parágrafo não
    virava título setext.
  - Teste novo: `MessageBubble.test.tsx`, com estrutura DOM, tabela e riscado GFM, links
    interno e externo, descarte de HTML cru e mensagem do usuário em texto puro.
- **Captura de tela no relatório de erros**:
  - Porta de `captureScreenshot` do legado: `html2canvas` sob demanda, `scale = min(1,
    1280/innerWidth)`, JPEG 0,6, e falha vira `null`.
  - O teto do corpo passou a ser um só, `src/shared/errors/report-limits.ts` (4 MiB), usado pelo
    navegador e pelo servidor.
  - O limite anterior de 1 MiB partia da premissa "sem captura". Uma página longa gera captura
    grande, então se o corpo passar do teto o relatório segue **sem** a captura, em vez de a rota
    recusar tudo com 413. É o único desvio, e está documentado no arquivo.
  - Testes: a captura vai com as opções do legado; captura que falha e corpo acima do teto
    seguem com `screenshot: null`.

### B2. Relator de erros em `src/shared/errors/`

- `telemetry.ts`, `error-reporter.ts` e o teste dele saíram de `src/modules/assistant/telemetry/`
  e foram para `src/shared/errors/`.
- `ErrorBoundary` já chamava `installErrorReporter()` no `componentDidMount` e `reportError` no
  `componentDidCatch`. Só o import mudou, e o mock do teste acompanhou.
- `ERROR_REPORT_SECRET` e `ERROR_REPORT_URL` estão documentados em `.env.example` e na tabela de
  variáveis do `README.md`: só no servidor, e **sem o segredo o envio fica desligado** (a rota
  responde 204 e descarta o relatório).

### B3. Auditoria no modo loja: "Acesso restrito"

- `AuditLogsPage` com `backend !== "cloud"` agora mostra exatamente o bloco "Acesso restrito" /
  "Esta página está disponível apenas para administradores do sistema.". É o que o legado mostra
  na loja, porque o `useIsSystemAdmin` dele devolve `false` fora da nuvem. Não há chamada à API.
- O texto "Indisponível nesta instalação" saiu da tela. Os dois blocos idênticos viraram um só
  `RestrictedAccess`.
- O teste agora cobre a loja mostrando "Acesso restrito" mesmo com `isSystemAdmin: true` no
  tenant.
- **Correções de bug mantidas e documentadas** (`fase-5-audit-manual-wizard-report.md`):
  - O estado de erro da auditoria mostra "Não foi possível carregar…" (o legado dizia
    "Nenhum registro").
  - A leitura do `IBConfig.INI` no Wizard casa a chave no início da linha.
- Cenário novo: `audit-logs-loja` (LAN), comparado com o legado.

### B4. Harness visual

- **`fake-api.ts`**:
  - `SYSTEM_ADMIN_EMAILS = {"admin-sistema@nuvem.dev"}` faz o `/me/context` devolver
    `is_system_admin: true`.
  - `/auth/me` devolve o e-mail do login.
  - O `FixtureRequest` ganhou `loginEmail` (lido do cookie `efa_session=fake:<email>`), para uma
    fixture variar a resposta **por cenário** sem guardar estado.
- **Licença por cenário**: `fixtures/billing.ts` responde
  - `licenca-vencida@nuvem.dev` → `expired`;
  - `licenca-vencendo@nuvem.dev` → `expiring_soon`;
  - qualquer outro login → `active`, como antes.

  Cenários novos: `licenca-vencida-nuvem` e `licenca-vencendo-nuvem`, com a tela inteira (faixa e
  ícone de alerta no cabeçalho).
- **Auditoria com dados**: `audit-logs-carregado` entra como admin do sistema e troca o período
  para "Todo período", porque as datas da fixture são fixas e o filtro padrão depende do relógio.
- **Máscaras removidas** de todo cenário de nuvem: `bootstrap-codes-*`, `audit-logs-sem-permissao`,
  `sync-nuvem-inbox` e `cabecalho-plano-nuvem`. O botão do Assistente IA e o menu do usuário são
  comparados de verdade. As duas cópias de `HIDE_NON_PARITY_CHROME` sumiram.
  - **Menu do usuário do legado.** O legado só mostra o ícone com sessão Supabase (`userEmail` de
    `cloudGetSession()`). É o que acontece em produção (`*.easysoftcloud.com.br`, ramo Supabase),
    mas não no harness, que roda o legado com `VITE_CLOUD_API=true`.
  - `seedLegacyProductionSession` (`scenario.ts`) põe no contexto **só do legado de nuvem** a
    sessão que a produção teria: a chave padrão do supabase-js, com validade em 2100, sem rede
    nenhuma. Em `/login` a chave é retirada, porque o `LoginPage` legado redireciona quem tem
    sessão.
  - Por isso o helper novo `openCloudPanel(page, base, path, email)` termina com `goto`: o
    cliente Supabase do legado lê o armazenamento só ao iniciar.
  - Nos ramos de modo API do legado (tenant, IA, billing, admin), a sessão não muda nada, porque
    todos testam `isCloudApiMode()` antes.
  - Máscara que **continua**: `nfce-issuer-carregado` (botões "Editar" do emitente). O motivo é
    documentado na Fase 3 e não tem relação com IA nem com o menu.
- **`page.clock` no `sync-mirror-carregado`**: `setFixedTime` antes do login convive bem com ele.
  Só `Date` fica parado; os timers seguem rodando. O cenário passou nos dois viewports, e o login,
  a hidratação e o `networkidle` não foram afetados.
- **`openCloudPanel`** substituiu as cópias de "login na nuvem → loja Centro → acessar" em
  bootstrap, sync, audit, billing e assistant.

### B5. Duplicatas, nomes e tamanho

- **`src/modules/billing/**` → `src/shared/license/`**:
  - Arquivos: `license-status`, `billing-repository`, `api-billing-repository`,
    `use-license-status` e `LicenseExpiredBanner`, com os testes.
  - Motivo: o `HeaderStoreInfo` (shared) consumia hook e domínio do módulo. Agora licença e plano
    moram ao lado do `LicensePlanBadge` e do `usePlanHistoryWindow`.
  - Único import de `shared` → `modules` que sobra: `AppLayout` → `AIChatButton`. É a composição
    da casca, como no legado.
- **`toQueryString`** ganhou `{ dropAll?: boolean }`. O `buildQuery` do Espelho, que é igual mas
  mantém `"all"`, virou `toQueryString(p, { dropAll: false })`. Teste novo em
  `query-string.test.ts`.
- **`isRecord`** entrou em `shared/infrastructure/convert.ts` e substituiu três cópias:
  - `isRow` em `sync-mirror-mapper`;
  - `asRow` em `sync-queue-mapper`;
  - `isPlainObject` em `shared/sync/payload-format`, que ficou como alias com o nome do legado.
- **Mantidos de propósito**, com justificativa nos relatórios das ondas:
  - `formatRelativeAgo` (sync) e `formatRelative` (espelho) produzem textos diferentes;
  - os `fmt*` do espelho.
- **Tamanho**: nenhum arquivo de produção passa de 300 linhas (o maior é
  `use-nfce-list-page.ts`, com 294). A exceção é a primitiva `ui/primitives/sidebar.tsx` (639), uma
  cópia shadcn da Fase 1, fora do escopo.

## Resultado dos comandos

| Comando | Resultado |
|---|---|
| `npm run typecheck` | 0 erros |
| `npm run lint` | 0 erros / 0 avisos |
| `npm test` | 171 arquivos, **1192 testes verdes** (também em série, com `--no-file-parallelism`) |
| `npm run build` (`BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999`) | OK: 29 rotas, entre elas `/api/error-report`, `/audit-logs`, `/sync` e `/sync/espelho` |
| `npm run test:visual` (Fases 1–5, desktop + mobile) | **96/96 verdes**, sem *flaky* |

## Diferença por cenário × viewport

Razão = pixels diferentes / pixels totais; limite `MAX_DIFF_RATIO` = 0,001 (0,1%), inalterado. 48 cenários × 2 viewports = 96 testes, todos verdes (execução final: 8,4 min).

| Cenário | desktop | mobile |
|---|---|---|
| agents-carregada | 0 | 0 |
| agents-form-api | 0 | 0 |
| agents-form-contingencia | 0 | 0 |
| agents-form-geral | 0 | 0 |
| agents-form-sync | 0 | 0 |
| agents-historico | 0 | 0 |
| assistente-conversa-de-hoje | 0 | 0 |
| assistente-historico | 0 | 0 |
| audit-logs-carregado | 0 | 0 |
| audit-logs-loja | 0 | 0 |
| audit-logs-sem-permissao | 0 | 0 |
| bootstrap-codes-carregado | 0 | 0 |
| bootstrap-codes-sem-permissao | 0 | 0 |
| cabecalho-plano-nuvem | 0 | 0 |
| dashboard-carregado | 0 | 0 |
| licenca-vencendo-nuvem | 0 | 0 |
| licenca-vencida-nuvem | 0 | 0 |
| login-loja | 0 | 0 |
| login-nuvem | 0 | 0 |
| manual-secoes-abertas | 0 | 0 |
| nfce-detail-carregado | 0 | 0 |
| nfce-issuer-carregado | 0 | 0,0000729 |
| nfce-lista | 0 | 0 |
| orders-lista | 0 | 0 |
| painel-404-loja | 0 | 0 |
| painel-seletor-nuvem | 0 | 0 |
| pixnopdv-carregada | 0 | 0 |
| primeiro-acesso | 0 | 0 |
| products-lista | 0 | 0 |
| receitas-carregada | 0 | 0 |
| reset-sem-link | 0 | 0 |
| sync-inbox-carregado | 0 | 0 |
| sync-log-carregado | 0 | 0 |
| sync-mirror-carregado | 0 | 0 |
| sync-nuvem-inbox | 0 | 0 |
| taxreform-configuracao-fiscal | 0 | 0 |
| totems-carregado | 0 | 0 |
| totems-form-aditum | 0 | 0 |
| totems-form-geral | 0 | 0 |
| totems-form-licenca | 0 | 0 |
| totems-form-nfce | 0 | 0 |
| totems-form-pix | 0,0000093 | 0,0000243 |
| totems-form-tef | 0 | 0 |
| totems-historico | 0 | 0 |
| totems-reativar-licenca | 0 | 0,0000334 |
| transactions-lista | 0 | 0 |
| units-lista | 0 | 0 |
| wizard-conexoes | 0 | 0 |

## Diferenças residuais e causa

1. **`nfce-issuer-carregado` mobile, 0,0000729.** Já existia e foi investigada na Fase 3: é
   anti-aliasing de subpixel depois de o `display:none` da máscara dos botões "Editar"
   recalcular o `flex`. Essa máscara é da Fase 3, documentada, e não tem relação com IA nem com
   o menu.
2. **`totems-form-pix` (0,0000093 desktop / 0,0000243 mobile) e `totems-reativar-licenca` mobile
   (0,0000334).** São cenários do I3. A diferença são poucos pixels de anti-aliasing no texto
   monoespaçado quebrado em várias linhas ("…/charge", "nfce_totem_config"), sem deslocamento
   de layout. Nas duas execuções completas o valor foi o mesmo, bem abaixo do limite.
3. **Resolvida nesta rodada: gráfico do dashboard nos cenários de licença.**
   - Sintoma: 0,019% no desktop. O último rótulo do eixo X e o do topo do eixo Y de "Transações
     (7 dias)" nasciam deslocados alguns pixels.
   - Causa: corrida do harness. Num carregamento frio em `/`, o recharts mede e guarda em cache o
     texto dos eixos enquanto as fontes `display: swap` ainda carregam. O recharts é o mesmo
     2.15.4 nos dois apps.
   - Correção: `openCloudPanel` recarrega em `/manual`, espera as fontes e volta ao `/` por
     navegação interna. O valor final é 0 nos dois viewports.
4. **Sessão de produção semeada só no legado de nuvem (B4).** Não é uma diferença de tela: põe o
   legado no estado de produção, onde o menu do usuário existe. Sem isso, o harness comparava o
   legado num modo (EasyFoodAPI sem sessão Supabase) que a produção não usa.
5. **Comportamentais, documentadas:**
   - O relatório de erros segue sem captura quando o corpo passaria de 4 MiB (B1).
   - Enviar relatório exige `ERROR_REPORT_SECRET`, que está ausente em qualquer ambiente até a
     implantação definir o valor.
   - Continuam valendo as decisões dos relatórios das ondas: Espelho mostra "Disponível apenas na
     loja" na nuvem; o Next corrige o bug do legado na data das falhas do outbox; payload em texto JSON é
     convertido; créditos da IA são recarregados uma vez por resposta.
6. **Cobertura visual ainda pendente:**
   - cenários `mode: "cloud"` de Totens, Agentes e PIXnoPDV (herdado da Fase 4, I3);
   - a aba Outbox do `/sync` na loja;
   - as abas Ciclos, Log, Alterações e Saúde do Espelho.

   Todas estão cobertas só por testes de componente.

## Adendo pós-revisão (fase-5-revisao-final.md)

### Menor 2 — o que a comparação visual da nuvem prova (e o que não prova)

Os cenários `mode: "cloud"` comparam o Next com o legado rodando `VITE_CLOUD_API=true`, isto é, o
**ramo da EasyFoodAPI** do legado — não o ramo de produção de hoje (`isCloudSupabaseMode()` por
hostname, Supabase direto do navegador). É coerente com a "armadilha da nuvem" do plano (o Next só
fala com a EasyFoodAPI), mas "diferença 0" significa **paridade visual com o ramo da API**, não
paridade de comportamento com a produção atual. Ficam fora da comparação, por exemplo:

- a classificação da licença feita no navegador (`classificarLicenca` sobre `company_licenses`), que
  no ramo da API vem pronta do servidor;
- a edge function `ai-chat` (Supabase) — o ramo da API usa `/v1/ai/chat`;
- o monitor de sincronização via RPC `cloud_sync_*` do Supabase — o ramo da API usa `/v1/sync/*`.

A sessão de produção semeada no legado (B4) só põe o **cabeçalho** no estado de produção (menu do
usuário); não muda de onde vêm os dados.

### Riscos sinalizados, mantidos por paridade (decisão do usuário: manter o legado)

- **I5 — auditoria mostra `nfce_service_api_key` e `tef_http_api_key` em claro**
  (`src/modules/audit/ui/AuditLogTimelineEntry.tsx`, e o `TotemAuditDialog` da Fase 4). Idêntico ao
  legado (`formatValue` sem máscara). A tela é só para admin do sistema, mas as chaves de TEF e de
  NFC-e ficam visíveis e entram em capturas de tela — inclusive na do relatório automático de erros.
  **Risco aberto**; mascarar (`••••1234` em `*_api_key|*_secret|*_token`, de preferência também na
  EasyFoodAPI) seria desvio consciente da paridade.
- **Menor 6 — a captura de tela do relatório de erros vai sem máscara ao EasyGuardian** (terceiro).
  Pode conter CPF, valores e as chaves do I5. Paridade com o legado. O servidor agora reaplica a
  redação de texto (`maskObject`) em todos os campos, **exceto a captura** (imagem). **Risco aberto.**
  Com a correção do I3 o risco fica mais concreto: antes, na prática, relatórios com captura se
  perdiam no navegador (keepalive > 64 KiB); agora eles chegam.
