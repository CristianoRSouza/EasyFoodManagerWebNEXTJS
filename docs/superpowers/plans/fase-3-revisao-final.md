# Fase 3 — Revisão final (fiscal)

Revisão somente leitura do trabalho da Fase 3 (não commitado) em `feat/fase-1-fundacao`:
`src/modules/{nfce,issuer,taxreform}/**`, `src/shared/ui/issuer-sections/**`,
`src/shared/ui/CloudFieldWarning.tsx`, `textarea`, as 4 rotas, as fixtures/cenários visuais e o
código compartilhado tocado na integração (`usePlanPeriodGuard`, `tenant-context`, `AppLayout`,
`error-body`). Comparado com o plano (`2026-09-28-fase-3-fiscal.md`), os relatórios `fase-3-*`, o
legado (`easyfoodmanagerWEB`) e o contrato real (`easyfoodmanagerAPI/src/routes/v1/{nfce,nfce-mutation-http,nfce-issuer-config,cbs}.ts`).
Não rodei testes nem servidores; a evidência de verde é a do `fase-3-integracao-report.md`.

## Resumo por foco

1. **Invariante 1 (correção manual): cumprida.** `validateNfceManualCorrection` roda antes de
   qualquer chamada de rede nos DOIS botões (`use-nfce-correction-form.ts:156` e `:174`). Ela checa o
   estado `manual_review`, a invariante 1b (pagamentos − troco ≥ total) e os campos fiscais. A aba
   não mostra os botões fora de `manual_review` (`NfceCorrectionTab.tsx:33`). O corpo enviado não
   tem quantidade nem preço, e o `zod` da API descarta chaves desconhecidas, então o total não tem
   como mudar por aqui. A 1a no cliente é uma conferência que nunca falha (ver Menor 1).
2. **Invariante 2 (segredos): cumprida para os 4 segredos nomeados.** Eles abrem sempre em branco,
   e deixados em branco ficam fora do PATCH (não apagam o que já está gravado). Nenhum é mostrado,
   e nada vai para log. A exceção é `tef_admin_http_api_key` (Importante 1).
3. **Contrato:** todas as rotas, parâmetros, apelidos de coluna e o corpo do POST/PATCH batem com a
   API, com uma exceção: `nfce_logs.details` (Crítico 1).
4. **Tenant/camadas:** todo repositório recebe `Tenant` (`useRequiredTenant`), e toda chave de
   query leva `companyId`/`storeId`. Nenhum módulo cliente importa `src/server` (só `app/(panel)/layout.tsx`,
   `app/login/page.tsx` e `app/api/**`, todos no servidor). Ok.
5. **Paridade:** fiel ao legado. Há uma divergência de comportamento, depois de reprocessar pela
   lista (Importante 2). Deixar editar o emitente é decisão do controller, intencional.
6. **Código limpo:** nenhum arquivo passa de 300 linhas (o maior tem 291). Há algumas duplicações
   pequenas (Menores).

---

## Crítico

### C1. `details` dos logs da NFC-e é sempre descartado — a coluna é `jsonb`, o mapper só aceita texto
- `src/modules/nfce/infrastructure/nfce-history-mapper.ts:12` → `details: asText(row.details)`
- `src/modules/nfce/domain/nfce-history.ts:8` → `details: string | null`
- `src/modules/nfce/ui/detail/NfceLogsSection.tsx:54-58`

`nfce_logs.details` é `jsonb` (`easyfoodmanagerWEB/docs/db-schema/nfce_logs.sql:11`). O `pg`
entrega a coluna como **objeto**, e `GET /v1/nfce/notes/:id/logs` (`nfce.ts:583`) repassa o objeto
como está. `asText` devolve `null` para qualquer valor que não seja string ou número. Resultado: o
bloco "Detalhes" do log **nunca aparece**, e essa é justamente a informação que o operador usa
para entender por que a nota caiu em `manual_review`. O legado trata os dois casos
(`NfceDetailPage.tsx:1168`: `typeof log.details === "string" ? log.details : JSON.stringify(log.details, null, 2)`).
O teste do mapper só cobre `details: null` (`nfce-history-mapper.test.ts:12`), por isso passou.

**Correção:** no mapper, trocar por
`details: typeof row.details === "string" ? asText(row.details) : row.details != null ? JSON.stringify(row.details, null, 2) : null`.
Acrescentar ao `nfce-history-mapper.test.ts` um caso com objeto (`{ cStat: "225", xMotivo: "..." }`)
e outro com string.

---

## Importante

