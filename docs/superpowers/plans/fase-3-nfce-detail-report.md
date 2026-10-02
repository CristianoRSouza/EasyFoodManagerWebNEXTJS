# Fase 3 — Onda 1, agente B: tela Detalhe NFC-e (`/nfce/[id]`) — relatório

Branch: `feat/fase-1-fundacao`. Nada commitado — nenhum `git commit/merge/push/stash/reset/checkout/
restore` foi usado. Nenhum `.env` foi lido. Nenhuma chamada de rede real (API ou Supabase); todos os
testes mockam `apiRequest`/o repositório.

Toquei somente a minha linha da tabela da Onda 1: `src/modules/nfce/ui/detail/**`,
`src/app/(panel)/nfce/[id]/page.tsx`, `tests/visual/{fixtures,scenarios}/nfce-detail.ts`. Não editei
o núcleo do módulo (`domain/`, `application/`, `infrastructure/`, `ui/NfceStatusBadge.tsx`,
`ui/NfcePaymentBadge.tsx`, `ui/NfceSummaryCards.tsx`, `ui/use-nfce-repository.ts` — Onda 0) nem
`ui/list/**` (agente A).

## Arquivos criados

`src/modules/nfce/ui/detail/`:
- `nfce-detail-labels.ts` (+ `.test.ts`) — rótulos e pequenas regras só desta tela (presença,
  finalidade, tipo emissão, indicador IE, indIntermed, `fmtQty`, `hasCsosn500Data`,
  `logTypeLabel`/`eventTypeLabel`/`situationBadgeClass`, `buildXmlOptions`/`hasXml` — a árvore de
  decisão de qual XML mostrar por status —, e as máscaras de CPF/CNPJ), portados verbatim do
  legado.
- `NfceDetailPrimitives.tsx` — `InfoRow`/`SectionCard` (cópia fiel dos helpers inline do legado).
- `use-nfce-detail-query.ts` — TanStack Query que busca detalhe + itens + pagamentos + logs +
  eventos numa única onda paralela (mesma otimização do `loadNote` do legado); `null` quando a nota
  não existe (404 no detalhe); logs/eventos nunca bloqueiam (`.catch(() => [])`).
- `NfceDetailHeader.tsx` (exporta `EnvironmentBadge`, reaproveitado pela Identificação).
- Aba Resumo, um cartão por arquivo: `NfceIdentificationCard`, `NfceContingencyCard`,
  `NfceFiscalTotalsCard`, `NfceTaxReformCard`, `NfceIssuerRecipientCards`, `NfceAdditionalInfoCard`,
  compostos em `NfceSummaryTab.tsx`.
- Aba Produtos: `NfceItemExpandedDetails.tsx` (detalhe fiscal ICMS/PIS/COFINS da linha expandida) +
  `NfceItemsTab.tsx` (tabela).
- Aba Pagamentos: `NfcePaymentsTab.tsx`.
- Aba Histórico: `NfceEventsSection.tsx` + `NfceLogsSection.tsx` + `NfceHistoryTab.tsx`.
- Aba XML: `NfceXmlPane.tsx` (busca o XML só quando a aba abre, via `repository.xml(...,
  detailJáCarregado)`) + `NfceXmlTab.tsx`.
- Aba Correção (invariante 1): `payment-method-options.ts`, `use-nfce-correction-form.ts` (estado +
  `validateNfceManualCorrection` + `saveManualCorrection`/`saveAndReprocessManualCorrection`),
  `NfceCorrectionRecipientSection`, `NfceCorrectionItemsSection`, `NfceCorrectionPaymentsSection`,
  `NfceCorrectionInfoSection`, compostos em `NfceCorrectionTab.tsx`.
- `NfceDetailTabs.tsx` — as 6 abas (`resumo`/`produtos`/`pagamentos`/`historico`/`xml`/`correcao`).
- `NfceDetailPage.tsx` — orquestrador (`useParams`, loading/não-encontrada/carregada).
- Testes de componente: `NfceDetailPage.test.tsx` (carregando, 404 → "Nota não encontrada",
  carregada com cabeçalho, aba Correção indisponível fora de `manual_review`) e
  `NfceCorrectionTab.test.tsx` (as 4 cenas pedidas no brief da invariante 1).

`src/app/(panel)/nfce/[id]/page.tsx` — rota Next (client component via `NfceDetailPage`).

`tests/visual/fixtures/nfce-detail.ts` + `tests/visual/scenarios/nfce-detail.ts` — dono de
`/v1/nfce/notes/nfce-detail-1` e sub-rotas (`items`/`payments`/`logs`/`events`); a lista
(`/v1/nfce/notes`, `/v1/nfce/totals`, `/v1/nfce/attention-counts`) já está registrada pelo agente A
em `fixtures/nfce-list.ts` — conferido, nenhuma rota se repete. Nota fixa AUTORIZADA/homologação com
emitente, destinatário, 1 item e 1 pagamento PIX, datas fixas (`2026-01-15T18:32:1x`).

