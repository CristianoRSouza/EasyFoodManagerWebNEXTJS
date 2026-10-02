# Fase 2 — Operação: plano de execução

**Objetivo:** migrar Dashboard, Produtos, Comandas, Transações, Unidades e Receitas com visual idêntico ao legado.

**Spec:** `docs/superpowers/specs/2026-09-26-migracao-nextjs-design.md` (§3 arquitetura, §5 UI, §6 mapa, §9 testes).

**Caminhos:** `NEXT` = `C:\Users\crist\Desktop\easyfoodmanagerNEXT`; `LEGACY` = `C:\Users\crist\Desktop\easyfoodmanagerWEB` (somente leitura, única referência visual); `REF` = `C:\Users\crist\Desktop\EASYCOMMAND REFATORADO` (somente leitura; fonte de domain/application/infrastructure, NUNCA de UI).

## Regras que valem para todos

- **Sem commits.** Nenhum agente faz `git commit`, `git merge` ou `git push`. Tudo fica pendente na árvore de trabalho para o usuário revisar.
- Visual idêntico ao LEGACY: o JSX e as classes Tailwind da tela do legado são copiados; só muda a origem dos dados.
- Cada módulo em `src/modules/<modulo>/{domain,application,infrastructure,ui}`. `domain`/`application` sem React, Next ou HTTP. `ui` nunca importa `infrastructure` diretamente — usa o hook do módulo (abaixo).
- Tenant obrigatório por construção: o repositório recebe `Tenant` no construtor; a UI obtém o repositório por `use<Modulo>Repository()`, que chama `useRequiredTenant()` (onda 0).
- Dados via TanStack Query (`useQuery` com `queryKey` incluindo `tenant.companyId`/`tenant.storeId`).
- HTTP só por `apiRequest` de `src/shared/http/api-client.ts` (caminho relativo a `/api/v1`), passando `tenant`.
- Contratos de endpoint: os MESMOS que o legado usa no modo LAN (`LEGACY/src/lib/admin-api-client.ts`) — são as rotas `/v1/*` da easyfoodmanagerAPI e da EasyFoodAPI. Em caso de dúvida, conferir em `C:\Users\crist\Desktop\easyfoodmanagerAPI\src\routes\v1\`.
- Identificadores em inglês; textos PT-BR copiados do legado. TS strict, sem `any`. Arquivo > ~300 linhas: dividir em componentes do módulo.
- Testes: domain/mappers com Vitest (reaproveitar os do REF adaptados) + ao menos um teste de componente por tela (carregando / vazio / erro / com dados).
- Removido do legado (não migrar): ramos Electron, mock (`mock-data`, `MockDatasetBanner`), `isCloudSupabaseMode`, Supabase direto.
- `npm install --legacy-peer-deps` já é padrão via `.npmrc`. Rodar vitest a partir de `/c/Users/...` (drive maiúsculo).

## Onda 0 — base compartilhada (1 agente, antes das telas)

1. Primitivas shadcn que faltam, copiadas do LEGACY como na Fase 1 (`"use client"` + imports reescritos): `badge`, `select`, `table`, `calendar`, `popover`. Dependências novas no `package.json` nas mesmas versões do legado (`@radix-ui/react-select`, `@radix-ui/react-popover`, `react-day-picker`, `date-fns`, `recharts`).
2. Componentes/utilitários compartilhados portados do LEGACY com JSX idêntico:
   - `src/shared/ui/PageRefreshButton.tsx` ← `components/PageRefreshButton.tsx`
   - `src/shared/ui/StatusBadge.tsx` ← `components/StatusBadge.tsx`
   - `src/shared/date-period/date-period-presets.ts` (+ teste) ← `lib/date-period-presets.ts`
   - `src/shared/date-period/DatePeriodPresetControls.tsx` ← `components/date-period/DatePeriodPresetControls.tsx`
   - `src/shared/ui/image-utils.ts` (+ teste) ← `lib/image-utils.ts`
3. `src/shared/tenant/use-required-tenant.ts`: `useRequiredTenant(): Tenant` (`{ companyId: string; storeId: string }`) a partir de `useTenant().selection`; lança erro se ausente (o layout já bloqueia o conteúdo sem loja). Teste.
4. `src/shared/plan/use-plan-history-window.ts`: `usePlanHistoryWindow()` → `{ planSlug, planName, historyWindowDays }`. Nuvem: `GET /billing/plan-window` (mesma forma do legado `cloud-api-billing.ts`); loja: sem limite (`historyWindowDays: null`, sem chamada). Teste.
5. Harness visual extensível sem arquivo compartilhado entre módulos:
   - `tests/visual/fake-api.ts` passa a carregar automaticamente todo `tests/visual/fixtures/*.ts` (cada um exporta `routes: Record<string, (req) => { status, body }>` por caminho `/v1/...`, válido para os dois modos).
   - `tests/visual/visual.spec.ts` passa a carregar automaticamente todo `tests/visual/scenarios/*.ts` (cada um exporta `scenarios: Scenario[]`); os 6 cenários da Fase 1 migram para `tests/visual/scenarios/fase-1.ts`. Exportar `login()` e o tipo `Scenario` de um arquivo comum.
   - Dados fixos (datas fixas, sem `Date.now()` nas respostas).

## Onda 1 — telas (6 agentes em paralelo, cada um só na sua pasta)

Cada agente toca APENAS: `src/modules/<modulo>/**`, `src/app/(panel)/<rota>/page.tsx`, `tests/visual/fixtures/<modulo>.ts`, `tests/visual/scenarios/<modulo>.ts`. Precisou de algo compartilhado novo? Crie dentro do próprio módulo e reporte.

| Agente | Módulo | Rota | Tela LEGACY | Base REF |
|---|---|---|---|---|
| A | dashboard | `/` (substitui o `page.tsx` vazio) | `pages/Dashboard.tsx` + `components/dashboard/DashboardCharts.tsx` | `modules/dashboard` |
| B | products | `/products` | `pages/Products.tsx` | `modules/products` |
| C | orders | `/orders` | `pages/Orders.tsx` | `modules/orders` |
| D | transactions | `/transactions` | `pages/Transactions.tsx` | `modules/transactions` |
| E | units | `/units` | `pages/Units.tsx` | `modules/units` |
| F | revenue | `/receitas` | `pages/ReceitasPage.tsx` + `components/receitas/ReceitasCharts.tsx` | `modules/revenue` |

Cada tela: página fina em `app/(panel)/<rota>/page.tsx` que renderiza `<XPage />` do módulo; cenário visual com a tela carregada (desktop+mobile) usando fixtures deterministas.

## Onda 2 — integração e verificação (controller + 1 agente)

`npm run typecheck`, `npm run lint` (0/0), `npm test`, `npm run build`, `npm run test:visual` (todos os cenários das Fases 1 e 2), revisão de cada módulo contra o legado, revisão final. Diferenças visuais são corrigidas no Next até igualar o legado. Nada é commitado.