### I1. `tef_admin_http_api_key` é pré-preenchida e reenviada em claro a cada PATCH
- `src/modules/issuer/domain/issuer-edit-draft.ts:89` (`tef_admin_http_api_key: config.tefAdminHttpApiKey ?? ""`) e `:37` (fora de `ISSUER_SECRET_FIELDS`)
- `src/modules/issuer/infrastructure/issuer-config-mapper.ts` (`tefAdminHttpApiKey: asText(row.tef_admin_http_api_key)`)
- API: `nfce-issuer-config.ts:90-124`. `mapIssuerRowToClient` **não** remove essa coluna.

É uma API key (o `X-Api-Key` do serviço TEF), da mesma família dos "similares" da invariante 2.
Hoje ela chega em claro ao navegador, fica na memória do rascunho, vai pré-preenchida no input
(`type="password"`, mas o valor está no DOM) e é **reenviada em claro** em todo "Salvar", mesmo
sem ter sido editada. A tela de leitura mascara ("•••• (definida)"). O legado faz o mesmo, mas
isso bate de frente com o critério desta revisão: "nunca pré-preenchido nem enviado a menos que
digitado de novo".

**Correção no Next:**
1. Incluir `tef_admin_http_api_key` em `ISSUER_SECRET_FIELDS` e abrir o campo vazio no `draftFromConfig`.
2. No `IssuerTefCard`, quando `tefAdminHttpApiKey` estiver definida, mostrar a dica "Deixe em
   branco para manter", igual à do EasyERP.

**Correção na API** (pendência para o repositório da API): remover a coluna em
`mapIssuerRowToClient` e expor `tef_admin_http_api_key_set`. Enquanto a API não mudar, o valor
continua chegando ao navegador, mas o Next deixa de reenviá-lo.

**Decisão sua:** avalie o mesmo para o `nfce_security_code` (CSC), que hoje é mostrado em claro na
leitura (`IssuerMainGrid.tsx:143`), igual ao legado.

### I2. Reprocessar pela lista não atualiza os totais nem o aviso de atenção
- `src/modules/nfce/ui/list/use-nfce-list-page.ts:194-195`

O legado chama `loadData(1, { append: false })` (`NfcePage.tsx:373`), que refaz **lista + totais +
attention-counts**. O Next só faz `listQuery.refetch()`. Depois de reprocessar uma nota em
`manual_review`/`unusable`, os cards do topo e o banner "X NFC-e pendentes de correção" continuam
com os números antigos até o próximo "Atualizar".

**Correção:** trocar a linha por
`await Promise.all([listQuery.refetch(), totalsQuery.refetch(), attentionQuery.refetch()])`
(sem o toast de "Dados atualizados"). Acrescentar um teste em `NfceListPage.test.tsx` que confira
que `attention-counts` é pedido de novo depois de reprocessar.

---

## Menor

1. **A invariante 1a no cliente é uma conferência que nunca falha.** Em `use-nfce-correction-form.ts:138-139`,
   `originalItemsTotal` e `updatedItemsTotal` são a **mesma variável**, então a checagem de
   `nfce-correction.ts:182` nunca dispara. O teste de componente "total alterado"
   (`NfceCorrectionTab.test.tsx:191`) só passa porque faz mock do validador. Hoje a proteção real
   é estrutural: o tipo do payload não tem quantidade nem preço, e a API refaz a conta a partir do
   banco. O comentário do arquivo diz isso, mas dá a entender que há uma checagem de verdade.
   **Correção:** calcular `updatedItemsTotal` a partir de uma projeção dos itens que realmente vão
   no payload, ou remover a 1a do cliente e documentar que ela é garantida pelo tipo mais a API.
   Uma opção complementar é fazer `saveManualCorrection`/`saveAndReprocessManualCorrection` do
   repositório (ou um caso de uso em `application/`) chamarem o validador. Hoje só o hook valida,
   e um segundo chamador futuro pularia a validação.
2. **Lógica de reprocessamento duplicada.** `canReprocess` e `RECONCILE_RETRIABLE` aparecem iguais
   em `ui/list/NfceDesktopTable.tsx:12-20` e `ui/list/NfceMobileList.tsx:10-18`. **Correção:** mover
   para `domain/nfce-note.ts` (`canReprocessNfce(note)`), com teste.
3. **`toEmbeddedNote` repete `toNfceNote` inteiro** (`nfce-detail-mapper.ts:24-52`); só mudam 2
   apelidos. **Correção:** `({ ...toNfceNote(row), totalValue: asNumber(row.total_nota, 0), discountValue: asNumber(row.total_desconto, 0) })`.
