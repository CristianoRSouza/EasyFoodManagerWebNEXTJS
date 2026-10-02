# Fase 3 — Fiscal: plano de execução

**Objetivo:** migrar NFC-e (lista `/nfce` e detalhe `/nfce/[id]`), Emitente NFC-e (`/nfce-issuer`) e Configuração fiscal (`/nfce-issuer-fiscal`) com visual idêntico ao legado.

**Spec:** `docs/superpowers/specs/2026-09-26-migracao-nextjs-design.md`. **Regras gerais:** as mesmas da Fase 2 (`docs/superpowers/plans/2026-09-27-fase-2-operacao.md`, seção "Regras que valem para todos") e o padrão consolidado na integração da Fase 2 (`docs/superpowers/plans/fase-2-integracao-report.md` e `fase-2-revisao-final.md`: nomes `ui/XPage.tsx`, `ui/use-x-repository.ts`, helpers em `src/shared/{format,infrastructure,domain,http,date-period,plan}`, `usePlanPeriodGuard`, `Money`, `keep-only-first-page`, repositórios recebendo `Tenant`).

**Caminhos:** `NEXT` = `C:\Users\crist\Desktop\easyfoodmanagerNEXT`; `LEGACY` = `C:\Users\crist\Desktop\easyfoodmanagerWEB` (somente leitura, referência visual ÚNICA); `REF` = `C:\Users\crist\Desktop\EASYCOMMAND REFATORADO` (somente leitura; domain/infrastructure, nunca UI); `API` = `C:\Users\crist\Desktop\easyfoodmanagerAPI` (somente leitura; contrato real das rotas `/v1/*`).

## Invariantes críticas (do CLAUDE.md do legado — valem para todos)

1. **Correção manual de NFC-e não pode alterar o valor total**: rejeitar se `updatedItemsTotal != originalItemsTotal` ou se pagamentos − troco < total; só permitida no estado `manual_review`. Validar no domínio (função pura testada) ANTES de chamar a API, exatamente como `saveNfceManualCorrection` do legado.
2. **Segredos do emitente nunca em claro** (`aditum_tef_*`, `apikey_easyerp` e similares): a UI nunca exibe nem reenvia o valor em claro; segue o comportamento do legado (campo mascarado / "definido" / troca explícita). Conferir o que a API devolve e o que o legado faz.
3. Links vindos do Dashboard usam `?status=manual_review`, `?status=all&reconcileStatus=failed`, `?status=unusable` — a lista NFC-e deve ler esses parâmetros.

## Regras de execução

- **Sem commits** (nenhum `git commit/merge/push/stash/reset/checkout/restore`). Tudo pendente para o usuário.
- Visual idêntico: JSX e classes Tailwind copiados do legado; só a origem dos dados muda. Sem ramos Electron/mock/Supabase.
- TDD para domínio, mappers e validações; teste de componente por tela (carregando/vazio/erro/dados).
- Cada agente de tela roda só os próprios testes/lint/tsc. O controller/integração roda build + visual no fim.

## Onda 0 — núcleo compartilhado (1 agente)

1. Primitivas que faltam, copiadas do legado: `textarea` (e qualquer outra usada pelas 4 telas que ainda não exista em `src/shared/ui/primitives`).
2. Módulo `src/modules/nfce` — núcleo (sem telas): tipos de domínio (a partir de `LEGACY/src/types/nfce.types.ts` + REF `modules/nfce/domain`), formatadores (`LEGACY/src/lib/nfce-formatters.ts` → `nfce/domain/nfce-formatters.ts` com testes do legado `src/lib/__tests__/nfce-formatters.test.ts`), validação de correção manual (invariante 1, função pura testada), repositório com TODOS os endpoints usados pela lista e pelo detalhe (lista, totais, attention-counts, detalhe, itens, pagamentos, eventos, logs, XML, download de XML em lote/zip via repasse, salvar correção, salvar e reprocessar) conforme `API/src/routes/v1/nfce*.ts` e o modo LAN do legado, hook `ui/use-nfce-repository.ts`, e os componentes visuais compartilhados `ui/NfceStatusBadge.tsx`, `ui/NfcePaymentBadge.tsx`, `ui/NfceSummaryCards.tsx` (cópia fiel de `LEGACY/src/components/nfce/*`, com os testes de `LEGACY/src/components/nfce/__tests__`).
3. Seções do emitente usadas pelas duas telas fiscais, em `src/shared/ui/issuer-sections/` (cópia fiel de `LEGACY/src/components/nfce-issuer/*`: `EditableInfoRow`, `InfoRow`, `IssuerFieldGrid`, `IssuerSectionCard`, `LazyFiscalCard`, `MobileStickyActionBar`, `NfceIssuerSectionNav`, `ResponsiveTable`, `helpers`, `responsive-tokens`) e `src/shared/ui/CloudFieldWarning.tsx`.
4. Relatório `docs/superpowers/plans/fase-3-onda-0-report.md` com as assinaturas exportadas (repositório NFC-e, tipos, componentes e props).
5. Verde: `npm run typecheck`, `npm run lint`, `npm test`.

## Onda 1 — telas (4 agentes em paralelo)

| Agente | Tela | Arquivos que pode tocar | LEGACY | REF |
|---|---|---|---|---|
| A | Lista NFC-e `/nfce` | `src/modules/nfce/ui/list/**`, `src/app/(panel)/nfce/page.tsx`, `tests/visual/{fixtures,scenarios}/nfce-list.ts` | `pages/NfcePage.tsx` | `modules/nfce/ui/NfcePage.tsx` só como pista de dados |
| B | Detalhe NFC-e `/nfce/[id]` | `src/modules/nfce/ui/detail/**`, `src/app/(panel)/nfce/[id]/page.tsx`, `tests/visual/{fixtures,scenarios}/nfce-detail.ts` | `pages/NfceDetailPage.tsx` | `modules/nfce/domain/nfce-correction.ts` |
| C | Emitente `/nfce-issuer` | `src/modules/issuer/**`, `src/app/(panel)/nfce-issuer/page.tsx`, `tests/visual/{fixtures,scenarios}/issuer.ts` | `pages/NfceIssuerConfigPage.tsx` | `modules/issuer` |
| D | Configuração fiscal `/nfce-issuer-fiscal` | `src/modules/taxreform/**`, `src/app/(panel)/nfce-issuer-fiscal/page.tsx`, `tests/visual/{fixtures,scenarios}/taxreform.ts` | `pages/NfceIssuerFiscalPage.tsx` | `modules/taxreform` |

A e B não editam o núcleo do módulo nfce (onda 0); se precisarem de algo lá, criam dentro de `ui/list` ou `ui/detail` e reportam. Rotas de fixture NÃO podem repetir as de outro arquivo (o fake API falha em duplicata) — A e B combinam: A é dona de `/v1/nfce/notes` (lista), `/v1/nfce/totals`, `/v1/nfce/attention-counts`; B é dona de `/v1/nfce/notes/:id` e sub-rotas. Se precisar de um dado de outra fixture, importe do dataset compartilhado em `tests/visual/fixture-data/`.

## Onda 2 — integração (1 agente) e revisão final

Build, `test:visual` completo (Fases 1–3), correções no Next até diferença zero, unificação de duplicatas entre os módulos novos, revisão final e correções. Sem commits.
