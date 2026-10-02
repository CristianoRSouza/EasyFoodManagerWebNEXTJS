# Fase 5 — Agente D: assistente de IA, licença/plano no cabeçalho, relatório de erros

> **Superado em parte por `fase-5-integracao-report.md`** (markdown/captura de tela, relator em `src/shared/errors`, licença em `src/shared/license`, Auditoria na loja, máscaras visuais removidas). Em caso de conflito, vale o relatório de integração.

Branch `feat/fase-1-fundacao`. Nada commitado. Não usei `commit`/`merge`/`push`/`stash`/`reset`/`checkout`/`restore`. Nenhum `.env` lido; nenhum teste fala com API ou Supabase reais.

## Onde cada recurso aparece (conferido no legado)

`LEGACY/src/components/AppLayout.tsx`: `HeaderStoreInfo` (e portanto selo de plano e alerta de licença) e `LicenseExpiredBanner` só com `cloudActive`; `AIChatButton` só com `cloudActive && selectedStoreId`. O Next repete: **só nuvem**. A loja (LAN) não mostra nada disso nem faz consulta de billing/IA (há teste). O relator de erros roda nos dois backends (no legado é instalado no `App`).

Armadilha da nuvem: a produção do legado usa o ramo Supabase (edge `ai-chat`/EasyAI direto, `supabaseBilling`, proxy `error-report-proxy`). No Next a nuvem fala pelas rotas de `cloud-api-ai.ts`/`cloud-api-billing.ts`, via repasse `/api/v1`, sem Supabase no navegador.

## Arquivos criados/alterados

**`src/modules/assistant/`**
- `domain/chat.ts` — tipos, `todayKey`, `splitSessions` (hoje = mesmo usuário + dia + app `easyfood-manager`), `deltaOf` (linha SSE), `chatErrorMessage`/`ChatError` com os textos do legado (402/429/401).
- `domain/credits.ts` — cota diária de 10 no fuso de Brasília, suporte fora da cota, saldo = soma do extrato.
- `domain/history.ts` — sugestões por rota, `formatDateLabel`, `appLabel`, busca (`"frase"`, `pedido*`, sem acento), agrupamento por dia.
- `application/assistant-repository.ts`, `infrastructure/api-assistant-repository.ts`, `infrastructure/sse-stream.ts`.
- `ui/use-ai-chat.ts`, `ui/use-chat-sessions.ts`, `ui/use-stream-buffer.ts`, `ui/chat-storage.ts`. Isso substitui o `useAIChat.ts` de 606 linhas.
- `ui/use-ai-credits.ts`, `ui/use-assistant-repository.ts`.
- `ui/AIChatButton.tsx`, `ui/AIChatPanel.tsx`, `ui/ChatHeader.tsx`, `ui/ChatConversation.tsx`, `ui/ChatHistoryList.tsx`, `ui/MessageBubble.tsx`. Isso substitui o `AIChatPanel.tsx` de 656 linhas. JSX e classes foram copiados do legado.
- `ui/markdown/{parse-blocks.ts, parse-inline.ts, Markdown.tsx}` (ver Diferenças).
- `telemetry/{telemetry.ts, error-reporter.ts}` — o relator de erros do lado do navegador (ver "Candidatos a compartilhado").

**`src/modules/billing/`**
- `domain/license-status.ts` — valida a resposta já classificada e monta os textos da faixa e do alerta do cabeçalho.
- `application/billing-repository.ts`, `infrastructure/api-billing-repository.ts`.
- `ui/use-license-status.ts`, `ui/LicenseExpiredBanner.tsx`.

**Servidor**
- `src/server/error-report/error-report-config.ts`, `error-report-payload.ts`, `handle-error-report.ts`.
- `src/app/api/error-report/route.ts`.

**Layout**
- `src/shared/layout/AppLayout.tsx`: `{cloud && <LicenseExpiredBanner />}` logo abaixo do `<header>`, e `{cloud && selection && <AIChatButton />}`. As alterações que já estavam na árvore foram preservadas.
- `src/shared/layout/HeaderStoreInfo.tsx`: `LicensePlanBadge` (de `usePlanHistoryWindow`) e ícone de alerta com tooltip, com o mesmo JSX do legado.
- `src/shared/layout/ErrorBoundary.tsx`: `componentDidMount` → `installErrorReporter()`; `componentDidCatch` → `reportError(error, { component_stack })`. O texto "Um relatório foi enviado automaticamente" passa a ser verdadeiro quando o envio está configurado.

