# Fase 3 — Agente D: Configuração fiscal (`/nfce-issuer-fiscal`, módulo `taxreform`)

Escopo: só os arquivos da linha D da tabela "Onda 1" (`2026-09-28-fase-3-fiscal.md`):
`src/modules/taxreform/**`, `src/app/(panel)/nfce-issuer-fiscal/page.tsx`,
`tests/visual/{fixtures,scenarios}/taxreform.ts`. Nada em `src/modules/nfce` (núcleo, onda 0) nem
em `src/shared/**` foi tocado. Nada commitado — tudo pendente na árvore de trabalho.

## Arquivos criados

```
src/modules/taxreform/domain/cbs-reference-data.ts
src/modules/taxreform/domain/year-filter.ts
src/modules/taxreform/domain/year-filter.test.ts
src/modules/taxreform/application/tax-reform-repository.ts
src/modules/taxreform/infrastructure/api-tax-reform-repository.ts
src/modules/taxreform/infrastructure/api-tax-reform-repository.test.ts
src/modules/taxreform/ui/use-tax-reform-repository.ts
src/modules/taxreform/ui/fiscal-section-props.ts
src/modules/taxreform/ui/bool-badge.tsx
src/modules/taxreform/ui/TaxReformFiscalPage.tsx
src/modules/taxreform/ui/TaxReformFiscalPage.test.tsx
src/modules/taxreform/ui/sections/DatasetVersionSection.tsx
src/modules/taxreform/ui/sections/UnionRateSection.tsx
src/modules/taxreform/ui/sections/StateRatesSection.tsx
src/modules/taxreform/ui/sections/MunicipalityRatesSection.tsx
src/modules/taxreform/ui/sections/IbscbsTypesSection.tsx
src/modules/taxreform/ui/sections/TaxClassIbscbsSection.tsx
src/modules/taxreform/ui/sections/TaxClassIbscbsIndicatorSection.tsx
src/modules/taxreform/ui/sections/PresumedCreditRuleSection.tsx
src/modules/taxreform/ui/sections/LegalBasisSection.tsx
src/modules/taxreform/ui/sections/CstIbscbsIndicatorSection.tsx
src/modules/taxreform/ui/sections/CstIbscbsSection.tsx
src/modules/taxreform/ui/sections/SelectiveTaxNcmSection.tsx
src/modules/taxreform/ui/sections/CstSelectiveTaxSection.tsx
src/modules/taxreform/ui/sections/TaxClassSelectiveTaxSection.tsx
src/app/(panel)/nfce-issuer-fiscal/page.tsx
tests/visual/fixtures/taxreform.ts
tests/visual/scenarios/taxreform.ts
```

Nenhum arquivo passa de ~190 linhas (o maior é `domain/cbs-reference-data.ts`, só tipos).

## Endpoints usados (todos via `apiRequest("/cbs/<recurso>...", { tenant })`, prefixo `/api/v1`
somado pelo cliente + repassado por `src/app/api/v1/[...path]/route.ts` → `/v1/cbs/<recurso>` na
EasyFoodAPI — conferido em `easyfoodmanagerAPI/src/routes/v1/cbs.ts`)

| Método do repositório | Rota | Parâmetros | Default (sem argumento) |
|---|---|---|---|
| `fetchUnionReferenceRate` | `/cbs/union-reference-rate` | `limit` | 24 (tela pede 30) |
| `fetchOpenDatasetVersion` | `/cbs/open-dataset-version` | — | — |
| `fetchTaxClassIbscbsType` | `/cbs/tax-class-ibscbs-type` | `limit` | 120 (tela pede 1000) |
| `fetchTaxClassIbscbs` | `/cbs/tax-class-ibscbs` | `limit` | 120 (tela pede 300) |
| `fetchTaxClassIbscbsIndicator` | `/cbs/tax-class-ibscbs-indicator` | `limit` | 120 (tela pede 300) |
| `fetchSelectiveTaxNcm` | `/cbs/selective-tax-ncm` | `limit` | 120 (tela pede 300) |
| `fetchPresumedCreditRule` | `/cbs/presumed-credit-rule` | `limit` | 120 (tela pede 300) |
| `fetchMunicipalityWithRateByUf` | `/cbs/municipality-with-rate-by-uf` | `uf` (obrigatório) | — |
| `fetchLegalBasis` | `/cbs/legal-basis` | `limit` | 200 (tela pede 500) |
| `fetchCstSelectiveTax` | `/cbs/cst-selective-tax` | `limit` | 120 (tela pede 300) |
| `fetchCstIbscbsIndicator` | `/cbs/cst-ibscbs-indicator` | `limit` | 120 (tela pede 300) |
| `fetchCstIbscbs` | `/cbs/cst-ibscbs` | `limit` | 120 (tela pede 300) |
| `fetchState` | `/cbs/state` | — | — |
| `fetchStateReferenceRate` | `/cbs/state-reference-rate` | `stateCode?`, `limit` | 120 (tela pede `undefined, 300`) |
| `fetchTaxClassSelectiveTax` | `/cbs/tax-class-selective-tax` | `limit` | 80 (tela pede 300) |

