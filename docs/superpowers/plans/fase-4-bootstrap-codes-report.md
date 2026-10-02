# Fase 4 — Agente C: Códigos de primeiro acesso (`/bootstrap-codes`)

Branch `feat/fase-1-fundacao`. Nada commitado — nenhum `git commit/merge/push/stash/reset/
checkout/restore` foi usado. Nenhum `.env` foi lido. Nenhum teste bateu API ou Supabase reais.

## Arquivos criados

```
src/modules/bootstrap/domain/bootstrap-code.ts                       # email regex/normalize + tipos
src/modules/bootstrap/domain/bootstrap-code.test.ts
src/modules/bootstrap/application/bootstrap-code-repository.ts       # interface
src/modules/bootstrap/infrastructure/bootstrap-code-mapper.ts        # linha da API -> domínio
src/modules/bootstrap/infrastructure/bootstrap-code-mapper.test.ts
src/modules/bootstrap/infrastructure/api-bootstrap-code-repository.ts
src/modules/bootstrap/infrastructure/api-bootstrap-code-repository.test.ts
src/modules/bootstrap/ui/use-bootstrap-code-repository.ts            # useRequiredTenant() + memo
src/modules/bootstrap/ui/use-bootstrap-codes-form.ts                 # estado/ações da tela
src/modules/bootstrap/ui/use-bootstrap-codes-form.test.tsx
src/modules/bootstrap/ui/BootstrapCodesPage.tsx
src/modules/bootstrap/ui/BootstrapCodesPage.test.tsx
src/app/(panel)/bootstrap-codes/page.tsx
tests/visual/fixtures/bootstrap.ts
tests/visual/scenarios/bootstrap.ts
docs/superpowers/plans/fase-4-bootstrap-codes-report.md              # este relatório
```

Nenhum arquivo passa de ~200 linhas (o maior é `BootstrapCodesPage.test.tsx`, 193).

## Endpoint usado

`POST /stores/{storeId}/bootstrap-code` (via `apiRequest`, base `/api/v1` → repasse genérico
`src/app/api/v1/[...path]/route.ts`, não tocado). Body: `{ email, ttl_hours? }`. Headers de tenant
(`x-company-id`/`x-store-id`) via `tenant` do `apiRequest`.

**Como cheguei nele:** o legado (`LEGACY/src/lib/issue-bootstrap-code.ts`) tem dois caminhos:
- `isCloudApiMode()` verdadeiro → `cloudApi.post("/v1/stores/${storeId}/bootstrap-code", { email, ttl_hours? })`.
- Senão → `supabase.functions.invoke("issue-bootstrap-code", { body: { email, store_id, ttl_hours? } })`.

O Next não pode chamar Supabase direto, então portei o primeiro caminho. Busquei o handler desse
endpoint em `C:\Users\crist\Desktop\easyfoodmanagerAPI\src\routes\v1\*.ts` e **não o encontrei** —
o repo da API só tem o lado de VERIFICAÇÃO (`src/auth/bootstrap-code.ts`, usado por
`bootstrapLocalPassword.ts` no login local), não o de EMISSÃO. O contrato exato
(`POST /v1/stores/{storeId}/bootstrap-code`, corpo, e o formato da resposta
`{ok, code, email, store_id, expires_at, error}`) vem inteiramente do cliente legado, que é a
única fonte de verdade disponível — a rota provavelmente ainda não foi implementada no lado do
servidor, ou vive em outro branch. Implementei o repositório contra esse contrato, documentando a
lacuna aqui como pedido no brief.

O formato de resposta bate com o padrão que o resto da `easyfoodmanagerAPI` já usa para ações
(`res.json({ ok: true, ... })`, ex. `totemsV1Router`), o que reforça que é o contrato real
esperado, não uma suposição arbitrária.

## Decisões

1. **Gate "só nuvem"**: o legado usa `isCloudSupabaseMode()`; troquei por `useRuntime().backend ===
   "cloud"` — o sinal equivalente já estabelecido no Next (o mesmo que `buildNavGroups` usa para só
   listar o item no menu em modo nuvem, `src/shared/layout/nav-items.ts`). O card e o texto do
   estado "não é nuvem" (`Esta função está disponível apenas no modo Nuvem (painel Supabase).`)
   foram copiados verbatim — é o único estado equivalente que o legado tem para modo não-nuvem, e a
   regra de paridade da Fase 4 manda copiar textos idênticos quando existe um estado equivalente.
2. **`issueBootstrapCode` nunca lança** (mesmo no legado): `ApiBootstrapCodeRepository.issue()`
   captura `ApiError`/qualquer exceção e sempre resolve com `{ ok: false, error }` — nunca rejeita.
   Isso torna o `catch` em `use-bootstrap-codes-form.ts#generate()` defensivo/inalcançável pelo
   repositório real de hoje, exatamente como no legado (o `try/catch` de
   `BootstrapCodePage.generate()` também é defensivo pelos mesmos motivos). Mantive por paridade.
3. **Checagem "selecione uma loja primeiro" do legado, não portada**: no legado, `generate()` checa
   `if (!selectedStoreId)` antes de chamar a API. No Next, `useBootstrapCodeRepository()` usa
   `useRequiredTenant()`, que **lança** (não retorna `null`) se não houver seleção — e o `StoreGate`
   do layout já bloqueia qualquer tela de módulo até haver loja selecionada (mesma garantia que
   TODOS os outros módulos já assumem, nenhum replica esse tipo de checagem). Ou seja, no Next essa
   branch do legado é logicamente inalcançável antes mesmo de `generate()` rodar — differente do
   legado, cuja árvore de rotas não tem uma garantia idêntica. Documentando como diferença
   arquitetural conhecida, não funcional (o botão continua com `disabled={generating ||
   !selectedStoreId}` por paridade visual, mas `selectedStoreId` vem de `useTenant()` e estará
   sempre populado na prática).