4. **Logs de debug em produção:** `src/shared/ui/issuer-sections/LazyFiscalCard.tsx:80,84,86,88`
   (`console.log` de fila, vindos do legado). Manter só o `console.error` da linha 91.
5. **Apresentação dentro do domínio.** `domain/nfce-formatters.ts` tem classes Tailwind
   (`statusColor`, `paymentMethodColor`), e `normalizeNfceStatus` repete o apelido
   `inutilizada → inutilized` de `toNfceStatus` (`nfce-note-mapper.ts:19-23`). **Correção:** mover as
   cores para `ui/` e reaproveitar um único mapa de apelidos.
6. **Rótulos duplicados entre `nfce-formatters.ts` e `issuer-sections/helpers.ts`:** `formatCnpj`,
   `crtLabel`/`taxRegimeLabel`, `ambienteLabel`/`envLabel`. Os textos divergem de propósito, porque
   copiam dois legados diferentes ("Excesso de sublimite" × "Excesso Receita"). Aceitável pela
   paridade visual, mas vale um comentário em cada um apontando o outro, para ninguém "unificar"
   sem querer.
7. **Segredo digitado aparece em claro enquanto se digita:** "Senha PFX" e "API Key" EasyERP usam
   `EditableInfoRow`, que só aceita `text|number`, e os campos Aditum são `Textarea`. É igual ao
   legado. **Sugestão:** aceitar `type="password"` no `EditableInfoRow` e usar nos dois campos.
8. **Semântica "em branco = manter" sem aviso na UI**, nos campos Aditum e na Senha PFX
   (`IssuerTefCard.tsx:55-84`, `IssuerCertificateCard.tsx:89-95`). O EasyERP tem a dica; esses não.
   E como agora não há como **apagar** um segredo pelo painel (no legado, apagar o token Aditum
   funcionava), fica para você decidir se precisa de um "Remover" explícito.
9. **Leitura dos tokens Aditum.** O ramo "•••• (definido)" (`IssuerTefCard.tsx:91,117`) não é
   alcançável, porque a API nunca manda o valor em claro. Um token configurado aparece como "—"
   mais um aviso âmbar de "configuração faltando", o que confunde o operador. É igual ao legado,
   mas o próprio comentário da API (`nfce-issuer-config.ts:118`) diz que a UI deveria mostrar
   "•••• (cifrado)" a partir de `*_encrypted_set`. Da mesma forma, `aditumTefPartnerToken`,
   `aditumTefActivationCode` e `apikeyEasyerp` no domínio (`issuer-config-mapper.ts:56,58,67`) só
   servem para guardar em memória um segredo que a API vazasse por engano. **Sugestão:** o mapper
   descarta esses campos, e a tela passa a decidir pelas flags `*Set`. Decisão de paridade: sua.
10. **Nome de teste enganoso:** `IssuerPage.edit.test.tsx:146` diz "envia PATCH só com os campos
    alterados", mas `buildIssuerUpdatePayload` envia **todos** os campos do rascunho, como o
    legado. Renomear.
11. **Foco no campo inválido:** o legado rola a tela e foca exatamente o campo com erro
    (`focusFirstInvalidField`, `NfceDetailPage.tsx:328-333`). O Next só pinta de vermelho a linha
    inteira do item ou pagamento. Uma diferença pequena de UX.
12. **Tipos da reforma tributária:** `cbs-reference-data.ts:46-55` tipa as colunas `NUMERIC` como
    `number | null`, mas o comentário do topo do arquivo avisa que elas chegam como string. A
    renderização usa `Number(...)` e funciona. Corrigir o tipo para `string | null`.
13. **Id de nota que não é UUID:** a API responde 400 (`invalid_note_id`). `getOrNull`
    (`api-nfce-repository.ts:44-51`) só converte 404, então a tela mostra o toast de erro **e**
    "Nota não encontrada". Tratar 400 `invalid_note_id` como `null`.

---

## O que foi conferido e está correto

- **Rotas/parâmetros da NFC-e:** `/nfce/notes` (`page`, `limit`, `status` omitido quando é `all`,
  `reconcileStatus`, `from`, `to`, `search`), `/nfce/totals` (`total`/`porStatus`/`valorAutorizado`),
  `/nfce/attention-counts`, `/nfce/notes-xml` (`afterId` + lote), o detalhe e as 4 sub-rotas, e os
  POST `manual-correction`/`reprocess`. O corpo da correção bate campo a campo com
  `manualCorrectionBodySchema`, e os apelidos do detalhe (`total_nota`, `emitente_crt`, `destinatario_uf`…)
  estão todos certos.