**Testes visuais**
- `tests/visual/fixtures/assistant.ts`, `tests/visual/fixtures/billing.ts`.
- `tests/visual/scenarios/assistant.ts` — `assistente-conversa-de-hoje`, `assistente-historico`; recorte = o painel.
- `tests/visual/scenarios/billing.ts` — `cabecalho-plano-nuvem`; recorte = `<header>`, com `UserMenu` mascarado.
- `scenarios/bootstrap.ts` não foi tocado, conforme pedido.

## Endpoints (todos pelo repasse `/api/v1`, só nuvem, com `x-company-id`/`x-store-id`)

| Uso | Rota |
|---|---|
| quem sou eu | `GET /v1/auth/me` |
| conversas | `GET /v1/ai/sessions` |
| gravar hoje | `PUT /v1/ai/sessions/today` com `{messages, started_at, ended_at}`. Lista vazia apaga, e só é enviada se a linha do dia existe |
| apagar dia | `DELETE /v1/ai/sessions/:id` |
| limpar histórico | `DELETE /v1/ai/sessions` |
| chat | `POST /v1/ai/chat` com `{messages}`, `Accept: text/event-stream`. SSE no formato OpenAI, lido em pedaços; o repasse do Next já devolve o `body` em stream |
| cota | `GET /v1/billing/usage?limit=200` (repique de 30 s) |
| saldo | `GET /v1/billing/credits?limit=200` (repique de 30 s) |
| licença | `GET /v1/billing/license` |
| plano | `GET /v1/billing/plan-window` (hook compartilhado já existente) |
| SSO do CTA "Revisar pagamento" | `useExternalAccess().openBilling` (`POST /v1/auth/derived-session`) |

## Relatório de erros

- **Destino do legado.** O navegador chamava a edge `error-report-proxy`, que exigia JWT de usuário e encaminhava ao **EasyGuardian** (`https://ohjyqafgcxvrvbtiuvpq.supabase.co/functions/v1/error-report`) com `x-report-secret: ERROR_REPORT_SECRET`.
- **No Next.** O navegador faz `POST /api/error-report`, e o servidor encaminha ao mesmo EasyGuardian com o mesmo cabeçalho. O segredo fica só em `process.env.ERROR_REPORT_SECRET`; `ERROR_REPORT_URL` é opcional e troca o destino.
- **Sem `ERROR_REPORT_SECRET`, o envio fica DESLIGADO.** O servidor não tem esse segredo hoje, e não inventei valor nem padrão: a rota responde 204 e descarta o relatório. **Para ligar, a integração/implantação precisa definir `ERROR_REPORT_SECRET` (o mesmo da edge function) no ambiente do servidor.**
- **Mesmas regras do legado:**
  - Buffers de 100 linhas de console, 50 requisições e 50 passos.
  - Argumentos cortados em 2048 caracteres.
  - Redação de campos `authorization|apikey|token|secret|password|cookie`, de `Bearer …` e de JWT.
  - Anti-inundação: 5 relatórios por sessão, deduplicação em 60 s.
  - Hosts `localhost`/`127.0.0.1`/lovable são ignorados.
  - `keepalive`; o relator nunca lança.
- **Regras do servidor:**
  - Exige sessão (401 sem ela), como o proxy exigia JWT.
  - Usuário (`user_id`/`user_email`) vem da **sessão**, não do corpo.
  - `source_app`/`source_project_id` são fixos (constantes do legado).
  - Valida a forma com zod e aplica os mesmos tetos dos buffers.
  - Teto de 1 MiB (413).
  - Destino recusou ou caiu: 502. A resposta do destino nunca volta ao navegador.
- **Alternativa não usada:** o cliente de nuvem do legado tem `/v1/telemetry/error-report` na EasyFoodAPI. Não há código dessa API aqui para confirmar a rota, e ela não existe na API da loja; por isso fui direto ao destino do proxy de produção.

## Diferenças conhecidas em relação ao legado