4. **`formatDateTime` compartilhado em vez de `new Date().toLocaleString("pt-BR")` inline**: o
   legado formata a validade do código inline; usei `src/shared/format/date-time.ts` (mesma saída
   exata, `toLocaleString("pt-BR")`) para não duplicar, seguindo a convenção da Fase 2/3.
5. **Mapper dedicado** (`bootstrap-code-mapper.ts`) traduzindo `store_id`/`expires_at` (snake_case
   da API) para `storeId`/`expiresAt` (domínio) — mesmo padrão de `unit-mapper.ts`. O legado usa os
   nomes crus da API como o próprio tipo (`IssueBootstrapCodeResult.store_id`), mas isso quebraria a
   convenção de módulo já estabelecida nas Fases 2/3 (camelCase no domínio).

## Candidato a compartilhado (bloqueio real para o cenário visual "sucesso")

`tests/visual/fake-api.ts` (arquivo do NÚCLEO, fora da minha lista de arquivos permitidos) responde
`GET /v1/me/context` em modo nuvem com `is_system_admin: false, is_company_admin: false` **fixo**,
para qualquer login — não há branch por email nem qualquer outro sinal que um cenário de módulo
possa influenciar (a interceptação acontece ANTES do dispatch para `fixtures/*.ts`, então nem
registrar uma rota `/v1/me/context` na minha própria fixture teria efeito). Resultado: nenhum
cenário visual em modo nuvem, de nenhum módulo, consegue hoje testar uma tela que dependa de
`is_system_admin`/`is_company_admin` verdadeiro — o que inclui esta tela (o caminho "formulário +
código gerado") e, mais adiante na Fase 5, "Logs de Auditoria" (`is_system_admin`-only).

**Sugestão para quem tocar `fake-api.ts` depois** (Onda 2/controller, ou o próximo agente que
precisar disso): espelhar o padrão que o próprio arquivo já usa no `/auth/login` (branch por email,
`email === "novo@loja.dev"` → `local_password_not_set`) — por exemplo, `email ===
"admin@nuvem.dev"` → `is_company_admin: true` (ou um segundo email dedicado, tipo
`admin-empresa@nuvem.dev`, para não mudar o comportamento do cenário `painel-seletor-nuvem` já
verde da Fase 1).

**O que ficou pronto e testado apesar do bloqueio:**
- `tests/visual/fixtures/bootstrap.ts` registra `POST /v1/stores/s1/bootstrap-code` com uma
  resposta determinística completa (`ok`, `code`, `email`, `store_id`, `expires_at`) — pronta para
  o dia em que o mock puder simular um admin.
- O caminho de sucesso está 100% coberto por teste, só não pelo Playwright: repositório
  (`api-bootstrap-code-repository.test.ts`, mockando `apiRequest`) e hook de tela
  (`use-bootstrap-codes-form.test.tsx`, mockando o repositório) cobrem sucesso, `ok:false` com e
  sem mensagem do servidor, `ApiError` lançado, erro de rede genérico, normalização de email e
  cópia do código.

## Cenário visual

`tests/visual/scenarios/bootstrap.ts` tem **1 cenário** (`bootstrap-codes-sem-permissao`, modo
nuvem, desktop+mobile): login como `admin@nuvem.dev`, seleciona a loja "Centro" no modal, navega
direto para `/bootstrap-codes` (não pelo menu — o item não aparece para quem não é admin) e
confere o card "Apenas administradores da empresa/loja podem gerar códigos de primeiro acesso.".
É o único estado alcançável hoje pelo motivo acima, mas é um estado real e determinístico da tela
(a mesma comparação pixel a pixel que os outros cenários fazem, só que para o card de acesso
negado em vez do formulário). Consistente com o legado: o texto é copiado verbatim, e o legado
usa a mesma rota `/v1/me/context` para os mesmos flags quando em modo API — então os dois apps
devem renderizar identicamente essa tela sob o mesmo mock.

**Não rodei `npm run test:visual`** (nem `npm run build`) — instrução explícita do brief, os outros
2 agentes ainda editam a mesma árvore; o controller roda tudo na Onda 2. A lógica do `reach()`
segue o mesmo padrão já verde de `scenarios/fase-1.ts` (`login`, esperar o texto do modal, `goto`
direto para a rota — igual a `painel-404-loja`), então o risco de erro de sintaxe/seletor é baixo,
mas não pude confirmar visualmente.

## Diferenças conhecidas em relação ao legado

Nenhuma de comportamento ou texto visível — só a origem do sinal "é nuvem?" (item 1 acima, forçado
pela arquitetura do Next) e a checagem "selecione uma loja" que virou inalcançável por construção
(item 3 acima, mesma garantia que todo outro módulo já assume).

## Resultado dos comandos

| Comando | Resultado |
|---|---|
| `npx vitest run src/modules/bootstrap` | **5 arquivos, 37 testes, todos verdes** |
| `npx tsc --noEmit` (projeto inteiro) | 0 erros |
| `npx eslint src/modules/bootstrap "src/app/(panel)/bootstrap-codes"` | 0 erros / 0 avisos |
| `npx eslint tests/visual/fixtures/bootstrap.ts tests/visual/scenarios/bootstrap.ts` | 0 erros / 0 avisos |

Não rodei `npm run build` nem `npm run test:visual`, conforme instrução do brief.