## Endpoints usados (repositório do núcleo, sem alteração)

`GET /nfce/notes/:id`, `.../items`, `.../payments`, `.../logs`, `.../events`,
`POST .../manual-correction`, `POST .../reprocess` (via `saveAndReprocessManualCorrection`). `xml()`
não bate rede — usa o `NfceDetail` já carregado, como documentado na Onda 0.

## Invariante 1 (correção manual) — como a tela aplica

`use-nfce-correction-form.ts` monta o `NfceManualCorrectionContext` a partir do `NfceDetail`/
`NfceItem[]` carregados e chama `validateNfceManualCorrection` (núcleo) ANTES de qualquer chamada de
rede, tanto em "Salvar correções" quanto em "Salvar e reprocessar". Como esta UI nunca edita
quantidade/preço (só NCM/CFOP/CST-CSOSN, destinatário, pagamento e info complementar),
`originalItemsTotal` e `updatedItemsTotal` vêm da MESMA lista de itens — a invariante 1a fica
estruturalmente satisfeita, e a chamada a `validateNfceManualCorrection` é a rede de segurança contra
um bug futuro que altere isso. Em falha, a tela mostra `result.error` num toast e destaca a
linha do item/pagamento correspondente (`errorItemNumbers`/`errorPaymentSeqs`, extraídos da própria
mensagem — "Item N:"/"Pagamento N:"/"Pagamentos:") sem chamar o repositório.

Testes de componente (`NfceCorrectionTab.test.tsx`) mockam `validateNfceManualCorrection` para
dirigir os 4 cenários pedidos: status fora de `manual_review` (edição indisponível, sem botões),
"total alterado" bloqueado (toast com o erro, repositório não chamado), "pagamento insuficiente"
bloqueado (idem), e caso válido (chama `saveManualCorrection` com o payload esperado, toast de
sucesso, `onSaved` disparado → a página refaz a busca).

## Decisões / diferenças conhecidas

- **Sem replicação da validação por campo do legado** (`validateManualCorrectionBeforeSave` inline
  na página, com mensagens próprias por NCM/CFOP/CST). Usei só `validateNfceManualCorrection` do
  núcleo (que espelha `saveNfceManualCorrection`, o gate real do `data-service.ts`) como única fonte
  de verdade — era isso que o relatório da Onda 0 pedia ("o agente B deve chamar isto antes de
  `saveManualCorrection`"), e evita duas implementações da mesma regra fiscal divergindo com o
  tempo. Efeito visual: os textos de erro seguem os de `validateNfceManualCorrection` (que já são
  muito próximos, mas não byte-a-byte idênticos, aos da validação inline antiga do legado).
- **Ajuste de estado ao trocar de nota/reprocessar feito durante a renderização, não em efeito**
  (`use-nfce-correction-form.ts`, `NfceXmlPane.tsx`) — mesmo padrão já estabelecido em
  `OrdersPage.tsx` (Fase 2), exigido pela regra de lint `react-hooks/set-state-in-effect` deste
  repo.
- **`EnvironmentBadge`** foi exportado de `NfceDetailHeader.tsx` e reaproveitado por
  `NfceIdentificationCard` (o legado duplicava o mesmo JSX no cabeçalho e na linha "Ambiente" do
  Resumo) — union, não duplicação, dentro do meu próprio escopo.

## Candidatos a compartilhado

Nenhum novo — `InfoRow`/`SectionCard` são específicas desta tela (o legado as declarava só em
`NfceDetailPage.tsx`); deixei em `ui/detail/NfceDetailPrimitives.tsx`. Se a lista (`ui/list`)
precisar de algo parecido, cabe ao controller da Onda 2 decidir se sobe para `src/shared/ui`.

## Resultados dos testes

- `npx vitest run src/modules/nfce/ui/detail`: **3 arquivos, 21 testes, todos verdes.**
- `npx vitest run src/modules/nfce` (módulo inteiro, meu código + Onda 0 + lista do agente A):
  **15 arquivos, 118 testes verdes** ignorando `ui/list` (1 falha pré-existente e alheia ao meu
  escopo: `NfceListPage.test.tsx` usa `IntersectionObserver`, indefinido no jsdom deste projeto —
  não toquei nenhum arquivo de que ela dependa).
- `npx tsc --noEmit`: 0 erros no repositório inteiro.
- `npx eslint src/modules/nfce/ui/detail "src/app/(panel)/nfce/[id]"`: 0/0.
- `npx eslint tests/visual/fixtures/nfce-detail.ts tests/visual/scenarios/nfce-detail.ts`: 0/0.
- Não rodei `npm run build` nem `npm run test:visual` (outros agentes editando em paralelo — fica
  para o controller da Onda 2, como pedido no brief).
