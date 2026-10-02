# Atualização do legado de referência: 1.2.96 → 1.3.12

**Data:** 2026-09-30 · **Branch:** `feat/fase-1-fundacao` (sem commit)

A referência visual/comportamental do Next passou a ser **`C:\Users\crist\Desktop\apiNuvem`** —
o mesmo repositório `EasyFoodManager-Web`, versão **1.3.12 (PR #52)**, 30 PRs à frente do
`easyfoodmanagerWEB` (1.2.96, PR #22) usado nas fases 1-5. O `apiNuvem` foi só lido; o único
efeito nele foi `npm ci` (instala `node_modules`, nenhum arquivo versionado alterado —
`git status` lá continua só com os `.bat` que já estavam modificados antes).

Regra de paridade aplicada: idêntico ao legado em visual e comportamento; desvio só onde o
legado dependia de Electron/Supabase direto ou por bug claro — sempre documentado abaixo.

## Como o diff foi levantado

- `diff -r easyfoodmanagerWEB/src apiNuvem/src` → 37 arquivos (24 alterados, 13 novos).
- `index.html` (script `./config.js` antes do bundle), `package.json` (versão), `public/config.js`
  (novo, vazio). `index.css`, `tailwind.config.ts` e `vite.config.ts`: **idênticos**.
- `git -C apiNuvem log --oneline c5b51de..HEAD` + `git show --stat` de cada commit.

Classificação: **V** visual · **C** comportamento · **D** contrato de dados · **E** Electron/mock/
Supabase-direto (ignorado) · **I** infra.

## PR → mudança → onde ficou no Next

| PR | Mudança no legado | Classe | Next (arquivo) / motivo de ignorar |
|---|---|---|---|
| #23 | Voucher (`meal_voucher`/`food_voucher`): rótulos no `StatusBadge` | V | `src/shared/ui/StatusBadge.tsx` |
| #23 | Voucher em Transações: ícone `Ticket`, rótulos "Vale Refeição/Alimentação", chave própria antes de credit/debit | V/C | `src/shared/domain/transaction.ts` (`paymentMethodKey`, `PAYMENT_METHOD_LABELS`) + teste em `modules/transactions/domain/transaction.test.ts`; `modules/transactions/ui/PaymentMethodIcon.tsx` |
| #23 | Voucher na Receita: grupo `voucher`, 5 cards de KPI (`lg:grid-cols-5`), 6 indicadores (`sm:grid-cols-3 lg:grid-cols-6`), card "Participação voucher", cor do PIX passa a `chart-4`, barras "Voucher" (dia e hora), textos "…PIX e voucher", rótulo cru (Vale Refeição/Alimentação) em recentes e CSV | V/C/D | `modules/revenue/domain/revenue.ts` (`PaymentMethod`, `METHOD_LABEL`, `rawMethodLabel`, `withVoucherDefaults`, buckets/kpis), `domain/revenue-csv.ts`, `infrastructure/api-revenue-repository.ts` (completa servidor antigo com zero), `ui/SummaryCards.tsx`, `ui/RevenueCharts.tsx`, `ui/RevenueTrendCharts.tsx`, `ui/RecentTransactionsCard.tsx`, `ui/RevenuePage.tsx`, `ui/chart-format.ts`; testes em `domain/revenue.test.ts`, `domain/revenue-csv.test.ts`, `infrastructure/api-revenue-repository.test.ts` |
| #23 | Voucher no cadastro do totem: switch "Voucher" + rádio "Tipo do voucher na NFC-e" (Vale Refeição tPag 11 / Vale Alimentação tPag 10), default desligado/`meal`; campos no corpo da nuvem | V/C/D | `modules/totems/domain/totem-config.ts`, `domain/totem-form.ts` (defaults), `infrastructure/totem-mapper.ts` (`toVoucherKind`), `infrastructure/totem-cloud-mapper.ts` (lista branca), `ui/TotemFormGeneralTab.tsx`; testes em `totem-mapper.test.ts`, `totem-cloud-mapper.test.ts` |
| #23 | Agregação de receita no cliente (`revenueGroupOf`, filtro `neq cash`, SQL `payment_method::text IN (...)`) | E | Ignorado: só os caminhos Electron/PG e Supabase direto agregam no cliente; no Next o servidor devolve os agregados |
| #23 | Migrações Supabase de voucher | E | Fora do Next (banco) |
| #24/#28/#33/#40/#47 | Bumps de versão (1.2.97 … 1.3.12) e `CHANGELOG` | I | `package.json`/`package-lock.json` → **1.3.12** (rótulo da barra lateral/login = `1.3.12`); `src/shared/version.test.ts`. O `CHANGELOG` do legado não é exibido em tela nenhuma — não portado |
| #25 | Escritas de totem: exceção da API vira `{ ok:false }` + toast | C | Já equivalente: `use-totems-page.ts` captura e mostra toast "Erro ao cadastrar/salvar/alterar status" com a mensagem. Nada a mudar |
| #26 | Datas da NFC-e 3 h atrasadas na nuvem | E | Só migração SQL (`20260929180000_nfce_datas_em_hora_de_brasilia.sql`) — corrige o dado no banco |
| #27 | Itens da comanda em ordem alfabética (pt-BR, sem acento/caixa), desempate `fb_id` → `id` | C | `modules/orders/domain/order-rules.ts` (`groupItemsByOrder`), usado em `ui/OrdersPage.tsx`; testes em `order-rules.test.ts` |
| #29 | Detalhes do histórico NFC-e: JSON de uma linha volta indentado | V/C | `modules/nfce/domain/nfce-formatters.ts` (`formatLogDetails`), aplicado em `infrastructure/nfce-history-mapper.ts`; testes nos dois |
| #30 | Estoque/quantidade formatados pela unidade (`unit_is_fractional`: 3 casas; inteira sem casas; `"-388.0000"` → `-388`; zero em vermelho também como texto) | V/D | `src/shared/format/quantity.ts` (+ teste); `modules/products/domain/product.ts` (`unitIsFractional`), `infrastructure/product-mapper.ts`, `ui/ProductTableRow.tsx`, `ui/ProductMobileCard.tsx`; `modules/orders/ui/OrdersDesktopTable.tsx` e `OrdersMobileList.tsx` (`formatQuantity(item.quantity)`) |
| #30 | `electron/main.cjs` (numeric como número) | E | Ignorado (Electron) |
| #31 | Alíquota zero aparecia como "—" na loja: `fmtFiscalNum` (2 casas + `%`; "Vlr. Alíq." com 4 casas) | V | `modules/products/domain/fiscal-number.ts` (+ teste), `ui/ProductFiscalDetails.tsx` |
| #32/#43/#45 | Indicadores IBS/CBS: `"0"`/`"N"` da loja apareciam como Sim/S (`indicadorLigado`) | V/C/D | `src/shared/domain/ibscbs-indicator.ts` (+ teste). Produtos: normalizado no mapper (`infrastructure/product-fiscal-ibscbs-mapper.ts`, domínio vira `boolean`), "Red. Base Cálc." sempre com badge Sim/Não e os grupos como "Sim"/"Não" (`ui/ProductFiscalDetails.tsx`). Configuração fiscal: as 8 colunas de grupo da "Classificação IBS/CBS — indicadores" viram badge S/N centralizado (`taxreform/ui/sections/TaxClassIbscbsIndicatorSection.tsx`) e os indicadores CST passam por `indicadorLigado` (`CstIbscbsIndicatorSection.tsx`); tipos em `taxreform/domain/cbs-reference-data.ts` |
| #34 | Vigência um dia antes na nuvem: datas sem hora lidas como texto (`formatDateOnlyBR`) | V/C | `src/shared/format/date-only.ts` (+ teste); Configuração fiscal (União, Estados, Municípios, Tipos, Classificação, Fundamentação, CST: `reference_date`/`valid_from`/`valid_to`) e Produtos (Vigência De/Até) |
| #35 | Regime tributário ausente mostra "—" (não "Regime Normal"); cabeçalho do emitente omite " · regime" | V/D | `src/shared/ui/issuer-sections/helpers.ts` (`taxRegimeLabel` → `string \| null`), `modules/issuer/domain/nfce-issuer-config.ts` (`taxRegimeCode: number \| null`), `infrastructure/issuer-config-mapper.ts`, `domain/issuer-edit-draft.ts`, `ui/IssuerStatusHeader.tsx`; testes |
| #36/#37/#38 | Emitente na nuvem: aviso "sem dados na nuvem" só no caminho Supabase direto (`fiscalDaLojaSemFonte`); IE ST, infCpl, TEF Admin, certificado e flags passam a aparecer; segredos TEF "definido na loja"/"definido — cifrado na BD" pelo indicador `*_encrypted_set` (sai o aviso âmbar); X-Api-Key TEF por `tef_admin_http_api_key_set`; chave EasyERP "definida na loja" (`easyerp_api_key_origem`) e aviso de SENSITIVE_SECRET_* só com `issuer_sensitive_secrets_ready === false`; parâmetros ACBr também na nuvem | V/C/D | Nuvem do Next = sempre EasyFood API ⇒ `fiscalDaLojaSemFonte` é sempre falso: avisos removidos de `IssuerMainGrid.tsx`, `IssuerInfCplCard.tsx`, `IssuerCertificateCard.tsx`, `IssuerTefCard.tsx` (o do título do TEF Aditum fica, como no legado). `domain/nfce-issuer-config.ts` (`tefSecretLabel`, `tefAdminHttpApiKeySet`, `easyerpApiKeyOrigem`, `issuerSensitiveSecretsReady: boolean \| null`), `ui/IssuerEasyerpCard.tsx`, `infrastructure/api-issuer-repository.ts` (ACBr nos dois backends); testes |
| #36/#37/#38 | Migrações `nfce.issuer_config` | E | Fora do Next |
| #41/#42 | "Versão Dataset CBS/IBS" escondida e depois reexibida na nuvem via `pb_cbs_dataset_version` | E | Só o caminho Supabase direto mudou; no modo EasyFood API o legado já usava `/v1/cbs/open-dataset-version`, igual ao Next. Nada a mudar |
| #44 | Remove o card "Regras de Crédito Presumido CBS/IBS" | V | Removido de `taxreform/ui/TaxReformFiscalPage.tsx`; apagados `sections/PresumedCreditRuleSection.tsx`, método/tipo no repositório e testes |
| #46 | Remove os 3 cards do Imposto Seletivo (por NCM, CST IS, Classificação IS) | V | Removidos da página; apagados `SelectiveTaxNcmSection.tsx`, `CstSelectiveTaxSection.tsx`, `TaxClassSelectiveTaxSection.tsx`, métodos/tipos do repositório e testes |
| #48 | Ambiente por config em execução: faixa âmbar "HOMOLOGAÇÃO" (sticky, `z-[100]`) + prefixo "[HOMOLOGAÇÃO] " no título da aba | I/V | `EASYFOOD_AMBIENTE` (`homolog`/outro) lido só no servidor (`src/server/config.ts`) → `RuntimeProvider` (agora no layout raiz, `src/app/layout.tsx`). `src/shared/runtime/ambiente.ts` (`resolveAmbiente`, `titleForAmbiente`) + teste; `src/shared/layout/AmbienteBanner.tsx` (mesmas classes e texto) + teste; título via `generateMetadata` do layout raiz. Layout raiz e `/reset-password` viram dinâmicos |
| #48 | Supabase do ambiente em execução (`runtime-config.ts`, `public/config.js`, `client.ts`) | I | `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` lidos no servidor (`src/server/config.ts`, ambos ou nada) → `app/reset-password/page.tsx` → `configureRecoverySupabase` em `shared/session/reset/password-recovery.ts` (+ testes). Sem rebuild por ambiente. `NEXT_PUBLIC_SUPABASE_*` deixam de existir (`.env.example` e README atualizados). Sem "produção embutida": ausente = a tela avisa (segurança) |
| #48 | `error-reporter.ts` usa o Supabase do runtime | E | Ignorado: o Next já encaminha o relatório pelo servidor (`/api/error-report` → EasyGuardian), sem Supabase |
| #48 | CI/Docker/Caddy/entrypoint | E | Deploy, fora do escopo |
| #50 | Ponto final no texto da faixa | V | Incluído no `AmbienteBanner.tsx` |
| #51 | "Bem-vindo de volta!" no login da **nuvem** (o da loja continua sem "!") | V | `shared/session/login/CloudLoginForm.tsx` + `login-forms.test.tsx` |
| #52 | Editar agente na nuvem: corpo por lista branca (`corpoAgente`, schema `.strict()`), erro da API chega à tela | C/D | `modules/agents/domain/agent-config.ts` (`AGENT_CLOUD_EDITABLE_FIELDS`, `agentCloudBody`) + testes; `infrastructure/api-agent-repository.ts` (nuvem usa a lista branca; criar/editar repassam `error` na toast; ativar/desativar continua sem descrição, como no legado) + testes |
| — | `mock-data.ts`, ramos `isElectron()` de `data-service.ts`, `cloud-data.ts`/`cloud-data-cbs.ts` (Supabase direto) | E | Ignorados; o que neles era contrato de dados (ex.: `tax_regime_code ?? 3` removido, `is_fractional` na unidade) foi refletido nos mappers do Next |

### Desvios conscientes

1. **Comandas × voucher:** o `formatTransactionMethod` de `Orders.tsx` do legado não ganhou os
   rótulos de voucher no PR #23 — a comanda mostra o valor cru (`meal_voucher`). Mantido igual
   (`orders/domain/order-rules.ts`, com teste) para não haver diferença visual; é um bug do legado
   a corrigir nos dois lados juntos.
2. **Supabase sem "produção embutida":** o legado cai no projeto de produção fixo quando nada está
   configurado; o Next exige `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` no servidor (sem eles, a
   redefinição de senha avisa). Evita um painel de homologação falando com produção.
3. **Aviso "sem dados na nuvem"** dos campos fiscais nunca aparece no Next: a condição do legado
   (`cloudMode && !isCloudApiMode()`) é o caminho Supabase direto, que o Next não tem.

## Harness visual

- `tests/visual/playwright.config.ts`: `LEGACY = "../apiNuvem"` (portas do harness inalteradas:
  8092/8081 legado, 3000/3002 Next, 4999/4998 fake API).
- O `vite` do legado recebe `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` de um projeto
  **fictício** (`tests/visual/harness-supabase.ts`); `public/config.js` do legado já é vazio no dev,
  então o `runtime-config.ts` dele usa esses `VITE_*` e nunca a produção embutida. A sessão semeada
  (`seedLegacyProductionSession`) usa a chave desse projeto (`sb-harnessvisualfake-auth-token`).
  Todo `*.supabase.co` continua interceptado (inclui os 3 clientes com URL fixa no legado: IA, SSO,
  billing).
- Fixtures atualizadas: `revenue.ts` (grupo voucher, `shareVoucher`, recentes `meal_voucher`/
  `food_voucher`), `products.ts` (estoque como texto do numeric, produto KG fracionário),
  `fixture-data/operations.ts` (item "Água Mineral" fora de ordem com quantidade `"1.5000"`;
  transação `meal_voucher`), `totems.ts` (voucher ligado, tipo `food`), `taxreform.ts` (indicadores
  crus `"0"`/`"1"`/`"S"`/`"N"`; removidas as 4 rotas dos cards excluídos), `issuer.ts` (linha de
  nuvem: sem regime, `*_set`, `easyerp_api_key_origem: "loja"`).
- Cenário novo: `nfce-issuer-nuvem` (emitente na nuvem, sem máscara).

## Resultados finais

| Comando | Resultado |
|---|---|
| `npm run typecheck` | OK (0 erros) |
| `npm run lint` | OK (0 erros, 0 avisos) |
| `npm test` | 181 arquivos, **1295 testes passando** |
| `npm run build` (`BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999`) | OK — todas as rotas dinâmicas (ƒ) |
| `npm run test:visual` (rodado em 2 shards: `--shard=1/2` e `--shard=2/2`) | **114/114 passando** (57 cenários × desktop/mobile) contra `apiNuvem`; `MAX_DIFF_RATIO` inalterado (0,001) |

Verificação manual extra: `next start` temporário com `EASYFOOD_AMBIENTE=homolog` na porta 3107
mostrou `<title>[HOMOLOGAÇÃO] EasyFood Manager</title>` e a faixa no `/login` e no
`/reset-password`; processo encerrado em seguida.

### Diff por cenário (fração de pixels diferentes; limite 0,001)

| Cenário | Desktop | Mobile |
|---|---|---|
| agents-carregada | 0 | 0 |
| agents-form-api | 0 | 0 |
| agents-form-contingencia | 0 | 0 |
| agents-form-geral | 0 | 0 |
| agents-form-sync | 0 | 0 |
| agents-historico | 0 | 0 |
| agents-nuvem-carregada | 0 | 0 |
| assistente-conversa-de-hoje | 0 | 0 |
| assistente-historico | 0 | 0 |
| audit-logs-carregado | 0 | 0 |
| audit-logs-loja | 0 | 0 |
| audit-logs-sem-permissao | 0 | 0 |
| bootstrap-codes-carregado | 0 | 0 |
| bootstrap-codes-sem-permissao | 0 | 0 |
| cabecalho-plano-nuvem | 0 | 0 |
| dashboard-carregado | 0 | 0 |
| licenca-vencendo-nuvem | 0,000191 | 0 |
| licenca-vencida-nuvem | 0,000191 | 0 |
| login-loja | 0 | 0 |
| login-nuvem | 0 | 0 |
| manual-secoes-abertas | 0 | 0 |
| nfce-detail-carregado | 0 | 0 |
| nfce-issuer-carregado | 0 | 0,000073 |
| nfce-issuer-nuvem (novo) | 0 | 0 |
| nfce-lista | 0 | 0 |
| orders-lista | 0 | 0 |
| painel-404-loja | 0 | 0 |
| painel-seletor-nuvem | 0 | 0 |
| pixnopdv-carregada | 0 | 0 |
| pixnopdv-nuvem-carregada | 0 | 0 |
| primeiro-acesso | 0 | 0 |
| products-lista | 0 | 0 |
| receitas-carregada | 0 | 0 |
| reset-sem-link | 0 | 0 |
| sync-inbox-carregado | 0 | 0 |
| sync-log-carregado | 0 | 0 |
| sync-mirror-alteracoes | 0 | 0 |
| sync-mirror-carregado | 0 | 0 |
| sync-mirror-ciclos | 0 | 0 |
| sync-mirror-log | 0 | 0 |
| sync-mirror-saude | 0 | 0 |
| sync-nuvem-inbox | 0 | 0 |
| sync-outbox-carregado | 0 | 0 |
| taxreform-configuracao-fiscal | 0 | 0 |
| totems-carregado | 0 | 0 |
| totems-form-aditum | 0 | 0 |
| totems-form-geral | 0 | 0 |
| totems-form-licenca | 0 | 0 |
| totems-form-nfce | 0 | 0 |
| totems-form-pix | 0,000009 | 0,000024 |
| totems-form-tef | 0 | 0 |
| totems-historico | 0 | 0 |
| totems-nuvem-carregado | 0 | 0 |
| totems-reativar-licenca | 0 | 0,000033 |
| transactions-lista | 0 | 0 |
| units-lista | 0 | 0 |
| wizard-conexoes | 0 | 0 |

Os não-zero são sub-pixel de anti-aliasing, todos abaixo do limite (o maior, 0,019%, nos dois
cenários de licença no desktop — que já deixavam imagens de diferença em `tests/visual/output` antes
desta atualização).

## Pendências / observações

- Nenhum cenário visual cobre a faixa de homologação (exigiria um terceiro par de servidores com
  `EASYFOOD_AMBIENTE=homolog` e `window.__EASYFOOD_CONFIG__` no legado); coberta por testes de
  unidade e pela verificação manual acima.
- `totems-form-geral` fotografa só a área visível do diálogo; não conferi se o bloco de voucher
  (switch + tipo) entra nessa área. A paridade dele se apoia no JSX copiado e nos testes.
- A versão do Next acompanha a do legado (1.3.12) só por decisão desta atualização; o próximo bump
  do legado precisa ser refletido à mão no `package.json` do Next.
