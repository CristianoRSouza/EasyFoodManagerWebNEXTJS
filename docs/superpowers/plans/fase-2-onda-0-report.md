# Fase 2 — Onda 0: base compartilhada (relatório)

Branch: `feat/fase-1-fundacao`. Nada commitado — tudo pendente na árvore de trabalho.

## 1. Dependências (`package.json`)

Adicionadas nas mesmas versões do legado (`easyfoodmanagerWEB/package.json`):

```json
"@radix-ui/react-popover": "^1.1.4",
"@radix-ui/react-select": "^2.1.4",
"date-fns": "^4.1.0",
"react-day-picker": "^9.4.4",
"recharts": "^2.15.0"
```

`npm install` rodado (0 vulnerabilidades). `package-lock.json` atualizado.

## 2. Primitivas shadcn novas (`src/shared/ui/primitives/`)

Copiadas byte-a-byte do legado (`easyfoodmanagerWEB/src/components/ui/*.tsx`), só com `"use client"`
adicionado (convenção já usada em todas as primitivas existentes) e `@/lib/utils` → `@/shared/ui/cn`,
`@/components/ui/button` → `@/shared/ui/primitives/button` (import interno do `calendar.tsx` para
`buttonVariants`):

- `badge.tsx` — exporta `Badge`, `badgeVariants` (variantes `default | secondary | destructive | outline`).
- `select.tsx` — exporta `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`,
  `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`.
- `table.tsx` — exporta `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`,
  `TableCell`, `TableCaption`.
- `calendar.tsx` — exporta `Calendar` (`CalendarProps = React.ComponentProps<typeof DayPicker>`).
- `popover.tsx` — exporta `Popover`, `PopoverTrigger`, `PopoverContent`.

Import: `@/shared/ui/primitives/<nome>` (sem barrel, igual às primitivas já existentes).
Estão cobertas pela isenção de lint já existente em `eslint.config.mjs` para
`src/shared/ui/primitives/**` ("copiados verbatim do legado").

## 3. Componentes/utilitários compartilhados (item 2 do plano)

### `src/shared/ui/PageRefreshButton.tsx`
Cópia idêntica do legado (só import de `Button` reescrito). `"use client"`.
```ts
type PageRefreshButtonProps = {
  onClick: () => void | Promise<unknown>;
  refreshing?: boolean; // se omitido, gerencia o spin internamente
};
export function PageRefreshButton(props: PageRefreshButtonProps): JSX.Element;
```

### `src/shared/ui/StatusBadge.tsx`
Cópia idêntica (import de `Badge`/`cn` reescrito). Sem `"use client"` (sem hooks).
```ts
export function StatusBadge({ status, className }: { status: string; className?: string }): JSX.Element;
```
Mapas `statusStyles`/`statusLabels` idênticos ao legado (mesmas chaves: `open`, `closed`, `cancelled`,
`sync_pending`, `fb_linked`, `approved`, `pix`, `cash`, etc. — ver arquivo para a lista completa).

### `src/shared/date-period/date-period-presets.ts` (+ `date-period-presets.test.ts`)
Cópia 100% idêntica do legado (é lógica pura, sem imports de React/HTTP). Exporta:
```ts
export type PeriodPreset = "all" | "today" | "7d" | "30d" | "semester" | "year" | "custom";
export function toYmdLocal(d: Date): string;
export function fromYmdLocal(ymd: string): Date | undefined;
export function fmtPtBrFromYmd(ymd: string): string;
export function computePeriodRange(period: Exclude<PeriodPreset, "custom">): { from: string; to: string };
export function ymdNextDayLocal(ymd: string): string;
export function ymdToLocalMidnightIso(ymd: string): string;
export function ymdNextDayLocalIso(ymd: string): string;
```
Teste migrado 1:1 do legado (`src/lib/__tests__/date-period-presets.test.ts`) — 15 casos, todos verdes.