- **Emitente:** as chaves do rascunho são todas aceitas por `PATCHABLE_COLUMNS` ou
  `PLAIN_SECRET_KEYS`, sem risco de `unknown_field`. `certificate_valid_until`/`certificate_exported_at`
  não vão no corpo, então não são apagados. O PATCH passa pelo repasse (`app/api/v1/[...path]/route.ts:27`).
- **CBS:** as 15 rotas e os `limit` são idênticos aos do legado (300/500/1000/30). O teto da API é
  500, e isso já valia para o legado.
- **Invariante 3:** `parseNfceListUrlFilters` mais os links do `NfceAttentionPanel` estão ok. O
  período padrão de 30 dias é igual ao do legado.
- **Aviso de plano:** o toast a cada tentativa na lista de NFC-e e só na transição em Comandas
  confere com o legado.
- **Compartilhado:** `selection` com `useMemo` (identidade estável dos repositórios) e
  `LanIdentityPending` estão corretos.

## Veredito

**Pronto para o usuário revisar: Com correções.** Antes de commitar, corrigir C1 (logs
`details`) e I2 (atualização depois de reprocessar); são duas mudanças de poucas linhas, cada uma
com seu teste. Para I1, a correção no Next também é pequena; a parte da API fica registrada como
pendência. Os Menores podem entrar depois.

---

## Correções pós-revisão

Onda de correção aplicada sobre este documento. Tudo permanece NÃO commitado. Não fiz C1/I1/I2/
Menores 7, 8, 9 (fora de escopo desta onda — 7/8/9 mudariam comportamento/visual vs. o legado;
decisão do usuário).

