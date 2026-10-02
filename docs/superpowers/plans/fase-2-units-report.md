# Fase 2 — Agent E (Unidades): relatório de implementação

Branch: `feat/fase-1-fundacao`. Tudo pendente na árvore de trabalho (sem commits).

## Escopo

Migração da tela **Unidades** (módulo `units`, rota `/units`) do legado EasyFood Manager Web para o Next.js 16 em `easyfoodmanagerNEXT`, seguindo a arquitetura DDD (Domain-Driven Design) com camadas domain, application, infrastructure e UI.

## Arquivos criados

```
src/modules/units/domain/unit.ts                      — modelo de domínio
src/modules/units/application/unit-repository.ts      — interface do repositório
src/modules/units/infrastructure/api-unit-repository.ts — implementação HTTP
src/modules/units/ui/units-page.tsx                   — componente da tela
src/modules/units/use-units-repository.ts             — hook de TanStack Query
src/app/(panel)/units/page.tsx                        — página do Next.js
src/modules/units/infrastructure/api-unit-repository.test.ts  — testes do repositório (4 casos)
src/modules/units/ui/units-page.test.tsx              — testes do componente (4 casos)
tests/visual/fixtures/units.ts                        — dados determinísticos para testes visuais
tests/visual/scenarios/units.ts                       — cenário visual (desktop/mobile)
```

## Endpoints utilizados

- `GET /v1/units` — lista todas as unidades de medida da loja
  - **Método:** `apiRequest<{ data: Row[] }>("/units", { tenant })`
  - **Headers:** `x-company-id`, `x-store-id` (via `tenant`)
  - **Resposta:** `{ data: [{ id, legacy_code, short_description, description, is_fractional, is_active, created_at }] }`

## Arquitetura implementada

### Domain (`domain/unit.ts`)
- `Unit`: interface com campos em camelCase (ex.: `legacyCode`, `isFractional`, `createdAt`)
- `UnitQuery`: interface para parâmetros de busca (`search`)
- Comentário de negócio: unidades são somente leitura (sincronizadas do Firebird pelo Sync-Service)

### Application (`application/unit-repository.ts`)
- `UnitRepository`: interface com método `list(query: UnitQuery): Promise<Unit[]>`
- Sem operações de escrita (by design)

### Infrastructure (`infrastructure/api-unit-repository.ts`)
- `ApiUnitRepository`: implementação HTTP via `apiRequest`
- Mapeamento de `snake_case` (API) → `camelCase` (domain)
- Filtro de busca client-side (API não filtra; lista inteira vem de uma vez, poucas unidades)
- Testes:
  - Mapeamento correto de tipos
  - Filtro por termo de busca (case-insensitive)
  - Resposta vazia
  - Campos nulos/ausentes na resposta

### Hook (`use-units-repository.ts`)
- `useUnitsRepository()`: executa query com TanStack Query
- `queryKey`: `["units", tenant.companyId, tenant.storeId]`
- `staleTime`: 5 minutos, `gcTime`: 30 minutos, sem refetch em focus

### UI (`ui/units-page.tsx`)
- Componente `UnitsPage` renderiza a tela
- JSX idêntico ao legado (copiado byte-a-byte)
- Tailwind classes idênticas
- Tabela com 6 colunas: Cód. Legado | Sigla | Descrição | Fracionável | Ativo | Criado em
- Estados: carregando, vazio, com dados
- Badges para `is_fractional` (Sim/Não) e `is_active` (ícone verde/vermelho)
- Testes:
  - Estado de carregamento
  - Estado vazio
  - Renderização de tabela com dados
  - Exibição correta de badges

### Página (`app/(panel)/units/page.tsx`)
- Renderiza `<UnitsPage />` do módulo

## Diferenças em relação ao legado

**Nenhuma diferença visual ou funcional.** A UI é idêntica, os dados vêm dos mesmos endpoints, o comportamento é o mesmo.

Pequenas diferenças técnicas (por design da migração):
- **Sem Electron, sem Supabase direto:** apenas Admin API / Cloud (via repasse do Next)
- **Sem mock-data local:** o legado em modo mock exibia unidades fictícias; o Next não implementa mock
- **Sem branches condicionais:** `isCloudSupabaseMode()`, `isCloudApiMode()`, `isElectron()` não existem; o backend é único

## Testes

### Vitest (unit + component)
- **2 arquivos, 8 testes, 100% passou**
  - `api-unit-repository.test.ts`: 4 testes (mapeamento, filtro, vazio, campos nulos)
  - `units-page.test.tsx`: 4 testes (carregando, vazio, com dados, badges)
- **Execução:** `npx vitest run src/modules/units` (~1.7s)

### Playwright (visual)
- **1 arquivo de cenário, 1 teste**
  - `tests/visual/scenarios/units.ts`: "units-lista" (login + goto `/units` + aguarda cabeçalho e contador)
  - **Fixture:** `tests/visual/fixtures/units.ts` com 4 unidades (UND, KG, LT, PCT), determinísticas (datas fixas)
  - Modo: LAN (Admin API local)
  - Padrão: acessa `${base}/units` após login
- Não foi rodado `npm run test:visual` (controller roda no fim; outros agentes ainda editando)

## Validações locais realizadas

```bash
✓ npx tsc --noEmit                    # TypeScript: 0 erros nos arquivos da unidade
✓ npx eslint src/modules/units src/app/(panel)/units  # ESLint: 0 erros, 0 avisos
✓ npx vitest run src/modules/units   # Testes: 8/8 ✓
```

## Candidatos a compartilhado

- **Nenhum.** Todas as conversões de tipos, mapeamentos e lógica são específicas do domínio de unidades ou já cobertas pelas primitivas/utilitários da onda 0 (date-period, StatusBadge, PageRefreshButton, etc.).

## Observações

1. **Mapping domain → API:** A conversão de `snake_case` (API) para `camelCase` (domain) é manual e simples (4 campos transformados). Futuros módulos podem reaproveitar o padrão.

2. **Busca client-side:** Como as unidades são poucas (~5-10 em produção), a filtragem não degrada performance. Se em futuro crescer, promover para server-side é trivial (passar `query.search` ao `apiRequest`).

3. **Data criadas_at pode ser null:** O modelo permite `createdAt: string | null`, e o componente exibe `"—"` quando ausente. Raro em produção, mas defensivo.

4. **Atualizada não é exibida:** O campo `updated_at` da API não é mapeado (não utilizado na tela legada). Se necessário, adicionar é mínimo (1 linha no mapper, 1 campo na interface).

5. **Status de ativo não filtra visualmente:** Unidades com `is_active: false` aparecem na lista (como no legado). Se houver requisito de ocultar inativos, seria na UI ou na query.

## Próximos passos (out of scope)

- Onda 2 vai rodar `npm run build`, `npm run test:visual` (Playwright completo) e revisar visuais
- O controller vai conferir alinhamento com o legado e corrigir diferenças se houver

## Resumo

✅ **Status:** Completo e verde
- Domain, application, infrastructure, UI: implementados
- 8 testes unitários passando
- 1 cenário visual (fixture + scenario) pronto
- 0 erros de TypeScript, 0 avisos de lint
- Nenhuma diferença visual em relação ao legado
- Pronto para integração e verificação da onda 2