1. **Markdown.** `react-markdown`/`remark-gfm` não estão no `package.json` do Next, e não pude editá-lo. Escrevi um renderizador GFM mínimo, sem HTML cru, que gera a mesma estrutura DOM do react-markdown para parágrafos, negrito/itálico/riscado, código, blocos cercados, listas compactas/soltas/aninhadas, citações, títulos, `hr`, tabelas e links. Os links usam a mesma sanitização de protocolo.
   - HTML cru na resposta aparece como texto; o react-markdown o descarta.
   - `---` logo abaixo de um parágrafo vira `hr`, e não título setext.
   - **Candidato:** adicionar `react-markdown` + `remark-gfm` e trocar `ui/markdown/Markdown.tsx`.
2. **Sem captura de tela** no relatório (`screenshot: null`): `html2canvas` não está nas dependências, e a captura expunha dados que o resto do relatório mascara.
3. **Relatório na loja.** No legado em LAN, o relatório só saía se houvesse sessão Supabase, o que na prática quase nunca acontece. No Next, sai em qualquer backend quando o segredo está configurado.
4. **Bug do legado corrigido.** O efeito "recarrega créditos 600 ms após a resposta" reagendava a cada render, porque `refetchAll` não era estável. Aqui dispara uma vez por resposta.
5. **Omitidos.** `clearMessages`, `regenerateLast` e `refreshHistory` do hook não tinham chamador em lugar nenhum. O `toast "Selecione uma empresa primeiro"` também saiu: o tenant é obrigatório e o botão só existe com loja.
6. **Licença.** O legado de produção classifica no navegador (`classificarLicenca` sobre `company_licenses`). O Next usa a classificação pronta de `GET /billing/license`, como o próprio legado no modo EasyFoodAPI. Resposta desconhecida vira `unknown`, que não mostra aviso.

## Candidatos a compartilhado

- `src/modules/assistant/telemetry/*` → `src/shared/errors/`. Ficou no meu módulo só pela regra de escopo, porque o relator não é do assistente.
- `useLicenseStatus` (`modules/billing/ui`) é usado pelo `HeaderStoreInfo` de `shared/layout`. Pode ir para `src/shared/license/`.
- Harness visual: `FixtureRequest` não expõe cabeçalhos nem cookie, então uma fixture não consegue variar por cenário. Por isso a licença da fixture é `active` para todos. A faixa vencida e o alerta do cabeçalho ficam cobertos só por testes de componente, e não por cenário visual. Expor `x-store-id` ou o cookie no `FixtureRequest` permitiria um cenário "licença vencida".
- `fixtures/billing.ts` coloca o selo "Standard 1" no cabeçalho de **todos** os cenários de nuvem com loja, nos dois apps (paridade mantida). Isso afeta os cenários de nuvem dos outros agentes, que passam a comparar o selo também.

## Testes

- Meus arquivos: **91 testes, todos verdes.** Cobrem:
  - domínio do chat, créditos e histórico;
  - SSE com linha partida entre pedaços;
  - repositórios com `fetch` simulado;
  - markdown;
  - painel, nos estados vazio, erro de carga, com dados, streaming + gravação, 402, busca no histórico e exclusão;
  - botão;
  - faixa de licença: expirada, expirando, ativa/erro/carregando, LAN/sem loja, CTA com SSO;
  - `HeaderStoreInfo`: selo, alerta vermelho/âmbar, sem plano;
  - `AppLayout`: nuvem com/sem loja, LAN sem consulta;
  - `ErrorBoundary`;
  - relator: redação, formato, anti-inundação, nunca lança, instalação e interceptação;
  - servidor: configuração, encaminhamento com segredo, 401/204/400/413/502, usuário vindo da sessão.
- `npx vitest run src/modules/assistant src/modules/billing src/server src/shared/layout src/app`: 28 arquivos, 179 testes, verde.
- Suíte inteira: todos os testes passaram. Houve 1 erro de "worker exited unexpectedly" no pool (queda nativa do processo). É ambiental, com os agentes rodando em paralelo, e não uma falha de teste.
- `npx tsc --noEmit`: 0 erros.
- `npx eslint` nos meus arquivos, em `src/shared/layout` inteiro e nas minhas fixtures/cenários: 0/0.
- Conforme o brief, não rodei `npm run build` nem `test:visual`. Os cenários novos ainda não foram executados.