### `src/shared/date-period/DatePeriodPresetControls.tsx`
Cópia idêntica (imports reescritos para os paths acima). `"use client"`.
```ts
export type DatePeriodPresetControlsProps = {
  period: PeriodPreset;
  onPeriodChange: (p: PeriodPreset) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (ymd: string) => void;
  onDateToChange: (ymd: string) => void;
  className?: string;
  selectTriggerClassName?: string; // default "w-full sm:w-[180px] h-9"
};
export function DatePeriodPresetControls(props: DatePeriodPresetControlsProps): JSX.Element;
```

### `src/shared/ui/image-utils.ts` (+ `image-utils.test.ts`) — ADAPTADO (não é cópia)
O original do legado (`src/lib/image-utils.ts`) decide a URL por `isCloudSupabaseMode()` +
`supabase.storage.from(...).getPublicUrl()` (Cloud) ou `loadDbConfig()`/Electron (LAN) — os três
removidos explicitamente desta migração ("Removido do legado: … `isCloudSupabaseMode`, Supabase
direto"; não há Electron no Next). Reescrito para o modelo de 2 backends do Next
(`useRuntime().backend`):

```ts
export function resolveProductImageUrl(params: {
  backend: "cloud" | "lan";
  apiDisplayOrigin: string; // "host:porta" do RuntimeInfo
  barcode: string;
  imageUrl?: string | null;
}): string;

/** Mesma resolução, lendo o backend ativo do RuntimeProvider. */
export function useProductImageUrl(barcode: string, imageUrl?: string | null): string;
```
- **cloud**: `imageUrl` já deve chegar como URL pública absoluta (a API resolve o Storage no
  servidor — o navegador nunca fala com Supabase Storage, ver `.claude/rules` do legado sobre não
  reintroduzir Supabase direto). Vazio ou placeholder legado (`^\.[a-z]+$`, ex.: `.jpg`) → `""`
  (sem request).
- **lan**: monta `http://{host}:3001/images/{barcode}.jpg` usando o host de `apiDisplayOrigin`
  (mesma porta fixa 3001 do servidor de imagens local do legado); `imageUrl` é ignorado (a imagem
  sempre vem do servidor local pelo código de barras, como no legado).
- **Atenção para os agentes de Products/Orders (Onda 1)**: se a API cloud real devolver
  `image_url` como caminho relativo (não absoluto) dentro do bucket `product-images`, este utilitário
  vai devolver esse caminho relativo tal qual — não fará mais sentido de request. Nesse caso ajustem
  `resolveProductImageUrl` (está isolado e testado) ou tratem a resolução do path completo na
  infraestrutura do módulo; não havia repositório da EasyFoodAPI disponível localmente para
  confirmar o formato exato do campo em modo nuvem.

## 4. `src/shared/tenant/use-required-tenant.ts` (+ teste)

```ts
export type Tenant = Selection; // = { companyId: string; storeId: string }
export function useRequiredTenant(): Tenant; // lança Error se useTenant().selection for null
```
Uso esperado pelos repositórios de módulo: `const tenant = useRequiredTenant();` dentro de um
`use<Modulo>Repository()` chamado só de UI que já está atrás do `StoreGate` (o layout bloqueia
conteúdo sem loja — o `throw` aqui é rede de segurança, não caminho esperado). Teste com
`useTenant` mockado (`vi.mock`), 2 casos: devolve a seleção; lança ao receber `selection: null`.

## 5. `src/shared/plan/use-plan-history-window.ts` (+ teste)

```ts
export interface PlanHistoryWindow {
  planSlug: string | null;
  planName: string | null;
  historyWindowDays: number | null; // null = sem limite
}
export function usePlanHistoryWindow(): UseQueryResult<PlanHistoryWindow>;
```
Uso: `const { data: planWindow } = usePlanHistoryWindow(); const days = planWindow?.historyWindowDays ?? null;`
(mesmo padrão de destructuring do legado `hooks/usePlanHistoryWindow.ts`).
- **cloud**: `GET /billing/plan-window` via `apiRequest<{ data: PlanHistoryWindow }>(...)`, com
  `tenant: selection` — mesmo envelope `{ data }` do legado `cloud-api-billing.ts`.
- **lan**: não chama a API; devolve `{ planSlug: null, planName: null, historyWindowDays: null }`
  direto no `queryFn` (`enabled` continua `true` mesmo sem tenant, já que LAN não depende dele).
- `queryKey: ["plan-history-window", backend, selection?.companyId ?? null]`.
- Nota para quem for usar em Orders/Transactions/Revenue: o repo irmão `EASYCOMMAND REFATORADO`
  (fonte de domain, nunca de UI) tem `src/shared/plan/plan-window.ts` com funções puras adicionais
  — `earliestAllowedDate`, `isOutsideWindow`, `clampToWindow` — para quando uma tela precisar
  recusar/encurtar um período fora da janela do plano. Não portei essas funções aqui porque o
  item 4 do plano pede só o hook; se mais de um módulo da Onda 1 precisar da mesma lógica de
  clamp, vale promover para `src/shared/plan/` num agente futuro em vez de duplicar por módulo.

## 6. Harness visual extensível (item 5 do plano)

### `tests/visual/scenario.ts` (novo — arquivo comum)
```ts
export const APPS: { lan: {legacy, next}; cloud: {legacy, next} }; // bases http://localhost:PORT
export type Mode = "lan" | "cloud";
export type Scenario = {
  name: string;
  mode: Mode;
  reach(page: Page, base: string): Promise<void>;
  region?(page: Page): ReturnType<Page["locator"]>; // recorte opcional da comparação
};
export async function login(page: Page, base: string, email: string): Promise<void>;
```

### `tests/visual/scenarios/*.ts` — autocarregados
`tests/visual/visual.spec.ts` lista `tests/visual/scenarios/*.ts` com `readdirSync` e importa cada
um dinamicamente (`import(pathToFileURL(...).href)` — necessário no Windows; `import()` direto com
path absoluto falha fora do POSIX). Cada arquivo exporta `scenarios: Scenario[]`. Os 6 cenários da
Fase 1 migraram para `tests/visual/scenarios/fase-1.ts` (mesmo comportamento, importando `login` e
`Scenario` de `../scenario`). **Exemplo mínimo para um módulo novo** (o que os agentes da Onda 1
vão escrever em `tests/visual/scenarios/products.ts`):
```ts
import { login, type Scenario } from "../scenario";

export const scenarios: Scenario[] = [
  { name: "products-lista", mode: "lan", reach: async (p, b) => {
    await login(p, b, "admin@local.dev");
    await p.goto(`${b}/products`);
    await p.getByRole("heading", { name: "Produtos" }).waitFor();
  } },
];
```
Arquivo não precisa ter `.spec.`/`.test.` no nome (não é pego como suíte própria pelo Playwright).

### `tests/visual/fixtures/*.ts` — autocarregados
`tests/visual/fake-api.ts` (script Node standalone, `--experimental-strip-types`, roda 2x por
`playwright.config.ts`: uma vez `lan` na porta 4999, outra `cloud` na porta 4998) agora expõe e
carrega:
```ts
export interface FixtureRequest {
  method: string;
  mode: "lan" | "cloud";
  query: URLSearchParams;
  body: Record<string, unknown>; // já decodificado; {} sem corpo/corpo não-JSON
}
export interface FixtureResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}
export type FixtureRoutes = Record<string, (req: FixtureRequest) => FixtureResponse | Promise<FixtureResponse>>;
```
Cada arquivo em `tests/visual/fixtures/<modulo>.ts` exporta `routes: FixtureRoutes` com chaves no
caminho CANÔNICO `/v1/...` — válido para os dois modos: o servidor traduz o prefixo real de cada
modo (`/api/v1` na nuvem, `/v1` na loja) antes de casar a chave, então a mesma fixture atende os
dois apps sem duplicar rota. **Exemplo mínimo**:
```ts
// tests/visual/fixtures/products.ts
import type { FixtureRoutes } from "../fake-api";

export const routes: FixtureRoutes = {
  "/v1/products": () => ({
    status: 200,
    body: { data: [{ id: "p1", name: "Coxinha", barcode: "789", price_cents: 850 }] },
  }),
};
```
Rotas de fixtures são checadas DEPOIS das rotas builtin existentes (`auth/login`, `auth/me`,
`me/context`, `me/all-stores`, `site-identity`) — essas continuam com o mesmo comportamento de
antes, intocado. Validado manualmente com uma fixture de fumaça (`GET /api/v1/smoke-test` em modo
cloud → `{"mode":"cloud","method":"GET"}`, removida antes da entrega).

Dados fixos: nenhum arquivo do harness usa `Date.now()`/`new Date()` sem seed — mantido para as
fixtures futuras seguirem o mesmo padrão (datas fixas nas respostas).

## Testes

- `npm run typecheck` — **limpo, 0 erros** (`tests/**/*.ts` está no `include` do `tsconfig.json`,
  então `fake-api.ts`/`scenario.ts`/`scenarios/*.ts` também foram checados).
- `npm run lint` — **limpo, 0 erros / 0 avisos** (`eslint src`; primitivas novas caem na isenção já
  existente para `src/shared/ui/primitives/**`).
- `npm test` (Vitest) — **31 arquivos, 166 testes, todos verdes** (30 são novos desta onda:
  15 em `date-period-presets.test.ts`, 7 em `image-utils.test.ts`, 2 em `use-required-tenant.test.ts`,
  3 em `use-plan-history-window.test.tsx` — nota: esse arquivo precisou ser `.tsx`, não `.ts`, por
  causa do JSX do wrapper de `QueryClientProvider`; nomeie assim se replicar o padrão).
- `npm run build` — sucesso (Next 16, Turbopack).
- `npm run test:visual` (Playwright) — **12/12 passaram** (6 cenários × desktop/mobile), incluindo
  os 6 cenários da Fase 1 agora carregados via `scenarios/fase-1.ts` pelo loader dinâmico.

## Arquivos criados
```
src/shared/ui/primitives/badge.tsx
src/shared/ui/primitives/select.tsx
src/shared/ui/primitives/table.tsx
src/shared/ui/primitives/calendar.tsx
src/shared/ui/primitives/popover.tsx
src/shared/ui/PageRefreshButton.tsx
src/shared/ui/StatusBadge.tsx
src/shared/ui/image-utils.ts
src/shared/ui/image-utils.test.ts
src/shared/date-period/date-period-presets.ts
src/shared/date-period/date-period-presets.test.ts
src/shared/date-period/DatePeriodPresetControls.tsx
src/shared/tenant/use-required-tenant.ts
src/shared/tenant/use-required-tenant.test.ts
src/shared/plan/use-plan-history-window.ts
src/shared/plan/use-plan-history-window.test.tsx
tests/visual/scenario.ts
tests/visual/scenarios/fase-1.ts
```

## Arquivos alterados
```
package.json               (+5 deps: @radix-ui/react-popover, @radix-ui/react-select, date-fns,
                             react-day-picker, recharts)
package-lock.json           (npm install)
tests/visual/fake-api.ts    (fixtures/*.ts autocarregadas; roteamento builtin intocado)
tests/visual/visual.spec.ts (scenarios/*.ts autocarregados; APPS/Scenario movidos para scenario.ts)
```

`tests/visual/fixtures/` foi criada vazia (nenhum módulo migrado ainda) — o loader trata a ausência
da pasta como "nenhuma fixture" (try/catch em `readdirSync`), então nada quebra até a Onda 1
começar a adicionar arquivos ali.

## Observação sobre arquivos não relacionados no working tree
`git status` (neste repo, NEXT) mostra outros untracked pré-existentes que não foram tocados por
este agente: `AGENTS.md`, `CLAUDE.md`, `docs/superpowers/plans/evidencias-api-real/`,
`docs/superpowers/plans/fase-2-brief-tela.md`, `docs/superpowers/plans/validacao-api-real.md`.