| Item | Mudança (arquivo:linha) | Teste que cobre |
|---|---|---|
| **C1** | `nfce-history-mapper.ts:10-16,23` — nova `toLogDetails()`: string passa por `asText`, objeto/array vira `JSON.stringify(v, null, 2)`, resto `null`. | `nfce-history-mapper.test.ts` — casos novos "mantém `details` em texto" e "formata `details` como JSON quando a coluna jsonb chega como objeto". |
| **I1** | `issuer-edit-draft.ts:43-56` (`tef_admin_http_api_key` entra em `ISSUER_SECRET_FIELDS`, abre sempre `""` em `draftFromConfig`) + `IssuerTefCard.tsx` (dica "Deixe em branco para manter" quando `config.tefAdminHttpApiKey` está definida). `nfce_security_code` (CSC) **não foi tocado** — decisão do usuário, conforme pedido. | `issuer-edit-draft.test.ts` (5 campos de segredo abrem em branco; CSC continua pré-preenchido; PATCH nunca reenvia `tef_admin_http_api_key` não digitado) + `IssuerPage.edit.test.tsx` (novo teste "Importante 1 — tef_admin_http_api_key vindo em claro da API abre vazio no input e não é reenviado sem edição"). Pendência da API (remover a coluna de `mapIssuerRowToClient`) registrada no texto do Importante 1, sem mudança neste repo. |
| **I2** | `use-nfce-list-page.ts:194-198` — `handleReprocess` troca `listQuery.refetch()` por `Promise.all([listQuery.refetch(), totalsQuery.refetch(), attentionQuery.refetch()])`. | `NfceListPage.test.tsx` — "Importante 2 — reprocessar pela lista atualiza também totais e attention-counts (não só a lista)". |
| **Menor 1** | Invariante 1a: removida a checagem morta (`updatedItemsTotal`/`originalItemsTotal` eram a mesma variável). `nfce-correction.ts` documenta que a garantia agora é o TIPO do payload (`NfceManualCorrectionItem` não tem `quantity`/`unitPrice`/`grossValue`) — não uma comparação em runtime; `NfceManualCorrectionContext` perdeu os dois campos. Reforço pedido: `NfceRepository#saveManualCorrection`/`#saveAndReprocessManualCorrection` agora recebem `context` e chamam `validateNfceManualCorrection` ELES MESMOS antes do `POST` (`api-nfce-repository.ts:170-196`), então um chamador futuro que pule o hook de UI ainda é barrado. `use-nfce-correction-form.ts` ganhou `buildContext()`, usado tanto por `validate()` quanto pelas duas chamadas ao repositório. | `nfce-correction.test.ts` (contexto sem os 2 campos; comentário substitui o teste morto da 1a) + `api-nfce-repository.test.ts` (2 testes novos: `saveManualCorrection` rejeita fora de `manual_review` e item com NCM inválido SEM chamar `apiRequest`; 1 teste novo para `saveAndReprocessManualCorrection`) + `NfceCorrectionTab.test.tsx` (assinatura de 3 argumentos). |
| **Menor 2** | `canReprocessNfce()` + `RECONCILE_RETRIABLE` movidos para `domain/nfce-note.ts:43-58`; `NfceDesktopTable.tsx`/`NfceMobileList.tsx` importam a função em vez de duplicá-la. | `nfce-note.test.ts` (novo arquivo, 6 casos). |
| **Menor 3** | `nfce-detail-mapper.ts:24-30` — `toEmbeddedNote` agora é `{ ...toNfceNote(row), totalValue: ..., discountValue: ... }`. | Coberto pelos testes existentes de `nfce-detail-mapper.test.ts` (comportamento idêntico, sem novo caso necessário). |
| **Menor 4** | `LazyFiscalCard.tsx:77-83` — removidos os 4 `console.log` de fila; `console.error` (falha) mantido. | Sem teste dedicado (não havia asserção sobre os logs); `LazyFiscalCard.test.tsx` continua verde. |
| **Menor 5** | Cores Tailwind saíram do domínio: novo `ui/nfce-badge-colors.ts` com `statusColor`/`paymentMethodColor`; `NfceStatusBadge.tsx`/`NfcePaymentBadge.tsx` importam de lá. Apelido `inutilizada→inutilized` unificado em `NFCE_STATUS_ALIASES` (`domain/nfce-note.ts:37-44`), usado por `toNfceStatus` (mapper) e `normalizeNfceStatus` (formatters). | `ui/nfce-badge-colors.test.ts` (novo) + `nfce-formatters.test.ts` (testes de cor removidos, resto intacto). |
| **Menor 6** | Comentários cruzados adicionados em `issuer-sections/helpers.ts:1-8` e `domain/nfce-formatters.ts:57-63` apontando a duplicata proposital (`formatCnpj`/`crtLabel`/`ambienteLabel` × `formatCnpj`/`taxRegimeLabel`/`envLabel`) e por que não unificar. | Nenhum (comentário apenas). |
| **Menor 10** | `IssuerPage.edit.test.tsx:146` renomeado para "Salvar: envia PATCH com todos os campos do rascunho (igual ao legado)...". | O próprio teste renomeado. |
| **Menor 11** | Replicado `focusFirstInvalidField` do legado na granularidade que o Next rastreia (linha do item/pagamento, não o campo exato): `use-nfce-correction-form.ts:57-71` (`focusInvalidRow`, chamada em `validate()` quando há erro) + `id="manual-correction-item-{n}"`/`id="manual-correction-payment-{seq}"` em `NfceCorrectionItemsSection.tsx`/`NfceCorrectionPaymentsSection.tsx`. `vitest.setup.ts` ganhou stub de `Element.prototype.scrollIntoView` (ausente no jsdom). | `NfceCorrectionTab.test.tsx` — 2 testes novos ("erro de item"/"erro de pagamento": `scrollIntoView` chamado com `{behavior:"smooth", block:"center"}` e o primeiro campo da linha recebe foco). |
| **Menor 12** | `cbs-reference-data.ts:46-56` — `cbs_reduction_percent`/`ibs_state_reduction_percent`/`ibs_municipality_reduction_percent`/`ibs_reduction_points`/`cbs_reduction_points` viram `string \| null` (eram `number \| null`), conforme o aviso do topo do arquivo sobre colunas `NUMERIC`. Renderização (`Number(...).toFixed(2)`, `?? "—"`) já tolerava string. | Mudança só de tipo; `tsc --noEmit` é a prova (nenhum consumidor quebrou). |
| **Menor 13** | `api-nfce-repository.ts:44-58` — `getOrNull` também devolve `null` em 400 `invalid_note_id` (além de 404), evitando o duplo aviso (toast de erro + "Nota não encontrada"). | `api-nfce-repository.test.ts` — 2 testes novos ("devolve null quando a API responde 400 invalid_note_id" / "propaga 400 com outro código"). |

### Resultado final dos comandos

- `npm run typecheck` — **OK** (0 erros).
- `npm run lint` — **OK** (0 erros, 0 avisos).
- `npm test` — **OK** — 99 arquivos, 644 testes, todos verdes.
- `BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999 npm run build` — **OK** — build de produção concluído sem erros.
- `npm run test:visual` — **OK** — 32/32 (mantido).