Os `limit`/valores por chamada reproduzem exatamente o que `NfceIssuerFiscalPage.tsx` (legado)
pedia por seção, inclusive o comentário do legado sobre `tax-class-ibscbs-type` pedir 1000 (e não
300) porque essa tabela tem 626 linhas (313 de 2026 + 313 de 2027) e o filtro por ano roda no
navegador, depois do corte do `limit`.

## Decisões

1. **Repositório enxuto**: em vez de 15 implementações repetindo `apiRequest` + `response.data ?? []`,
   há um único método privado genérico `fetchList<T>(resource, params)`; cada leitura pública
   (`fetchState`, `fetchCstIbscbs`, ...) é uma linha que só fixa a rota, os parâmetros e o tipo de
   retorno. Cada método tem teste próprio em `api-tax-reform-repository.test.ts` (18 casos,
   cobrindo os 15 métodos + defaults de `limit` + resposta sem `data`).
2. **Tipos por rota, não pelo `mock-data.ts` do legado**: `domain/cbs-reference-data.ts` reflete só
   as colunas que cada `SELECT` de `cbs.ts` de fato devolve — não o conjunto mais largo do legado
   (que inclui `raw_json`, `label` etc. que essas rotas nunca mandam). Colunas `NUMERIC` do Postgres
   (`reference_rate`, `own_rate`, `cbs_rate`...) são tipadas como `string`, porque o pool da API
   (`easyfoodmanagerAPI/src/db/pool.ts`) não registra `setTypeParser` para `numeric` — o driver `pg`
   devolve `NUMERIC` como string por padrão, e é assim que `cbs.ts` serializa a resposta.
3. **Sem TanStack Query nesta tela — desvio deliberado da regra geral da Fase 2.** O núcleo
   compartilhado da Onda 0a já definiu `LazyFiscalCard` (`src/shared/ui/issuer-sections/`) como o
   mecanismo de carregamento por card: cada card gerencia seu próprio estado
   `idle → loading → done/error` e dispara `fetchData()` ao entrar em viewport (ou imediatamente, se
   `eager`), com fila sequencial no backend `lan` e paralelo no `cloud`. Rotear os dados por
   `useQuery` brigaria com esse contrato já pronto (duplicaria estado, ou faria o card não saber
   quando "recarregar" no clique do botão Atualizar). Segui o padrão que a própria peça
   compartilhada já embute — mesma escolha que `NfceIssuerFiscalPage.tsx` do legado fazia com
   `useState` por seção.
4. **15 seções viraram 14 componentes** (`ui/sections/*.tsx`), um por card do legado — não um
   componente genérico parametrizado por colunas. O motivo: as colunas, formatação (badge S/N,
   truncamento com `title`, alinhamento à direita, `hideBelow`) e o filtro por ano variam livremente
   entre elas (3 cards — Versão Dataset, Indicadores de Classificação, Indicadores CST — não filtram
   por ano; os demais filtram por conjuntos diferentes de campos de data). Um componente genérico
   ficaria tão grande quanto a soma dos casos e mais arriscado de auditar contra o legado
   linha-a-linha. A recomendação de "evitar repetição" do brief foi aplicada onde o padrão realmente
   se repetia sem variação: a camada HTTP do repositório (decisão 1).
5. **Filtro de ano extraído para função pura testável** (`domain/year-filter.ts`:
   `extractYear`/`matchesYear`/`yearFilterOptions`), replicando `getYear`/`matchesYear`/`yearOptions`
   do legado (inclusive o cuidado de ler o ano do prefixo da string ISO em vez de
   `new Date(...).getFullYear()`, que pode saltar de fuso). `filterYear`/`refreshKey` continuam no
   componente-pai (`TaxReformFiscalPage`) e descem para cada seção via `FiscalSectionProps`
   (`matchesYear` fechada sobre o valor atual, `yearBadge` pronto, `refreshKey` como `key` do
   `LazyFiscalCard` — trocar o valor remonta o card e refaz o fetch, mesmo efeito do botão "Atualizar
   dados" do legado).
6. **`boolBadge` virou helper de módulo** (`ui/bool-badge.tsx`) em vez de repetir a função em cada
   seção que precisa dela (Indicadores Classificação Tributária, Indicadores CST, Classificação
   Imposto Seletivo).

## Diferenças conhecidas vs. legado

- Nenhuma nas 14 seções: JSX, classes Tailwind e textos PT-BR copiados 1:1 de
  `NfceIssuerFiscalPage.tsx`. A única mudança de import é a já feita pela Onda 0a em
  `NfceIssuerSectionNav` (`react-router-dom` → `next/link`), fora do meu escopo.
- Formatação de data: usei `formatDate`/`formatDateTime` de `@/shared/format/date-time` (que
  reproduzem exatamente `toLocaleDateString("pt-BR")`/`toLocaleString("pt-BR")` do legado) em vez de
  chamar `new Date(...).toLocaleString(...)` inline em cada célula — mesmo resultado visual, só
  reuso do helper compartilhado (Fase 2).
- Um `"` literal em `Nenhum município corresponde à busca "..."` virou `&quot;` (entidade HTML) —
  mesmo caractere renderizado, só para não depender de `react/no-unescaped-entities` do
  `eslint-config-next`.

## Candidatos a compartilhado

- Nenhum novo. Tudo que a tela precisava de compartilhado (`issuer-sections/*`, `CloudFieldWarning`,
  `PageRefreshButton`, `useToast`, `formatDate`/`formatDateTime`, `toQueryString`, `apiRequest`,
  `useRequiredTenant`) já existia da Onda 0/0a ou da Fase 2.

## Resultados dos testes

- `npx vitest run src/modules/taxreform` (rodado de `/c/Users/.../easyfoodmanagerNEXT`) —
  **3 arquivos, 32 testes, todos verdes** (6 de domínio, 18 de repositório, 8 de componente da
  tela: nav+filtro, carregando, vazio, erro, dados, seções não-eager pendentes).
- `npx tsc --noEmit` — limpo, 0 erros.
- `npx eslint src/modules/taxreform "src/app/(panel)/nfce-issuer-fiscal"` — limpo, 0/0.
- `npx eslint tests/visual/fixtures/taxreform.ts tests/visual/scenarios/taxreform.ts` — limpo, 0/0
  (checagem extra, não pedida pelo brief, mas os arquivos são meus).
- `npm run build` e `npm run test:visual` **não foram rodados**, por instrução do brief (outros
  agentes editando a mesma árvore; o controller roda os dois no fim da Onda 1).

## Fixture/cenário visual

`tests/visual/fixtures/taxreform.ts` registra as 15 rotas `/v1/cbs/*` (dono único — nenhuma
sobreposição com as fixtures de A/B/C, que usam `/v1/nfce/*`). Dados com vigência em 2026
(`valid_from: "2026-01-01"`, `valid_to: null`) para ficarem visíveis sob o filtro padrão "ano atual"
da tela (calculado no navegador nos dois apps, no mesmo instante do teste).

`tests/visual/scenarios/taxreform.ts` define `taxreform-configuracao-fiscal` (modo `lan`): login,
navega para `/nfce-issuer-fiscal`, espera o heading "Emitente NFC-e" e o texto do card eager
("Dataset CBS/IBS 2026.1") — prova que o `LazyFiscalCard` eager terminou de buscar e renderizar
antes da captura. `desktop`/`mobile` vêm de graça dos projetos do Playwright
(`tests/visual/playwright.config.ts`), não precisam de entradas extras aqui.
