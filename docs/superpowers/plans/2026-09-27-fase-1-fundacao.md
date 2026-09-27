# Fase 1 — Fundação: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Projeto Next.js 16 que reproduz, pixel a pixel, o login, a redefinição de senha, o layout do painel (sidebar + header + seletor de loja) e a 404 do legado, com sessão guardada pelo servidor do Next e repasse para a EasyFoodAPI (`cloud`) ou a easyfoodmanagerAPI (`lan`).

**Architecture:** O navegador fala só com o Next. `src/server/` (só servidor) contém a configuração, os dois `SessionGateway` (cloud/lan) e o repasse `/api/v1/*`. `src/shared/` contém a UI copiada do legado, o cliente HTTP do navegador, sessão, tenant e layout. As telas de negócio (Fase 2+) entram em `src/modules/<feature>/`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5.9 strict, Tailwind CSS 3.4, Radix/shadcn (copiados do legado), TanStack Query 5, zod 3, Vitest 4 + Testing Library + jsdom, Playwright + pixelmatch.

**Spec:** `docs/superpowers/specs/2026-09-26-migracao-nextjs-design.md`

**Caminhos usados neste plano:**
- `NEXT` = `C:\Users\crist\Desktop\easyfoodmanagerNEXT` (este repositório)
- `LEGACY` = `C:\Users\crist\Desktop\easyfoodmanagerWEB` (referência visual — **a única**)

## Global Constraints

- **Referência visual é SEMPRE o legado (`LEGACY`). Nada de UI vem do EASYCOMMAND REFATORADO.**
- Visual idêntico: mesmas classes Tailwind, mesmos textos, mesmos ícones, mesmos tokens de `LEGACY/src/index.css`. Não criar tema claro nem tokens novos.
- Tailwind **3.4** (não v4). Fontes Sora (500–800) e Manrope (400–700) via `next/font/google`, auto-hospedadas (sem chamada ao Google em runtime, sem salto de layout); `--font-heading`/`--font-body` apontam para as famílias geradas.
- `BACKEND=cloud|lan` é lido **só no servidor**. Sem detecção por hostname, sem mock, sem Electron.
- Nenhum token de sessão acessível por JavaScript no navegador.
- Identificadores em inglês; textos de interface e mensagens em PT-BR (copiados do legado quando existirem).
- TypeScript `strict`, sem `any` explícito. Arquivo com mais de ~300 linhas é sinal para dividir.
- Versão exibida do produto continua `1.2.96` (`package.json`), como no legado.
- Supabase no navegador só em `src/shared/session/reset/password-recovery.ts`. Testes nunca chamam o Supabase real (o projeto de referência é PRODUÇÃO).
- Commits: mensagem em PT-BR, terminando com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Backend fora do ar no login** — espera-se a mensagem "URL da Admin API inacessível" (lan) ou "Não foi possível entrar agora." (cloud), nunca um 500 cru. Teste em Task 4 (`login` com `fetch` rejeitando) e Task 8 (formulário da loja).
2. **JWT expirado ainda no cookie** (`lan`) — `GET /api/session` deve devolver 401 e o repasse não deve chamar a API com token vencido. Teste em Task 4.
3. **Loja salva no navegador que não existe mais** (cloud) — a seleção salva é descartada e o seletor abre. Teste em Task 7 (`resolveSelection`).
4. **Resposta do backend que não é JSON** (HTML de proxy, 502) — vira `{ code: "http_502", message }` em PT-BR, sem quebrar o parse. Teste em Task 3.
5. **Download de arquivo pelo repasse** (XML/zip de NFC-e nas Fases 3+) — `content-type` e `content-disposition` precisam atravessar o repasse intactos. Teste em Task 4 (`CloudSessionGateway`, "repasse mantém content-type…").

---

## Estrutura de arquivos (Fase 1)

```
easyfoodmanagerNEXT/
├── package.json, tsconfig.json, next.config.ts, postcss.config.mjs, tailwind.config.ts
├── vitest.config.ts, vitest.setup.ts, eslint.config.mjs, .env.example, README.md
├── public/ favicon.ico, easysoft-logo.png
├── src/
│   ├── proxy.ts                               # redireciona quem não tem sessão
│   ├── app/
│   │   ├── layout.tsx, globals.css, providers.tsx
│   │   ├── login/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── (panel)/layout.tsx, page.tsx, not-found.tsx, [...missing]/page.tsx
│   │   └── api/
│   │       ├── session/route.ts, session/login/route.ts, session/logout/route.ts
│   │       ├── session/first-access/route.ts
│   │       └── v1/[...path]/route.ts
│   ├── server/
│   │   ├── config.ts
│   │   ├── backend/backend-url.ts, error-body.ts
│   │   └── session/cookies.ts, jwt-claims.ts, session-gateway.ts,
│   │       lan-session-gateway.ts, cloud-session-gateway.ts, gateway-factory.ts, to-response.ts
│   └── shared/
│       ├── ui/primitives/*.tsx   (shadcn copiados do legado)
│       ├── ui/cn.ts, use-mobile.tsx, use-toast.ts, use-auto-hide-scroll.ts
│       ├── version.ts
│       ├── runtime/runtime-context.tsx
│       ├── http/api-error.ts, api-client.ts, session-events.ts, query-client.ts
│       ├── session/session-client.ts, session-expired-listener.tsx
│       ├── session/login/*  (LoginPageShell, CloudLoginForm, LanLoginForm, BootstrapPasswordForm,
│       │                     PasswordResetDialog, login-messages.ts, remembered-email.ts)
│       ├── session/reset/ResetPasswordPage.tsx, password-recovery.ts
│       ├── tenant/tenant.ts, tenant-context.tsx
│       └── layout/AppLayout.tsx, AppSidebar.tsx, nav-items.ts, RuntimeModeBadge.tsx,
│                  HeaderStoreInfo.tsx, CompanySelectionModal.tsx, UserMenu.tsx,
│                  StoreGate.tsx, external-access.ts, ErrorBoundary.tsx, NotFound.tsx
└── tests/visual/  fake-api.ts, playwright.config.ts, visual.spec.ts, compare.ts
```

**Fora desta fase (vem nas próximas):** telas de negócio, `LicensePlanBadge` e aviso de licença no `HeaderStoreInfo`, `LicenseExpiredBanner`, `AIChatButton` (Fase 5), relatório automático de erros (Fase 5, via BFF — até lá o `ErrorBoundary` só registra no console).

---

### Task 1: Esqueleto do projeto, design system e harness de testes

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `eslint.config.mjs`, `.gitignore`, `src/app/globals.css`, `src/shared/version.ts`
- Test: `src/shared/version.test.ts`

**Interfaces:**
- Produces: alias `@/*` → `src/*`; `APP_VERSION_LABEL: string` em `@/shared/version`; scripts `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `test:visual`.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "easyfoodmanager-next",
  "version": "1.2.96",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:visual": "playwright test -c tests/visual/playwright.config.ts"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.4",
    "@radix-ui/react-tooltip": "^1.1.6",
    "@supabase/supabase-js": "^2.103.0",
    "@tanstack/react-query": "^5.62.11",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.469.0",
    "next": "^16.3.5",
    "next-themes": "^0.4.4",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "server-only": "^0.0.1",
    "sonner": "^1.7.2",
    "tailwind-merge": "^2.6.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@tailwindcss/typography": "^0.5.15",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.20.2",
    "@types/pngjs": "^6.0.5",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-next": "^16.3.5",
    "jsdom": "^25.0.1",
    "pixelmatch": "^6.0.0",
    "pngjs": "^7.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "^5.9.3",
    "vitest": "^4.1.11"
  }
}
```

- [ ] **Step 2: Configurações do TypeScript, Next, PostCSS e `.gitignore`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowJs": false,
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "src/**/*.ts", "src/**/*.tsx", "tests/**/*.ts", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts` (a versão vai para o bundle como texto; importar o `package.json` no cliente levaria a lista de dependências junto):
```ts
import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default nextConfig;
```

`postcss.config.mjs`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

`.gitignore`:
```
node_modules/
.next/
next-env.d.ts
.env
.env.*
!.env.example
coverage/
tests/visual/output/
test-results/
playwright-report/
```

- [ ] **Step 3: Tailwind — copiar o `theme` do legado sem alterar valores**

Criar `tailwind.config.ts` com o bloco `theme` **idêntico** ao de `LEGACY/tailwind.config.ts` (mesmo `container`, `extend.fontFamily`, `colors`, `borderRadius`, `backgroundImage`, `boxShadow`, `transitionTimingFunction`, `keyframes`, `animation`). Mudam só o cabeçalho, o `content` e os `plugins` (import ESM em vez de `require`):

```ts
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    /* COLAR AQUI o objeto `theme` de LEGACY/tailwind.config.ts, linhas `theme: {` até o `},` que fecha `extend` e `theme` — sem mudar nenhum valor */
  },
  plugins: [animate, typography],
} satisfies Config;
```

Para colar sem erro manual, rodar (Git Bash) e conferir o diff:
```bash
cd /c/Users/crist/Desktop/easyfoodmanagerNEXT
node -e "
const fs=require('fs');
const src=fs.readFileSync('../easyfoodmanagerWEB/tailwind.config.ts','utf8');
const start=src.indexOf('  theme: {');
const end=src.indexOf('  plugins:');
const theme=src.slice(start,end);
const out=fs.readFileSync('tailwind.config.ts','utf8').replace(/  theme: \{[\s\S]*?\n  \},\n  plugins/, theme+'  plugins');
fs.writeFileSync('tailwind.config.ts',out);
"
diff <(sed -n '/  theme: {/,/  plugins:/p' ../easyfoodmanagerWEB/tailwind.config.ts) <(sed -n '/  theme: {/,/  plugins:/p' tailwind.config.ts)
```
Expected: `diff` sem saída (theme idêntico).

- [ ] **Step 4: CSS global — cópia do legado**

```bash
cp ../easyfoodmanagerWEB/src/index.css src/app/globals.css
```
Depois, trocar só o comentário das duas primeiras linhas (o conteúdo CSS não muda) para:
```css
/* As fontes são carregadas no <head> do layout raiz (preconnect + link), não por @import:
   o @import serializa o pedido atrás do download e parse deste arquivo. */
```
E o comentário do cabeçalho `Adaptado para o stack desta app (React + Vite + Tailwind v3 + Electron).` para `Copiado do EasyFood Manager legado sem alteração de valores.`

As fontes passam a vir do `next/font` (Task 6, `layout.tsx`), que expõe as famílias em `--font-sora` e `--font-manrope`. Trocar só as duas declarações de família (mesma ordem de fallback do legado):
```css
    --font-heading: var(--font-sora), var(--font-manrope), system-ui, sans-serif;
    --font-body: var(--font-manrope), system-ui, sans-serif;
```

Conferir que só comentários e essas duas linhas mudaram:
```bash
diff <(grep -v '^\s*/\*\|^\s*\*\|^\s*Adaptado\|^\s*o @import\|--font-heading\|--font-body' ../easyfoodmanagerWEB/src/index.css) <(grep -v '^\s*/\*\|^\s*\*\|^\s*Copiado\|^\s*o @import\|--font-heading\|--font-body' src/app/globals.css)
```
Expected: sem saída.

- [ ] **Step 5: Vitest e ESLint**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { version } from "./package.json";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: { NEXT_PUBLIC_APP_VERSION: version },
    // Importar módulos grandes dentro do `it` conta no tempo do teste; com todos os
    // workers disputando CPU, os 5s padrão estouram sem que nada esteja errado.
    testTimeout: 20_000,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

`vitest.setup.ts` (o jsdom não tem `matchMedia`, usado pelo `useIsMobile` da sidebar):
```ts
import "@testing-library/jest-dom/vitest";

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
```

`eslint.config.mjs` (regra de camadas: o código do navegador nunca importa `src/server`; domínio/aplicação também não conhecem React, Next nem HTTP). **A ordem importa:** no flat config o último bloco que casa um arquivo substitui a configuração da regra, então o bloco mais restrito (domínio) vem por último e repete `@/server/*`.
```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "tests/visual/output/**", "next-env.d.ts"]),
  {
    files: ["src/shared/**", "src/modules/**", "src/app/**/*.tsx"],
    ignores: ["src/app/**/page.tsx", "src/app/**/layout.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["@/server/*"] }],
    },
  },
  {
    files: ["src/modules/*/domain/**", "src/modules/*/application/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: ["react", "react-dom", "next", "next/*", "@/server/*", "@/shared/http/*", "../infrastructure/*", "../ui/*"],
      }],
    },
  },
]);
```

- [ ] **Step 6: Escrever o teste da versão (falha)**

`src/shared/version.test.ts`:
```ts
import { formatVersionLabel, APP_VERSION_LABEL } from "./version";

describe("formatVersionLabel", () => {
  it("preenche o patch com dois dígitos, como no legado", () => {
    expect(formatVersionLabel("1.2.5")).toBe("1.2.05");
    expect(formatVersionLabel("1.2.96")).toBe("1.2.96");
  });

  it("devolve a versão sem mexer quando não é x.y.z", () => {
    expect(formatVersionLabel("1.2.96-beta")).toBe("1.2.96-beta");
  });

  it("usa a versão do package.json (injetada pelo next.config/vitest.config)", () => {
    expect(APP_VERSION_LABEL).toBe("1.2.96");
  });
});
```

- [ ] **Step 7: Instalar e rodar para ver falhar**

```bash
cd /c/Users/crist/Desktop/easyfoodmanagerNEXT && npm install && npx vitest run src/shared/version.test.ts
```
Expected: FAIL — `Cannot find module './version'`.

- [ ] **Step 8: Implementar `src/shared/version.ts`**

```ts
/** `1.2.5` → `1.2.05`: o formato que o painel sempre exibiu. */
export function formatVersionLabel(version: string): string {
  return version.replace(
    /^(\d+)\.(\d+)\.(\d+)$/,
    (_match, major: string, minor: string, patch: string) =>
      `${major}.${minor}.${String(Number(patch)).padStart(2, "0")}`,
  );
}

/** `NEXT_PUBLIC_APP_VERSION` vem do `package.json`, pelo `next.config.ts` (e pelo `vitest.config.ts` nos testes). */
export const APP_VERSION_LABEL = formatVersionLabel(process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0");
```

- [ ] **Step 9: Rodar os testes**

Run: `npx vitest run src/shared/version.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: esqueleto Next.js 16 com o design system do legado

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Primitivas de UI copiadas do legado

**Files:**
- Create: `src/shared/ui/primitives/{button,input,label,tabs,dialog,dropdown-menu,sidebar,sheet,separator,skeleton,tooltip,card,scroll-area,toast,toaster,sonner}.tsx`
- Create: `src/shared/ui/cn.ts`, `src/shared/ui/use-mobile.tsx`, `src/shared/ui/use-toast.ts`, `src/shared/ui/use-auto-hide-scroll.ts`
- Create: `public/favicon.ico`, `public/easysoft-logo.png`
- Test: `src/shared/ui/primitives/primitives.test.tsx`

**Interfaces:**
- Produces: os mesmos exports dos arquivos do legado (`Button`, `buttonVariants`, `Input`, `Label`, `Tabs*`, `Dialog*` com `hideClose`, `DropdownMenu*`, `Sidebar*`/`useSidebar`/`SidebarProvider`, `Tooltip*`, `Card*`, `ScrollArea`, `Toaster`, `Toaster as Sonner` em `sonner.tsx`), `cn()`, `useIsMobile()`, `useToast()`/`toast()`, `useAutoHideScroll()`.

- [ ] **Step 1: Escrever o teste (falha)**

`src/shared/ui/primitives/primitives.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "./button";
import { cn } from "../cn";

describe("primitivas copiadas do legado", () => {
  it("Button mantém as classes do legado", () => {
    render(<Button>Entrar</Button>);
    const button = screen.getByRole("button", { name: "Entrar" });
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("h-10");
  });

  it("cn resolve conflito de classes Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/shared/ui/primitives/primitives.test.tsx`
Expected: FAIL — `Cannot find module './button'`.

- [ ] **Step 3: Copiar os arquivos e ajustar os imports**

```bash
cd /c/Users/crist/Desktop/easyfoodmanagerNEXT
L=../easyfoodmanagerWEB
mkdir -p src/shared/ui/primitives public
for c in button input label tabs dialog dropdown-menu sidebar sheet separator skeleton tooltip card scroll-area toast toaster sonner; do
  cp "$L/src/components/ui/$c.tsx" "src/shared/ui/primitives/$c.tsx"
done
cp "$L/src/lib/utils.ts" src/shared/ui/cn.ts
cp "$L/src/hooks/use-mobile.tsx" src/shared/ui/use-mobile.tsx
cp "$L/src/hooks/use-toast.ts" src/shared/ui/use-toast.ts
cp "$L/src/hooks/useAutoHideScroll.ts" src/shared/ui/use-auto-hide-scroll.ts
cp "$L/public/favicon.ico" public/favicon.ico
cp "$L/src/assets/easysoft-logo.png" public/easysoft-logo.png
sed -i \
  -e 's#@/components/ui/#@/shared/ui/primitives/#g' \
  -e 's#@/lib/utils#@/shared/ui/cn#g' \
  -e 's#@/hooks/use-mobile#@/shared/ui/use-mobile#g' \
  -e 's#@/hooks/use-toast#@/shared/ui/use-toast#g' \
  src/shared/ui/primitives/*.tsx src/shared/ui/*.ts src/shared/ui/*.tsx
# Radix precisa rodar no cliente: marca cada arquivo que ainda não tem a diretiva.
for f in src/shared/ui/primitives/*.tsx src/shared/ui/use-mobile.tsx src/shared/ui/use-toast.ts src/shared/ui/use-auto-hide-scroll.ts; do
  head -1 "$f" | grep -q '"use client"' || sed -i '1i "use client";\n' "$f"
done
grep -rn "@/components\|@/lib\|@/hooks" src/shared/ui || echo "imports ok"
```
Expected: última linha `imports ok`.

Nenhuma classe ou marcação desses arquivos é alterada: eles são a fonte do visual.

- [ ] **Step 4: Rodar teste e typecheck**

Run: `npx vitest run src/shared/ui && npx tsc --noEmit`
Expected: PASS; `tsc` sem erros.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): primitivas shadcn copiadas do legado sem alteração visual

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Configuração do servidor e normalização de erros do backend

**Files:**
- Create: `src/server/config.ts`, `src/server/backend/backend-url.ts`, `src/server/backend/error-body.ts`, `.env.example`
- Test: `src/server/config.test.ts`, `src/server/backend/backend-url.test.ts`, `src/server/backend/error-body.test.ts`

**Interfaces:**
- Produces:
  - `type Backend = "cloud" | "lan"`
  - `interface ServerConfig { backend: Backend; apiUrl: string; apiDisplayOrigin: string; adminPlatformUrl: string; secureCookies: boolean }`
  - `readServerConfig(env?: NodeJS.ProcessEnv): ServerConfig` (lança `Error` com mensagem PT-BR se inválido)
  - `backendUrl(config: ServerConfig, path: string, search?: string): string` — `path` começa com `/v1/`
  - `interface ApiErrorBody { code: string; message: string }`
  - `toErrorBody(status: number, raw: unknown): ApiErrorBody`
  - `parseJsonSafely(text: string): unknown`

- [ ] **Step 1: Escrever os testes (falham)**

`src/server/config.test.ts`:
```ts
// @vitest-environment node
import { readServerConfig } from "./config";

describe("readServerConfig", () => {
  it("lê o modo loja com a origem exibida no badge", () => {
    const config = readServerConfig({ BACKEND: "lan", EASYFOOD_API_URL: "http://127.0.0.1:4080/", NODE_ENV: "development" });
    expect(config).toEqual({
      backend: "lan",
      apiUrl: "http://127.0.0.1:4080",
      apiDisplayOrigin: "127.0.0.1:4080",
      adminPlatformUrl: "https://billing.easysoftcloud.com.br",
      secureCookies: false,
    });
  });

  it("usa cookie Secure em produção", () => {
    const config = readServerConfig({ BACKEND: "cloud", EASYFOOD_API_URL: "https://api.exemplo.com", NODE_ENV: "production" });
    expect(config.secureCookies).toBe(true);
  });

  it("aceita o endereço do EasyBilling configurado, sem barra final", () => {
    const config = readServerConfig({
      BACKEND: "cloud",
      EASYFOOD_API_URL: "http://localhost:3010",
      NEXT_PUBLIC_ADMIN_PLATFORM_URL: "https://billing.homolog.com/",
    });
    expect(config.adminPlatformUrl).toBe("https://billing.homolog.com");
  });

  it("recusa BACKEND ausente ou desconhecido com mensagem clara", () => {
    expect(() => readServerConfig({ EASYFOOD_API_URL: "http://x" })).toThrow(/BACKEND/);
    expect(() => readServerConfig({ BACKEND: "electron", EASYFOOD_API_URL: "http://x" })).toThrow(/BACKEND/);
  });

  it("recusa EASYFOOD_API_URL inválida", () => {
    expect(() => readServerConfig({ BACKEND: "lan", EASYFOOD_API_URL: "localhost" })).toThrow(/EASYFOOD_API_URL/);
  });
});
```

`src/server/backend/backend-url.test.ts`:
```ts
// @vitest-environment node
import { backendUrl } from "./backend-url";
import type { ServerConfig } from "../config";

const base: Omit<ServerConfig, "backend"> = {
  apiUrl: "http://127.0.0.1:4080",
  apiDisplayOrigin: "127.0.0.1:4080",
  adminPlatformUrl: "https://billing.easysoftcloud.com.br",
  secureCookies: false,
};

describe("backendUrl", () => {
  it("modo loja: a API responde em /v1", () => {
    expect(backendUrl({ ...base, backend: "lan" }, "/v1/products", "?page=1")).toBe("http://127.0.0.1:4080/v1/products?page=1");
  });

  it("modo nuvem: a EasyFoodAPI responde sob /api/v1", () => {
    expect(backendUrl({ ...base, backend: "cloud" }, "/v1/me/stores")).toBe("http://127.0.0.1:4080/api/v1/me/stores");
  });
});
```

`src/server/backend/error-body.test.ts`:
```ts
// @vitest-environment node
import { parseJsonSafely, toErrorBody } from "./error-body";

describe("toErrorBody", () => {
  it("formato da easyfoodmanagerAPI: texto em `error`, código em `error_code`", () => {
    expect(toErrorBody(401, { error: "Senha inválida.", error_code: "invalid_credentials" }))
      .toEqual({ code: "invalid_credentials", message: "Senha inválida." });
  });

  it("formato da EasyFoodAPI: código em `error`, texto em `message`", () => {
    expect(toErrorBody(403, { error: "tenant_forbidden", message: "Sem acesso." }))
      .toEqual({ code: "tenant_forbidden", message: "Sem acesso." });
  });

  it("corpo que não é objeto vira código http_<status> com mensagem em PT-BR", () => {
    expect(toErrorBody(502, null)).toEqual({ code: "http_502", message: "Falha na requisição (HTTP 502)." });
  });

  it("503 sem mensagem usa o texto de serviço indisponível", () => {
    expect(toErrorBody(503, {})).toEqual({ code: "http_503", message: "Serviço temporariamente indisponível. Tente novamente." });
  });
});

describe("parseJsonSafely", () => {
  it("devolve null para HTML de proxy em vez de lançar", () => {
    expect(parseJsonSafely("<html>Bad Gateway</html>")).toBeNull();
    expect(parseJsonSafely("")).toBeNull();
    expect(parseJsonSafely('{"a":1}')).toEqual({ a: 1 });
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/server`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar**

`src/server/config.ts`:
```ts
import "server-only";
import { z } from "zod";

export type Backend = "cloud" | "lan";

export interface ServerConfig {
  backend: Backend;
  /** Sem barra final. */
  apiUrl: string;
  /** `host:porta`, exibido no badge de modo do cabeçalho. */
  apiDisplayOrigin: string;
  /** Base do EasyBilling (Planos e Créditos IA). */
  adminPlatformUrl: string;
  secureCookies: boolean;
}

const DEFAULT_ADMIN_PLATFORM_URL = "https://billing.easysoftcloud.com.br";

const schema = z.object({
  BACKEND: z.enum(["cloud", "lan"], {
    errorMap: () => ({ message: 'BACKEND deve ser "cloud" ou "lan".' }),
  }),
  EASYFOOD_API_URL: z.string().url({ message: "EASYFOOD_API_URL deve ser uma URL (ex.: http://127.0.0.1:4080)." }),
  NEXT_PUBLIC_ADMIN_PLATFORM_URL: z.string().url().optional(),
  NODE_ENV: z.string().optional(),
});

const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, "");

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Configuração inválida do servidor — ${problems.join("; ")}`);
  }
  const apiUrl = withoutTrailingSlash(parsed.data.EASYFOOD_API_URL);
  return {
    backend: parsed.data.BACKEND,
    apiUrl,
    apiDisplayOrigin: new URL(apiUrl).host,
    adminPlatformUrl: withoutTrailingSlash(parsed.data.NEXT_PUBLIC_ADMIN_PLATFORM_URL ?? DEFAULT_ADMIN_PLATFORM_URL),
    secureCookies: parsed.data.NODE_ENV === "production",
  };
}
```

`server-only` (já no `package.json`) faz o build falhar se um arquivo de servidor for parar no bundle do navegador. Em teste ele precisa de alias vazio — adicionar ao `vitest.config.ts`, em `resolve.alias`:
```ts
"server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
```
e criar `src/test/server-only-stub.ts` com o conteúdo:
```ts
export {};
```

`src/server/backend/backend-url.ts`:
```ts
import "server-only";
import type { ServerConfig } from "../config";

/** A easyfoodmanagerAPI responde em `/v1`; a EasyFoodAPI, em `/api/v1`. */
export function backendUrl(config: ServerConfig, path: string, search = ""): string {
  const prefix = config.backend === "cloud" ? "/api" : "";
  return `${config.apiUrl}${prefix}${path}${search}`;
}
```

`src/server/backend/error-body.ts`:
```ts
import "server-only";

export interface ApiErrorBody {
  code: string;
  message: string;
}

export function parseJsonSafely(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const asText = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

function fallbackMessage(status: number): string {
  return status === 503
    ? "Serviço temporariamente indisponível. Tente novamente."
    : `Falha na requisição (HTTP ${status}).`;
}

/**
 * Os dois backends erram em formatos diferentes:
 * - easyfoodmanagerAPI: `{ error: "<texto>", error_code: "<código>" }`
 * - EasyFoodAPI:        `{ error: "<código>", message: "<texto>" }`
 * O navegador recebe sempre `{ code, message }`.
 */
export function toErrorBody(status: number, raw: unknown): ApiErrorBody {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const errorCode = asText(body.error_code);
  if (errorCode) {
    return { code: errorCode, message: asText(body.message) ?? asText(body.error) ?? fallbackMessage(status) };
  }
  return {
    code: asText(body.error) ?? `http_${status}`,
    message: asText(body.message) ?? fallbackMessage(status),
  };
}
```

`.env.example`:
```
# Qual backend este painel usa: "cloud" (EasyFoodAPI) ou "lan" (easyfoodmanagerAPI da loja).
BACKEND=lan

# Endereço do backend, sem barra final.
#   lan:   http://127.0.0.1:4080
#   cloud: http://localhost:3010
EASYFOOD_API_URL=http://127.0.0.1:4080

# Opcional: EasyBilling (Planos e Créditos IA). Padrão: https://billing.easysoftcloud.com.br
# NEXT_PUBLIC_ADMIN_PLATFORM_URL=

# Só a tela de redefinição de senha fala com o Supabase (o link do e-mail é dele).
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run src/server`
Expected: PASS (11 testes).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(server): configuração validada e erro único dos dois backends

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `SessionGateway` — contrato, modo loja e modo nuvem

**Files:**
- Create: `src/server/session/cookies.ts`, `src/server/session/jwt-claims.ts`, `src/server/session/session-gateway.ts`, `src/server/session/json-response.ts`, `src/server/session/lan-session-gateway.ts`, `src/server/session/cloud-session-gateway.ts`, `src/server/session/gateway-factory.ts`
- Test: `src/server/session/cookies.test.ts`, `src/server/session/jwt-claims.test.ts`, `src/server/session/lan-session-gateway.test.ts`, `src/server/session/cloud-session-gateway.test.ts`

**Interfaces:**
- Consumes: `ServerConfig`, `backendUrl`, `toErrorBody`, `parseJsonSafely`, `ApiErrorBody` (Task 3).
- Produces:
  - `interface SessionUser { id: string; email: string | null }`
  - `interface Credentials { email: string; password: string }`
  - `interface FirstAccessInput { email: string; newPassword: string; provisioningCode?: string }`
  - `type GatewayResult<T> = { ok: true; data: T; setCookies: string[] } | { ok: false; status: number; error: ApiErrorBody; setCookies: string[] }`
  - `interface ForwardRequest { method: string; path: string; search: string; headers: Headers; body: ArrayBuffer | null; cookieHeader: string | null }`
  - `interface SessionGateway { login(c: Credentials): Promise<GatewayResult<SessionUser>>; currentUser(cookieHeader: string | null): Promise<SessionUser | null>; logout(cookieHeader: string | null): Promise<string[]>; firstAccess(input: FirstAccessInput): Promise<GatewayResult<null>>; forward(req: ForwardRequest): Promise<Response> }`
  - `createSessionGateway(config: ServerConfig, fetchFn?: typeof fetch): SessionGateway`
  - `LAN_SESSION_COOKIE = "efm_session"`, `readCookie(header, name)`, `sessionCookie(token, maxAgeSec, secure)`, `expiredSessionCookie(secure)`
  - `readClaims(token: string, nowSec: number): { sub: string; email: string } | null`

- [ ] **Step 1: Testes de cookie e claims (falham)**

`src/server/session/cookies.test.ts`:
```ts
// @vitest-environment node
import { LAN_SESSION_COOKIE, expiredSessionCookie, readCookie, sessionCookie } from "./cookies";

describe("cookies de sessão", () => {
  it("lê um cookie entre vários", () => {
    expect(readCookie("a=1; efm_session=abc%2E1; b=2", LAN_SESSION_COOKIE)).toBe("abc.1");
    expect(readCookie(null, LAN_SESSION_COOKIE)).toBeNull();
    expect(readCookie("outro=1", LAN_SESSION_COOKIE)).toBeNull();
  });

  it("grava httpOnly, SameSite=Lax, com validade e Secure quando pedido", () => {
    expect(sessionCookie("tok", 28800, true)).toBe(
      "efm_session=tok; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800; Secure",
    );
    expect(sessionCookie("tok", 60, false)).not.toContain("Secure");
  });

  it("apagar é gravar vazio com Max-Age=0", () => {
    expect(expiredSessionCookie(false)).toBe("efm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  });
});
```

`src/server/session/jwt-claims.test.ts`:
```ts
// @vitest-environment node
import { readClaims } from "./jwt-claims";

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = (payload: object) => `${encode({ alg: "HS256" })}.${encode(payload)}.assinatura`;

describe("readClaims", () => {
  it("lê sub e email de um token válido no tempo", () => {
    expect(readClaims(token({ sub: "u1", email: "a@b.com", exp: 2000 }), 1000)).toEqual({ sub: "u1", email: "a@b.com" });
  });

  it("token vencido não serve", () => {
    expect(readClaims(token({ sub: "u1", email: "a@b.com", exp: 999 }), 1000)).toBeNull();
  });

  it("token malformado não serve", () => {
    expect(readClaims("lixo", 1000)).toBeNull();
    expect(readClaims(token({ email: "a@b.com", exp: 2000 }), 1000)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/server/session`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar cookies, claims e o contrato**

`src/server/session/cookies.ts`:
```ts
import "server-only";

export const LAN_SESSION_COOKIE = "efm_session";

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function serialize(value: string, maxAgeSec: number, secure: boolean): string {
  const attributes = [`${LAN_SESSION_COOKIE}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSec}`];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export const sessionCookie = (token: string, maxAgeSec: number, secure: boolean) =>
  serialize(encodeURIComponent(token), maxAgeSec, secure);

export const expiredSessionCookie = (secure: boolean) => serialize("", 0, secure);
```

`src/server/session/jwt-claims.ts`:
```ts
import "server-only";

/**
 * Lê as claims SEM validar a assinatura — serve só para exibir quem está logado.
 * Quem valida o token é a API, em toda chamada repassada.
 */
export function readClaims(token: string, nowSec: number): { sub: string; email: string } | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof claims.sub !== "string" || typeof claims.email !== "string") return null;
    if (typeof claims.exp === "number" && claims.exp <= nowSec) return null;
    return { sub: claims.sub, email: claims.email };
  } catch {
    return null;
  }
}
```

`src/server/session/session-gateway.ts`:
```ts
import "server-only";
import type { ApiErrorBody } from "../backend/error-body";

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface FirstAccessInput {
  email: string;
  newPassword: string;
  provisioningCode?: string;
}

export type GatewayResult<T> =
  | { ok: true; data: T; setCookies: string[] }
  | { ok: false; status: number; error: ApiErrorBody; setCookies: string[] };

export interface ForwardRequest {
  method: string;
  /** Sempre começa com `/v1/`. */
  path: string;
  /** `?a=1` ou vazio. */
  search: string;
  headers: Headers;
  body: ArrayBuffer | null;
  cookieHeader: string | null;
}

/** Tudo que muda entre os dois backends, e nada além disso. */
export interface SessionGateway {
  login(credentials: Credentials): Promise<GatewayResult<SessionUser>>;
  currentUser(cookieHeader: string | null): Promise<SessionUser | null>;
  /** Devolve os `Set-Cookie` que encerram a sessão no navegador. */
  logout(cookieHeader: string | null): Promise<string[]>;
  firstAccess(input: FirstAccessInput): Promise<GatewayResult<null>>;
  forward(request: ForwardRequest): Promise<Response>;
}

export const UNREACHABLE_CODE = "backend_unreachable";

/** Cabeçalhos de pedido que atravessam o repasse. Autenticação é posta pelo gateway. */
export const FORWARDED_REQUEST_HEADERS = ["accept", "content-type"] as const;
export const TENANT_HEADERS = ["x-company-id", "x-store-id"] as const;
/** Cabeçalhos de resposta que voltam ao navegador (downloads incluídos). */
export const FORWARDED_RESPONSE_HEADERS = ["content-type", "content-disposition", "cache-control"] as const;
```

`src/server/session/json-response.ts` (usado pelos dois gateways):
```ts
import "server-only";
import type { ApiErrorBody } from "../backend/error-body";

export const SESSION_EXPIRED: ApiErrorBody = { code: "unauthenticated", message: "Sua sessão expirou. Entre de novo." };

export function jsonResponse(status: number, body: unknown, setCookies: string[] = []): Response {
  const headers = new Headers({ "content-type": "application/json" });
  for (const cookie of setCookies) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

/** Copia só os cabeçalhos de resposta permitidos (nada de autenticação do backend). */
export function pickHeaders(source: Headers, names: readonly string[]): Headers {
  const picked = new Headers();
  for (const name of names) {
    const value = source.get(name);
    if (value) picked.set(name, value);
  }
  return picked;
}
```

- [ ] **Step 4: Testes do gateway de loja (falham)**

`src/server/session/lan-session-gateway.test.ts`:
```ts
// @vitest-environment node
import { LanSessionGateway } from "./lan-session-gateway";
import type { ServerConfig } from "../config";

const config: ServerConfig = {
  backend: "lan",
  apiUrl: "http://api.loja",
  apiDisplayOrigin: "api.loja",
  adminPlatformUrl: "https://billing.easysoftcloud.com.br",
  secureCookies: false,
};
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const farFuture = Math.floor(Date.now() / 1000) + 3600;
const jwt = `${encode({ alg: "HS256" })}.${encode({ sub: "u1", email: "a@loja.dev", exp: farFuture })}.sig`;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("LanSessionGateway", () => {
  it("login guarda o JWT num cookie httpOnly e devolve o usuário", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { access_token: jwt, token_type: "Bearer", expires_in: 28800 }));
    const result = await new LanSessionGateway(config, fetchFn).login({ email: "a@loja.dev", password: "x" });

    expect(fetchFn).toHaveBeenCalledWith("http://api.loja/v1/auth/login", expect.objectContaining({ method: "POST" }));
    expect(result).toEqual({
      ok: true,
      data: { id: "u1", email: "a@loja.dev" },
      setCookies: [`efm_session=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`],
    });
  });

  it("login recusado devolve o erro normalizado sem cookie", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(401, { error: "Senha local ainda não definida.", error_code: "local_password_not_set" }));
    const result = await new LanSessionGateway(config, fetchFn).login({ email: "a@loja.dev", password: "x" });
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: { code: "local_password_not_set", message: "Senha local ainda não definida." },
      setCookies: [],
    });
  });

  it("API fora do ar vira 503 backend_unreachable com mensagem em PT-BR", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const result = await new LanSessionGateway(config, fetchFn).login({ email: "a@loja.dev", password: "x" });
    expect(result).toMatchObject({
      ok: false,
      status: 503,
      error: { code: "backend_unreachable", message: "Não foi possível contactar api.loja. Verifique o serviço e tente novamente." },
    });
  });

  it("currentUser lê o cookie; token vencido não é sessão", async () => {
    const gateway = new LanSessionGateway(config, vi.fn());
    expect(await gateway.currentUser(`efm_session=${jwt}`)).toEqual({ id: "u1", email: "a@loja.dev" });
    const expired = `${encode({ alg: "HS256" })}.${encode({ sub: "u1", email: "a", exp: 1 })}.sig`;
    expect(await gateway.currentUser(`efm_session=${expired}`)).toBeNull();
    expect(await gateway.currentUser(null)).toBeNull();
  });

  it("logout apaga o cookie sem chamar a API", async () => {
    const fetchFn = vi.fn();
    expect(await new LanSessionGateway(config, fetchFn).logout(`efm_session=${jwt}`)).toEqual([
      "efm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
    ]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("primeiro acesso envia o corpo no formato da API", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { ok: true }));
    const result = await new LanSessionGateway(config, fetchFn).firstAccess({
      email: "a@loja.dev",
      newPassword: "segredo1",
      provisioningCode: "COD",
    });
    expect(result).toEqual({ ok: true, data: null, setCookies: [] });
    const [, init] = fetchFn.mock.calls[0]!;
    expect(JSON.parse(init.body)).toEqual({ email: "a@loja.dev", new_password: "segredo1", provisioning_code: "COD" });
  });

  it("repasse troca o cookie por Bearer e não repassa cabeçalhos de tenant", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, [{ id: "p1" }]));
    const headers = new Headers({ accept: "application/json", "x-company-id": "c1", "x-store-id": "s1", cookie: "outro=1" });
    const response = await new LanSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/products", search: "?page=1", headers, body: null, cookieHeader: `efm_session=${jwt}`,
    });

    const [url, init] = fetchFn.mock.calls[0]!;
    const sent = new Headers(init.headers);
    expect(url).toBe("http://api.loja/v1/products?page=1");
    expect(sent.get("authorization")).toBe(`Bearer ${jwt}`);
    expect(sent.get("x-company-id")).toBeNull();
    expect(sent.get("cookie")).toBeNull();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ id: "p1" }]);
  });

  it("repasse sem sessão responde 401 sem chamar a API", async () => {
    const fetchFn = vi.fn();
    const response = await new LanSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/products", search: "", headers: new Headers(), body: null, cookieHeader: null,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "unauthenticated", message: "Sua sessão expirou. Entre de novo." });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("401 da API no repasse apaga o cookie", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(401, { error: "Token inválido.", error_code: "invalid_token" }));
    const response = await new LanSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/products", search: "", headers: new Headers(), body: null, cookieHeader: `efm_session=${jwt}`,
    });
    expect(response.status).toBe(401);
    expect(response.headers.getSetCookie()).toEqual(["efm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"]);
    expect(await response.json()).toEqual({ code: "invalid_token", message: "Token inválido." });
  });

  it("nenhuma resposta ao navegador carrega o token", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { ok: true }));
    const response = await new LanSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/site-identity", search: "", headers: new Headers(), body: null, cookieHeader: `efm_session=${jwt}`,
    });
    const text = await response.text();
    expect(text).not.toContain(jwt);
    expect([...response.headers.values()].join(" ")).not.toContain(jwt);
  });
});
```

- [ ] **Step 5: Implementar o gateway de loja**

`src/server/session/lan-session-gateway.ts`:
```ts
import "server-only";
import type { ServerConfig } from "../config";
import { backendUrl } from "../backend/backend-url";
import { parseJsonSafely, toErrorBody, type ApiErrorBody } from "../backend/error-body";
import { LAN_SESSION_COOKIE, expiredSessionCookie, readCookie, sessionCookie } from "./cookies";
import { SESSION_EXPIRED, jsonResponse, pickHeaders } from "./json-response";
import { readClaims } from "./jwt-claims";
import {
  FORWARDED_REQUEST_HEADERS,
  FORWARDED_RESPONSE_HEADERS,
  UNREACHABLE_CODE,
  type Credentials,
  type FirstAccessInput,
  type ForwardRequest,
  type GatewayResult,
  type SessionGateway,
  type SessionUser,
} from "./session-gateway";

interface LoginResponse {
  access_token: string;
  expires_in: number;
}

const nowSec = () => Math.floor(Date.now() / 1000);

/** easyfoodmanagerAPI: JWT Bearer de 8h, sem /auth/me e sem logout. O Next guarda o token. */
export class LanSessionGateway implements SessionGateway {
  constructor(
    private readonly config: ServerConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async login({ email, password }: Credentials): Promise<GatewayResult<SessionUser>> {
    const result = await this.postJson<LoginResponse>("/v1/auth/login", { email: email.trim(), password });
    if (!result.ok) return result;
    const claims = readClaims(result.data.access_token, nowSec());
    if (!claims) {
      return { ok: false, status: 502, error: { code: "invalid_token", message: "A API devolveu um token inválido." }, setCookies: [] };
    }
    return {
      ok: true,
      data: { id: claims.sub, email: claims.email },
      setCookies: [sessionCookie(result.data.access_token, result.data.expires_in, this.config.secureCookies)],
    };
  }

  async currentUser(cookieHeader: string | null): Promise<SessionUser | null> {
    const token = readCookie(cookieHeader, LAN_SESSION_COOKIE);
    const claims = token ? readClaims(token, nowSec()) : null;
    return claims ? { id: claims.sub, email: claims.email } : null;
  }

  async logout(): Promise<string[]> {
    return [expiredSessionCookie(this.config.secureCookies)];
  }

  async firstAccess({ email, newPassword, provisioningCode }: FirstAccessInput): Promise<GatewayResult<null>> {
    const result = await this.postJson<unknown>("/v1/auth/bootstrap-local-password", {
      email: email.trim(),
      new_password: newPassword,
      ...(provisioningCode?.trim() ? { provisioning_code: provisioningCode.trim() } : {}),
    });
    return result.ok ? { ok: true, data: null, setCookies: [] } : result;
  }

  async forward(request: ForwardRequest): Promise<Response> {
    const token = readCookie(request.cookieHeader, LAN_SESSION_COOKIE);
    if (!token || !readClaims(token, nowSec())) return jsonResponse(401, SESSION_EXPIRED);

    const headers = pickHeaders(request.headers, FORWARDED_REQUEST_HEADERS);
    headers.set("authorization", `Bearer ${token}`);

    let backend: Response;
    try {
      backend = await this.fetchFn(backendUrl(this.config, request.path, request.search), {
        method: request.method,
        headers,
        body: request.body,
        cache: "no-store",
      });
    } catch {
      return jsonResponse(503, this.unreachable());
    }

    if (!backend.ok) {
      const error = toErrorBody(backend.status, parseJsonSafely(await backend.text()));
      const clear = backend.status === 401 ? [expiredSessionCookie(this.config.secureCookies)] : [];
      return jsonResponse(backend.status, error, clear);
    }

    return new Response(backend.body, {
      status: backend.status,
      headers: pickHeaders(backend.headers, FORWARDED_RESPONSE_HEADERS),
    });
  }

  private unreachable(): ApiErrorBody {
    return {
      code: UNREACHABLE_CODE,
      message: `Não foi possível contactar ${this.config.apiDisplayOrigin}. Verifique o serviço e tente novamente.`,
    };
  }

  private async postJson<T>(path: string, body: unknown): Promise<GatewayResult<T>> {
    let response: Response;
    try {
      response = await this.fetchFn(backendUrl(this.config, path), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    } catch {
      return { ok: false, status: 503, error: this.unreachable(), setCookies: [] };
    }
    const parsed = parseJsonSafely(await response.text());
    if (!response.ok) return { ok: false, status: response.status, error: toErrorBody(response.status, parsed), setCookies: [] };
    return { ok: true, data: parsed as T, setCookies: [] };
  }
}
```

- [ ] **Step 6: Testes do gateway de nuvem (falham)**

`src/server/session/cloud-session-gateway.test.ts`:
```ts
// @vitest-environment node
import { CloudSessionGateway } from "./cloud-session-gateway";
import type { ServerConfig } from "../config";

const config: ServerConfig = {
  backend: "cloud",
  apiUrl: "http://api.nuvem",
  apiDisplayOrigin: "api.nuvem",
  adminPlatformUrl: "https://billing.easysoftcloud.com.br",
  secureCookies: false,
};
const json = (status: number, body: unknown, setCookie?: string) => {
  const headers = new Headers({ "content-type": "application/json" });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(JSON.stringify(body), { status, headers });
};

describe("CloudSessionGateway", () => {
  it("login retransmite o cookie da EasyFoodAPI", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      json(200, { user: { id: "u1", email: "a@b.com" } }, "efa_session=xyz; Path=/; HttpOnly; SameSite=Lax"),
    );
    const result = await new CloudSessionGateway(config, fetchFn).login({ email: " a@b.com ", password: "x" });
    expect(fetchFn.mock.calls[0]![0]).toBe("http://api.nuvem/api/v1/auth/login");
    expect(JSON.parse(fetchFn.mock.calls[0]![1].body)).toEqual({ email: "a@b.com", password: "x" });
    expect(result).toEqual({
      ok: true,
      data: { id: "u1", email: "a@b.com" },
      setCookies: ["efa_session=xyz; Path=/; HttpOnly; SameSite=Lax"],
    });
  });

  it("login 401 vira a mensagem do legado", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(401, { error: "invalid_credentials", message: "x" }));
    const result = await new CloudSessionGateway(config, fetchFn).login({ email: "a", password: "b" });
    expect(result).toMatchObject({ ok: false, status: 401, error: { code: "invalid_credentials", message: "Email ou senha incorretos." } });
  });

  it("login 429 vira a mensagem do legado", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(429, { error: "rate_limited" }));
    const result = await new CloudSessionGateway(config, fetchFn).login({ email: "a", password: "b" });
    expect(result).toMatchObject({ status: 429, error: { message: "Muitas tentativas. Aguarde um momento e tente novamente." } });
  });

  it("currentUser consulta /auth/me com o cookie do navegador", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { id: "u1", email: "a@b.com" }));
    const user = await new CloudSessionGateway(config, fetchFn).currentUser("efa_session=xyz");
    expect(user).toEqual({ id: "u1", email: "a@b.com" });
    expect(new Headers(fetchFn.mock.calls[0]![1].headers).get("cookie")).toBe("efa_session=xyz");
  });

  it("currentUser sem cookie não chama a API; 401 é ausência de sessão", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(401, { error: "unauthenticated" }));
    const gateway = new CloudSessionGateway(config, fetchFn);
    expect(await gateway.currentUser(null)).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
    expect(await gateway.currentUser("efa_session=velho")).toBeNull();
  });

  it("logout chama a API e retransmite o cookie que apaga a sessão", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { "set-cookie": "efa_session=; Max-Age=0; Path=/" } }));
    expect(await new CloudSessionGateway(config, fetchFn).logout("efa_session=xyz")).toEqual(["efa_session=; Max-Age=0; Path=/"]);
  });

  it("primeiro acesso não existe na nuvem", async () => {
    const result = await new CloudSessionGateway(config, vi.fn()).firstAccess({ email: "a", newPassword: "b" });
    expect(result).toMatchObject({ ok: false, status: 404, error: { code: "feature_unavailable" } });
  });

  it("repasse leva cookie e tenant, e devolve o Set-Cookie de renovação", async () => {
    const fetchFn = vi.fn().mockResolvedValue(json(200, { ok: true }, "efa_session=novo; Path=/; HttpOnly"));
    const headers = new Headers({ "x-company-id": "c1", "x-store-id": "s1", authorization: "Bearer intruso" });
    const response = await new CloudSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/me/stores", search: "", headers, body: null, cookieHeader: "efa_session=xyz",
    });
    const sent = new Headers(fetchFn.mock.calls[0]![1].headers);
    expect(fetchFn.mock.calls[0]![0]).toBe("http://api.nuvem/api/v1/me/stores");
    expect(sent.get("cookie")).toBe("efa_session=xyz");
    expect(sent.get("x-company-id")).toBe("c1");
    expect(sent.get("x-store-id")).toBe("s1");
    expect(sent.get("authorization")).toBeNull();
    expect(response.headers.getSetCookie()).toEqual(["efa_session=novo; Path=/; HttpOnly"]);
  });

  it("repasse mantém content-type e content-disposition de downloads", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([80, 75]), {
        status: 200,
        headers: { "content-type": "application/zip", "content-disposition": 'attachment; filename="notas.zip"' },
      }),
    );
    const response = await new CloudSessionGateway(config, fetchFn).forward({
      method: "GET", path: "/v1/nfce/notes-xml", search: "", headers: new Headers(), body: null, cookieHeader: "efa_session=xyz",
    });
    expect(response.headers.get("content-type")).toBe("application/zip");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="notas.zip"');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([80, 75]));
  });
});
```

- [ ] **Step 7: Implementar o gateway de nuvem e a fábrica**

`src/server/session/cloud-session-gateway.ts`:
```ts
import "server-only";
import type { ServerConfig } from "../config";
import { backendUrl } from "../backend/backend-url";
import { parseJsonSafely, toErrorBody, type ApiErrorBody } from "../backend/error-body";
import { jsonResponse, pickHeaders } from "./json-response";
import {
  FORWARDED_REQUEST_HEADERS,
  FORWARDED_RESPONSE_HEADERS,
  TENANT_HEADERS,
  UNREACHABLE_CODE,
  type Credentials,
  type FirstAccessInput,
  type ForwardRequest,
  type GatewayResult,
  type SessionGateway,
  type SessionUser,
} from "./session-gateway";

const LOGIN_MESSAGES: Partial<Record<number, string>> = {
  401: "Email ou senha incorretos.",
  429: "Muitas tentativas. Aguarde um momento e tente novamente.",
};

/** EasyFoodAPI: a sessão é um cookie httpOnly da própria API; o Next só retransmite. */
export class CloudSessionGateway implements SessionGateway {
  constructor(
    private readonly config: ServerConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async login({ email, password }: Credentials): Promise<GatewayResult<SessionUser>> {
    const response = await this.call("/v1/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!response) return this.unreachableResult();
    const parsed = parseJsonSafely(await response.text());
    const setCookies = response.headers.getSetCookie();
    if (!response.ok) {
      const error = toErrorBody(response.status, parsed);
      const message = LOGIN_MESSAGES[response.status] ?? error.message;
      return { ok: false, status: response.status, error: { ...error, message }, setCookies };
    }
    const user = (parsed as { user: SessionUser }).user;
    return { ok: true, data: { id: user.id, email: user.email ?? null }, setCookies };
  }

  async currentUser(cookieHeader: string | null): Promise<SessionUser | null> {
    if (!cookieHeader) return null;
    const response = await this.call("/v1/auth/me", { headers: { cookie: cookieHeader, accept: "application/json" } });
    if (!response || !response.ok) return null;
    const user = parseJsonSafely(await response.text()) as SessionUser | null;
    return user ? { id: user.id, email: user.email ?? null } : null;
  }

  async logout(cookieHeader: string | null): Promise<string[]> {
    if (!cookieHeader) return [];
    const response = await this.call("/v1/auth/logout", { method: "POST", headers: { cookie: cookieHeader } });
    return response ? response.headers.getSetCookie() : [];
  }

  async firstAccess(_input: FirstAccessInput): Promise<GatewayResult<null>> {
    return {
      ok: false,
      status: 404,
      error: { code: "feature_unavailable", message: "Indisponível nesta instalação." },
      setCookies: [],
    };
  }

  async forward(request: ForwardRequest): Promise<Response> {
    const headers = pickHeaders(request.headers, [...FORWARDED_REQUEST_HEADERS, ...TENANT_HEADERS]);
    if (request.cookieHeader) headers.set("cookie", request.cookieHeader);

    const backend = await this.call(request.path, { method: request.method, headers, body: request.body }, request.search);
    if (!backend) return jsonResponse(503, this.unreachable());

    const setCookies = backend.headers.getSetCookie();
    if (!backend.ok) {
      return jsonResponse(backend.status, toErrorBody(backend.status, parseJsonSafely(await backend.text())), setCookies);
    }
    const responseHeaders = pickHeaders(backend.headers, FORWARDED_RESPONSE_HEADERS);
    for (const cookie of setCookies) responseHeaders.append("set-cookie", cookie);
    return new Response(backend.body, { status: backend.status, headers: responseHeaders });
  }

  /** `null` quando a API não respondeu (rede, DNS, recusa). */
  private async call(path: string, init: RequestInit, search = ""): Promise<Response | null> {
    try {
      return await this.fetchFn(backendUrl(this.config, path, search), { ...init, cache: "no-store" });
    } catch {
      return null;
    }
  }

  private unreachable(): ApiErrorBody {
    return { code: UNREACHABLE_CODE, message: "Não foi possível entrar agora." };
  }

  private unreachableResult(): GatewayResult<SessionUser> {
    return { ok: false, status: 503, error: this.unreachable(), setCookies: [] };
  }
}
```

`src/server/session/gateway-factory.ts`:
```ts
import "server-only";
import type { ServerConfig } from "../config";
import { CloudSessionGateway } from "./cloud-session-gateway";
import { LanSessionGateway } from "./lan-session-gateway";
import type { SessionGateway } from "./session-gateway";

export function createSessionGateway(config: ServerConfig, fetchFn: typeof fetch = fetch): SessionGateway {
  return config.backend === "cloud" ? new CloudSessionGateway(config, fetchFn) : new LanSessionGateway(config, fetchFn);
}
```

- [ ] **Step 8: Rodar os testes**

Run: `npx vitest run src/server`
Expected: PASS (todos os testes de `src/server`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(server): SessionGateway para a easyfoodmanagerAPI e a EasyFoodAPI

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Rotas `/api/session/*`, repasse `/api/v1/*` e `proxy.ts`

**Files:**
- Create: `src/server/session/to-response.ts`, `src/server/gateway.ts`
- Create: `src/app/api/session/route.ts`, `src/app/api/session/login/route.ts`, `src/app/api/session/logout/route.ts`, `src/app/api/session/first-access/route.ts`, `src/app/api/v1/[...path]/route.ts`, `src/proxy.ts`
- Test: `src/app/api/api-routes.test.ts`, `src/proxy.test.ts`

**Interfaces:**
- Consumes: `createSessionGateway`, `readServerConfig`, `GatewayResult`, `SessionUser` (Tasks 3–4).
- Produces (contrato HTTP para o navegador):
  - `POST /api/session/login` `{ email, password }` → `200 { user: SessionUser }` | `4xx/5xx { code, message }`
  - `GET /api/session` → `200 { user: SessionUser }` | `401 { code: "unauthenticated", message }`
  - `POST /api/session/logout` → `204`
  - `POST /api/session/first-access` `{ email, newPassword, provisioningCode? }` → `204` | erro
  - `GET|POST|PUT|PATCH|DELETE /api/v1/<path>` → resposta do backend repassada
  - `getGateway(): SessionGateway` e `getServerConfig(): ServerConfig` em `@/server/gateway`
  - `SESSION_COOKIE_NAMES = ["efm_session", "efa_session"]` em `src/proxy.ts`

- [ ] **Step 1: Escrever os testes das rotas (falham)**

`src/app/api/api-routes.test.ts`:
```ts
// @vitest-environment node
import { NextRequest } from "next/server";

const gateway = {
  login: vi.fn(),
  currentUser: vi.fn(),
  logout: vi.fn(),
  firstAccess: vi.fn(),
  forward: vi.fn(),
};
vi.mock("@/server/gateway", () => ({ getGateway: () => gateway }));

const { POST: login } = await import("./session/login/route");
const { GET: session } = await import("./session/route");
const { POST: logout } = await import("./session/logout/route");
const { POST: firstAccess } = await import("./session/first-access/route");
const proxyRoute = await import("./v1/[...path]/route");

const post = (url: string, body: unknown, cookie?: string) =>
  new NextRequest(url, { method: "POST", body: JSON.stringify(body), headers: cookie ? { cookie } : {} });

beforeEach(() => vi.clearAllMocks());

describe("/api/session", () => {
  it("login ok devolve o usuário e grava o cookie de sessão", async () => {
    gateway.login.mockResolvedValue({ ok: true, data: { id: "u1", email: "a@b" }, setCookies: ["efm_session=t; Path=/; HttpOnly"] });
    const response = await login(post("http://x/api/session/login", { email: "a@b", password: "p" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ user: { id: "u1", email: "a@b" } });
    expect(response.headers.getSetCookie()).toEqual(["efm_session=t; Path=/; HttpOnly"]);
  });

  it("login com corpo inválido responde 400 sem chamar o backend", async () => {
    const response = await login(post("http://x/api/session/login", { email: "" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "invalid_body", message: "Preencha email e senha" });
    expect(gateway.login).not.toHaveBeenCalled();
  });

  it("login recusado repassa status e erro", async () => {
    gateway.login.mockResolvedValue({ ok: false, status: 429, error: { code: "login_rate_limited", message: "Muitas" }, setCookies: [] });
    const response = await login(post("http://x/api/session/login", { email: "a@b", password: "p" }));
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ code: "login_rate_limited", message: "Muitas" });
  });

  it("GET /api/session sem usuário é 401", async () => {
    gateway.currentUser.mockResolvedValue(null);
    const response = await session(new NextRequest("http://x/api/session"));
    expect(response.status).toBe(401);
  });

  it("logout responde 204 com os cookies que encerram a sessão", async () => {
    gateway.logout.mockResolvedValue(["efm_session=; Max-Age=0"]);
    const response = await logout(new NextRequest("http://x/api/session/logout", { method: "POST", headers: { cookie: "efm_session=t" } }));
    expect(response.status).toBe(204);
    expect(response.headers.getSetCookie()).toEqual(["efm_session=; Max-Age=0"]);
    expect(gateway.logout).toHaveBeenCalledWith("efm_session=t");
  });

  it("primeiro acesso valida o corpo e responde 204", async () => {
    gateway.firstAccess.mockResolvedValue({ ok: true, data: null, setCookies: [] });
    const response = await firstAccess(post("http://x/api/session/first-access", { email: "a@b", newPassword: "123456" }));
    expect(response.status).toBe(204);
    expect(gateway.firstAccess).toHaveBeenCalledWith({ email: "a@b", newPassword: "123456", provisioningCode: undefined });
  });
});

describe("/api/v1/[...path]", () => {
  it("repassa método, caminho, busca, corpo e cookie", async () => {
    gateway.forward.mockResolvedValue(new Response("{}", { status: 201 }));
    const request = new NextRequest("http://x/api/v1/totems?x=1", {
      method: "POST",
      body: '{"a":1}',
      headers: { cookie: "efm_session=t", "content-type": "application/json" },
    });
    const response = await proxyRoute.POST(request, { params: Promise.resolve({ path: ["totems"] }) });
    expect(response.status).toBe(201);
    const forwarded = gateway.forward.mock.calls[0]![0];
    expect(forwarded).toMatchObject({ method: "POST", path: "/v1/totems", search: "?x=1", cookieHeader: "efm_session=t" });
    expect(new TextDecoder().decode(forwarded.body)).toBe('{"a":1}');
  });

  it("GET não envia corpo", async () => {
    gateway.forward.mockResolvedValue(new Response("[]"));
    await proxyRoute.GET(new NextRequest("http://x/api/v1/products"), { params: Promise.resolve({ path: ["products"] }) });
    expect(gateway.forward.mock.calls[0]![0].body).toBeNull();
  });
});
```

`src/proxy.test.ts`:
```ts
// @vitest-environment node
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

describe("proxy", () => {
  it("sem cookie de sessão, página do painel vai para /login", () => {
    const response = proxy(new NextRequest("http://x/products"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://x/login");
  });

  it("com cookie de sessão de qualquer backend, segue", () => {
    for (const cookie of ["efm_session=t", "efa_session=t"]) {
      const response = proxy(new NextRequest("http://x/products", { headers: { cookie } }));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("páginas públicas passam sem sessão", () => {
    for (const path of ["/login", "/reset-password"]) {
      expect(proxy(new NextRequest(`http://x${path}`)).headers.get("location")).toBeNull();
    }
  });
});
```

O nome do cookie da EasyFoodAPI (`efa_session`) precisa ser conferido contra a API real antes de publicar — o código dela não está nesta máquina. Ele está em uma única constante (`SESSION_COOKIE_NAMES`).

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/app/api src/proxy.test.ts`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar**

`src/server/gateway.ts`:
```ts
import "server-only";
import { readServerConfig, type ServerConfig } from "./config";
import { createSessionGateway } from "./session/gateway-factory";
import type { SessionGateway } from "./session/session-gateway";

let config: ServerConfig | null = null;
let gateway: SessionGateway | null = null;

export function getServerConfig(): ServerConfig {
  config ??= readServerConfig();
  return config;
}

export function getGateway(): SessionGateway {
  gateway ??= createSessionGateway(getServerConfig());
  return gateway;
}
```

`src/server/session/to-response.ts`:
```ts
import "server-only";
import { NextResponse } from "next/server";
import type { GatewayResult } from "./session-gateway";

export function withCookies<T extends Response>(response: T, setCookies: string[]): T {
  for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
  return response;
}

export function resultToResponse<T>(result: GatewayResult<T>, toBody: (data: T) => unknown): NextResponse {
  const response = result.ok
    ? NextResponse.json(toBody(result.data))
    : NextResponse.json(result.error, { status: result.status });
  return withCookies(response, result.setCookies);
}
```

`src/app/api/session/login/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGateway } from "@/server/gateway";
import { resultToResponse } from "@/server/session/to-response";

const bodySchema = z.object({ email: z.string().trim().min(1), password: z.string().min(1) });

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "invalid_body", message: "Preencha email e senha" }, { status: 400 });
  }
  const result = await getGateway().login(parsed.data);
  return resultToResponse(result, (user) => ({ user }));
}
```

`src/app/api/session/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { getGateway } from "@/server/gateway";

export async function GET(request: NextRequest) {
  const user = await getGateway().currentUser(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ code: "unauthenticated", message: "Sua sessão expirou. Entre de novo." }, { status: 401 });
  }
  return NextResponse.json({ user });
}
```

`src/app/api/session/logout/route.ts`:
```ts
import type { NextRequest } from "next/server";
import { getGateway } from "@/server/gateway";
import { withCookies } from "@/server/session/to-response";

export async function POST(request: NextRequest) {
  const setCookies = await getGateway().logout(request.headers.get("cookie"));
  return withCookies(new Response(null, { status: 204 }), setCookies);
}
```

`src/app/api/session/first-access/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGateway } from "@/server/gateway";

const bodySchema = z.object({
  email: z.string().trim().min(1),
  newPassword: z.string().min(6).max(128),
  provisioningCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "invalid_body", message: "Dados do primeiro acesso inválidos." }, { status: 400 });
  }
  const result = await getGateway().firstAccess(parsed.data);
  if (!result.ok) return NextResponse.json(result.error, { status: result.status });
  return new Response(null, { status: 204 });
}
```

`src/app/api/v1/[...path]/route.ts`:
```ts
import type { NextRequest } from "next/server";
import { getGateway } from "@/server/gateway";

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, { params }: Context): Promise<Response> {
  const { path } = await params;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return getGateway().forward({
    method: request.method,
    path: `/v1/${path.map(encodeURIComponent).join("/")}`,
    search: request.nextUrl.search,
    headers: request.headers,
    body: hasBody ? await request.arrayBuffer() : null,
    cookieHeader: request.headers.get("cookie"),
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
```

`src/proxy.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";

/** `efm_session`: gravado pelo Next no modo loja. `efa_session`: gravado pela EasyFoodAPI na nuvem. */
export const SESSION_COOKIE_NAMES = ["efm_session", "efa_session"] as const;

const PUBLIC_PATHS = ["/login", "/reset-password"];

/**
 * Conveniência, não segurança: quem não tem cookie de sessão nem chega a carregar o
 * painel. A autorização de verdade é da API, em toda chamada repassada.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  const hasSession = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
  if (hasSession) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|easysoft-logo.png).*)"],
};
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run src/app/api src/proxy.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(api): rotas de sessão, repasse /api/v1 e proxy de autenticação

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Cliente HTTP do navegador, sessão expirada e provedores

**Files:**
- Create: `src/shared/http/api-error.ts`, `src/shared/http/session-events.ts`, `src/shared/http/api-client.ts`, `src/shared/http/query-client.ts`
- Create: `src/shared/session/session-client.ts`, `src/shared/session/session-expired-listener.tsx`
- Create: `src/shared/runtime/runtime-context.tsx`
- Create: `src/app/providers.tsx`, `src/app/layout.tsx`
- Test: `src/shared/http/api-client.test.ts`, `src/shared/http/query-client.test.ts`

**Interfaces:**
- Consumes: contrato HTTP da Task 5.
- Produces:
  - `class ApiError extends Error { status: number; code: string }`
  - `SESSION_EXPIRED_EVENT = "efm:session-expired"`, `notifySessionExpired(): void`
  - `interface TenantHeaders { companyId: string; storeId?: string | null }`
  - `apiRequest<T>(path: string, options?: { method?: "GET"|"POST"|"PUT"|"PATCH"|"DELETE"; body?: unknown; tenant?: TenantHeaders | null; signal?: AbortSignal }): Promise<T>` — `path` relativo a `/api/v1`, ex.: `"/me/stores"`
  - `shouldRetry(failureCount: number, error: unknown): boolean`, `createQueryClient(): QueryClient`
  - `sessionClient.login(email, password): Promise<SessionUser>`, `.logout(): Promise<void>`, `.currentUser(): Promise<SessionUser | null>`, `.firstAccess(input): Promise<void>`, `.requestPasswordReset(email): Promise<void>` — erros como `ApiError`
  - `interface RuntimeInfo { backend: "cloud" | "lan"; apiDisplayOrigin: string; adminPlatformUrl: string }`, `RuntimeProvider`, `useRuntime(): RuntimeInfo`

- [ ] **Step 1: Testes (falham)**

`src/shared/http/api-client.test.ts`:
```ts
import { apiRequest } from "./api-client";
import { ApiError } from "./api-error";
import { SESSION_EXPIRED_EVENT } from "./session-events";

const reply = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => vi.restoreAllMocks());

describe("apiRequest", () => {
  it("chama o repasse do próprio Next com os cabeçalhos de tenant", async () => {
    const fetchSpy = reply(200, [{ id: "1" }]);
    const result = await apiRequest("/products", { tenant: { companyId: "c1", storeId: "s1" } });
    expect(result).toEqual([{ id: "1" }]);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("/api/v1/products");
    expect(new Headers(init!.headers).get("x-company-id")).toBe("c1");
    expect(new Headers(init!.headers).get("x-store-id")).toBe("s1");
    expect(init!.credentials).toBe("same-origin");
  });

  it("envia corpo JSON", async () => {
    const fetchSpy = reply(200, {});
    await apiRequest("/totems", { method: "POST", body: { a: 1 } });
    expect(fetchSpy.mock.calls[0]![1]!.body).toBe('{"a":1}');
    expect(new Headers(fetchSpy.mock.calls[0]![1]!.headers).get("content-type")).toBe("application/json");
  });

  it("204 devolve undefined", async () => {
    reply(204, undefined);
    await expect(apiRequest("/x", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("erro vira ApiError com code e message do BFF", async () => {
    reply(403, { code: "tenant_forbidden", message: "Você não tem acesso a esta loja." });
    await expect(apiRequest("/x")).rejects.toMatchObject({ status: 403, code: "tenant_forbidden", message: "Você não tem acesso a esta loja." });
  });

  it("401 avisa que a sessão expirou", async () => {
    reply(401, { code: "unauthenticated", message: "Sua sessão expirou. Entre de novo." });
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    await expect(apiRequest("/x")).rejects.toBeInstanceOf(ApiError);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("falha de rede vira ApiError network em PT-BR", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiRequest("/x")).rejects.toMatchObject({ status: 0, code: "network", message: "Não foi possível contactar o servidor." });
  });
});
```

`src/shared/http/query-client.test.ts`:
```ts
import { shouldRetry } from "./query-client";
import { ApiError } from "./api-error";

describe("shouldRetry (mesma regra do legado)", () => {
  it("não repete erro 4xx, exceto 408", () => {
    expect(shouldRetry(0, new ApiError(404, "x", "x"))).toBe(false);
    expect(shouldRetry(0, new ApiError(408, "x", "x"))).toBe(true);
  });

  it("repete falhas de servidor até 2 vezes", () => {
    expect(shouldRetry(0, new ApiError(503, "x", "x"))).toBe(true);
    expect(shouldRetry(1, new ApiError(503, "x", "x"))).toBe(true);
    expect(shouldRetry(2, new ApiError(503, "x", "x"))).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/shared/http`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 3: Implementar o núcleo HTTP**

`src/shared/http/api-error.ts`:
```ts
/** Erro vindo do servidor: a tela decide pelo `code` e mostra a `message`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
```

`src/shared/http/session-events.ts`:
```ts
export const SESSION_EXPIRED_EVENT = "efm:session-expired";

export function notifySessionExpired(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
```

`src/shared/http/api-client.ts`:
```ts
import { ApiError } from "./api-error";
import { notifySessionExpired } from "./session-events";

export interface TenantHeaders {
  companyId: string;
  storeId?: string | null;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Empresa/loja em nome de quem a tela age. A API confere o vínculo. */
  tenant?: TenantHeaders | null;
  signal?: AbortSignal;
}

/** Lê o corpo como JSON sem quebrar quando ele não é JSON. */
async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Mesmo cliente para os dois backends: o navegador só conhece o repasse do Next. */
export async function request(path: string, options: RequestOptions = {}, base = "/api/v1"): Promise<Response> {
  const headers = new Headers({ accept: "application/json" });
  if (options.body !== undefined) headers.set("content-type", "application/json");
  if (options.tenant) {
    headers.set("x-company-id", options.tenant.companyId);
    if (options.tenant.storeId) headers.set("x-store-id", options.tenant.storeId);
  }
  try {
    return await fetch(`${base}${path}`, {
      method: options.method ?? "GET",
      headers,
      credentials: "same-origin",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "network", "Não foi possível contactar o servidor.");
  }
}

export async function toResult<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const body = await readBody(response);
  if (!response.ok) {
    if (response.status === 401) notifySessionExpired();
    const { code, message } = (body ?? {}) as { code?: string; message?: string };
    throw new ApiError(response.status, code ?? `http_${response.status}`, message ?? `Falha na requisição (HTTP ${response.status}).`);
  }
  return body as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return toResult<T>(await request(path, options));
}
```

`src/shared/http/query-client.ts`:
```ts
import { QueryClient } from "@tanstack/react-query";

const MAX_RETRIES = 2;

/** 4xx não melhora repetindo (exceto 408, timeout); o resto repete até 2 vezes. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  if (typeof status === "number" && status >= 400 && status < 500 && status !== 408) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}
```

- [ ] **Step 4: Rodar os testes**

Run: `npx vitest run src/shared/http`
Expected: PASS.

- [ ] **Step 5: Implementar sessão no cliente, runtime e provedores**

`src/shared/session/session-client.ts`:
```ts
import { ApiError } from "@/shared/http/api-error";
import { request, toResult } from "@/shared/http/api-client";

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface FirstAccessInput {
  email: string;
  newPassword: string;
  provisioningCode?: string;
}

const SESSION_BASE = "/api/session";

/**
 * Login, logout e primeiro acesso NÃO disparam o aviso de sessão expirada:
 * um 401 aqui é credencial errada, não sessão vencida.
 */
async function postSession<T>(path: string, body: unknown): Promise<T> {
  const response = await request(path, { method: "POST", body }, SESSION_BASE);
  if (response.status === 401) {
    const payload = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new ApiError(401, payload.code ?? "http_401", payload.message ?? "Email ou senha incorretos.");
  }
  return toResult<T>(response);
}

export const sessionClient = {
  async login(email: string, password: string): Promise<SessionUser> {
    const { user } = await postSession<{ user: SessionUser }>("/login", { email, password });
    return user;
  },
  async logout(): Promise<void> {
    await postSession<void>("/logout", {});
  },
  /** `null` quando não há sessão — ausência de sessão não é erro aqui. */
  async currentUser(): Promise<SessionUser | null> {
    const response = await request("", {}, SESSION_BASE);
    if (response.status === 401) return null;
    const { user } = await toResult<{ user: SessionUser }>(response);
    return user;
  },
  async firstAccess(input: FirstAccessInput): Promise<void> {
    await postSession<void>("/first-access", input);
  },
  /** A API responde igual exista a conta ou não. */
  async requestPasswordReset(email: string): Promise<void> {
    const response = await request("/auth/recovery-email", { method: "POST", body: { email: email.trim(), app: "manager" } });
    await toResult<void>(response);
  },
};
```

Adicionar ao final de `src/shared/http/api-client.test.ts`:
```ts
import { sessionClient } from "@/shared/session/session-client";

describe("sessionClient", () => {
  it("login 401 é credencial errada, não sessão expirada", async () => {
    reply(401, { code: "invalid_credentials", message: "Email ou senha incorretos." });
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    await expect(sessionClient.login("a", "b")).rejects.toMatchObject({ status: 401, message: "Email ou senha incorretos." });
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it("currentUser devolve null em 401", async () => {
    reply(401, { code: "unauthenticated", message: "x" });
    await expect(sessionClient.currentUser()).resolves.toBeNull();
  });

  it("pedido de recuperação vai para a API com app=manager", async () => {
    const fetchSpy = reply(204, undefined);
    await sessionClient.requestPasswordReset(" a@b.com ");
    expect(fetchSpy.mock.calls[0]![0]).toBe("/api/v1/auth/recovery-email");
    expect(fetchSpy.mock.calls[0]![1]!.body).toBe('{"email":"a@b.com","app":"manager"}');
  });
});
```

`src/shared/runtime/runtime-context.tsx`:
```tsx
"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface RuntimeInfo {
  backend: "cloud" | "lan";
  /** `host:porta` do backend, exibido no badge do cabeçalho. */
  apiDisplayOrigin: string;
  adminPlatformUrl: string;
}

const RuntimeContext = createContext<RuntimeInfo | null>(null);

/** Informação de servidor (não secreta) entregue às telas pelo layout. */
export function RuntimeProvider({ value, children }: { value: RuntimeInfo; children: ReactNode }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeInfo {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("useRuntime fora do RuntimeProvider.");
  return runtime;
}
```

`src/shared/session/session-expired-listener.tsx`:
```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SESSION_EXPIRED_EVENT } from "@/shared/http/session-events";

/** Qualquer 401 do repasse limpa o cache e leva ao login. */
export function SessionExpiredListener() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onExpired = () => {
      queryClient.clear();
      router.replace("/login?expired=1");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient, router]);

  return null;
}
```

`src/app/providers.tsx`:
```tsx
"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/shared/ui/primitives/tooltip";
import { Toaster } from "@/shared/ui/primitives/toaster";
import { Toaster as Sonner } from "@/shared/ui/primitives/sonner";
import { createQueryClient } from "@/shared/http/query-client";
import { SessionExpiredListener } from "@/shared/session/session-expired-listener";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SessionExpiredListener />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
```

`src/app/layout.tsx` (metadados do `LEGACY/index.html`, sem PWA/instalação desktop; fontes auto-hospedadas com os mesmos pesos do legado):
```tsx
import type { Metadata, Viewport } from "next";
import { Manrope, Sora } from "next/font/google";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

const sora = Sora({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800"], variable: "--font-sora", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: "EasyFood Manager",
  description: "EasyFood Manager — painel administrativo (totens, sync, NFC-e, PDV).",
  authors: [{ name: "EasySoft Sistemas" }],
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = { themeColor: "#0f172a" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${sora.variable} ${manrope.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Rodar testes e typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS; `tsc` sem erros.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(http): cliente único do navegador, sessão expirada e provedores

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Tenant — loja escolhida (nuvem) ou fixa (loja)

**Files:**
- Create: `src/shared/tenant/tenant.ts`, `src/shared/tenant/tenant-context.tsx`
- Test: `src/shared/tenant/tenant.test.ts`, `src/shared/tenant/tenant-context.test.tsx`

**Interfaces:**
- Consumes: `apiRequest` (Task 6), `useRuntime` (Task 6).
- Produces:
  - `interface Company { id: string; name: string; cnpj: string }`
  - `interface Store { id: string; company_id: string; trade_name: string; legacy_store_code: string }` (nomes de campo iguais ao legado, usados pelo JSX copiado)
  - `interface Selection { companyId: string; storeId: string }`
  - `resolveSelection(input: { stores: Store[]; saved: { companyId: string | null; storeId: string | null } }): Selection | null`
  - `TENANT_STORAGE_KEYS = { company: "cp.selectedCompanyId", store: "cp.selectedStoreId" }`
  - `interface TenantState { loading: boolean; companies: Company[]; storesByCompany: Record<string, Store[]>; selection: Selection | null; selectedCompany: Company | null; selectedStore: Store | null; needsSelection: boolean; isSystemAdmin: boolean; isCompanyAdmin: boolean; select(companyId: string, storeId: string): void; refresh(): Promise<void> }`
  - `TenantProvider`, `useTenant(): TenantState`

- [ ] **Step 1: Testes da regra pura (falham)**

`src/shared/tenant/tenant.test.ts`:
```ts
import { resolveSelection, type Store } from "./tenant";

const store = (id: string, company_id: string): Store => ({ id, company_id, trade_name: `Loja ${id}`, legacy_store_code: id });

describe("resolveSelection", () => {
  it("mantém a seleção salva quando a loja ainda existe na empresa", () => {
    const stores = [store("s1", "c1"), store("s2", "c1")];
    expect(resolveSelection({ stores, saved: { companyId: "c1", storeId: "s2" } })).toEqual({ companyId: "c1", storeId: "s2" });
  });

  it("descarta seleção salva de loja que não existe mais", () => {
    const stores = [store("s1", "c1"), store("s2", "c1")];
    expect(resolveSelection({ stores, saved: { companyId: "c1", storeId: "sumiu" } })).toBeNull();
  });

  it("descarta seleção salva cuja loja mudou de empresa", () => {
    const stores = [store("s1", "c2"), store("s9", "c2")];
    expect(resolveSelection({ stores, saved: { companyId: "c1", storeId: "s1" } })).toBeNull();
  });

  it("escolhe sozinho quando só existe uma loja", () => {
    expect(resolveSelection({ stores: [store("s1", "c1")], saved: { companyId: null, storeId: null } })).toEqual({ companyId: "c1", storeId: "s1" });
  });

  it("sem lojas não há seleção", () => {
    expect(resolveSelection({ stores: [], saved: { companyId: null, storeId: null } })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/shared/tenant/tenant.test.ts`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `tenant.ts`**

```ts
export interface Company {
  id: string;
  name: string;
  cnpj: string;
}

export interface Store {
  id: string;
  company_id: string;
  trade_name: string;
  legacy_store_code: string;
}

export interface Selection {
  companyId: string;
  storeId: string;
}

/** Mesmas chaves do legado: quem já usava o painel continua na loja que escolheu. */
export const TENANT_STORAGE_KEYS = { company: "cp.selectedCompanyId", store: "cp.selectedStoreId" } as const;

export function resolveSelection(input: {
  stores: Store[];
  saved: { companyId: string | null; storeId: string | null };
}): Selection | null {
  const { stores, saved } = input;
  const savedStore = stores.find((s) => s.id === saved.storeId && s.company_id === saved.companyId);
  if (savedStore) return { companyId: savedStore.company_id, storeId: savedStore.id };
  const [only, ...rest] = stores;
  if (only && rest.length === 0) return { companyId: only.company_id, storeId: only.id };
  return null;
}
```

- [ ] **Step 4: Rodar o teste**

Run: `npx vitest run src/shared/tenant/tenant.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Teste do provedor (falha)**

`src/shared/tenant/tenant-context.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";
import { TenantProvider, useTenant } from "./tenant-context";

const routes: Record<string, unknown> = {
  "/api/v1/me/context": { user: { id: "u1", email: "a@b" }, is_system_admin: true, is_company_admin: false, companies: [{ id: "c1", name: "Empresa", cnpj: "1" }] },
  "/api/v1/me/all-stores": [
    { id: "s1", company_id: "c1", trade_name: "Centro", legacy_store_code: "1", store_type: null, is_default: true },
    { id: "s2", company_id: "c1", trade_name: "Norte", legacy_store_code: "2", store_type: null, is_default: false },
  ],
  "/api/v1/site-identity": { company_id: "cL", store_id: "sL" },
};

function Probe() {
  const t = useTenant();
  return (
    <div>
      <span data-testid="loading">{String(t.loading)}</span>
      <span data-testid="needs">{String(t.needsSelection)}</span>
      <span data-testid="store">{t.selection?.storeId ?? "-"}</span>
      <span data-testid="company">{t.selectedCompany?.name ?? "-"}</span>
      <span data-testid="admin">{String(t.isSystemAdmin)}</span>
    </div>
  );
}

function wrap(runtime: RuntimeInfo, children: ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RuntimeProvider value={runtime}>
        <TenantProvider>{children}</TenantProvider>
      </RuntimeProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
    new Response(JSON.stringify(routes[String(url)] ?? {}), { status: routes[String(url)] ? 200 : 404 }),
  );
});
afterEach(() => vi.restoreAllMocks());

const cloud: RuntimeInfo = { backend: "cloud", apiDisplayOrigin: "api", adminPlatformUrl: "https://b" };
const lan: RuntimeInfo = { backend: "lan", apiDisplayOrigin: "api", adminPlatformUrl: "https://b" };

describe("TenantProvider", () => {
  it("nuvem com duas lojas e nada salvo pede seleção, mas já mostra a empresa única", async () => {
    render(wrap(cloud, <Probe />));
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("needs")).toHaveTextContent("true");
    expect(screen.getByTestId("company")).toHaveTextContent("Empresa");
    expect(screen.getByTestId("admin")).toHaveTextContent("true");
  });

  it("nuvem restaura a loja salva no navegador", async () => {
    localStorage.setItem("cp.selectedCompanyId", "c1");
    localStorage.setItem("cp.selectedStoreId", "s2");
    render(wrap(cloud, <Probe />));
    await waitFor(() => expect(screen.getByTestId("store")).toHaveTextContent("s2"));
    expect(screen.getByTestId("needs")).toHaveTextContent("false");
  });

  it("loja usa a identidade fixa da instalação e nunca pede seleção", async () => {
    render(wrap(lan, <Probe />));
    await waitFor(() => expect(screen.getByTestId("store")).toHaveTextContent("sL"));
    expect(screen.getByTestId("needs")).toHaveTextContent("false");
    expect(screen.getByTestId("admin")).toHaveTextContent("false");
  });
});
```

- [ ] **Step 6: Rodar para ver falhar**

Run: `npx vitest run src/shared/tenant/tenant-context.test.tsx`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 7: Implementar `tenant-context.tsx`**

```tsx
"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/shared/http/api-client";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { TENANT_STORAGE_KEYS, resolveSelection, type Company, type Selection, type Store } from "./tenant";

export interface TenantState {
  loading: boolean;
  companies: Company[];
  storesByCompany: Record<string, Store[]>;
  selection: Selection | null;
  selectedCompany: Company | null;
  selectedStore: Store | null;
  needsSelection: boolean;
  isSystemAdmin: boolean;
  isCompanyAdmin: boolean;
  select(companyId: string, storeId: string): void;
  refresh(): Promise<void>;
}

interface CloudContext {
  is_system_admin: boolean;
  is_company_admin: boolean;
  companies: { id: string; name: string | null; cnpj: string | null }[];
}

interface CloudStore {
  id: string;
  company_id: string;
  trade_name: string | null;
  legacy_store_code: string | number | null;
}

const TenantContext = createContext<TenantState | null>(null);

function readSaved() {
  try {
    return {
      companyId: localStorage.getItem(TENANT_STORAGE_KEYS.company),
      storeId: localStorage.getItem(TENANT_STORAGE_KEYS.store),
    };
  } catch {
    return { companyId: null, storeId: null };
  }
}

function persist(selection: Selection) {
  try {
    localStorage.setItem(TENANT_STORAGE_KEYS.company, selection.companyId);
    localStorage.setItem(TENANT_STORAGE_KEYS.store, selection.storeId);
  } catch {
    /* navegador sem armazenamento: a escolha vale só nesta aba */
  }
}

function groupByCompany(stores: Store[]): Record<string, Store[]> {
  return stores.reduce<Record<string, Store[]>>((groups, store) => {
    (groups[store.company_id] ??= []).push(store);
    return groups;
  }, {});
}

function useCloudTenant(): TenantState {
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<Selection | null>(null);

  const context = useQuery({
    queryKey: ["tenant", "context"],
    queryFn: () => apiRequest<CloudContext>("/me/context"),
    staleTime: 5 * 60_000,
  });
  const stores = useQuery({
    queryKey: ["tenant", "all-stores"],
    queryFn: async () =>
      (await apiRequest<CloudStore[]>("/me/all-stores")).map<Store>((s) => ({
        id: s.id,
        company_id: s.company_id,
        trade_name: s.trade_name ?? "",
        legacy_store_code: String(s.legacy_store_code ?? ""),
      })),
    staleTime: 5 * 60_000,
  });

  const companies = useMemo<Company[]>(
    () => (context.data?.companies ?? []).map((c) => ({ id: c.id, name: c.name ?? "", cnpj: c.cnpj ?? "" })),
    [context.data],
  );
  const allStores = useMemo(() => stores.data ?? [], [stores.data]);
  const selection = chosen ?? (stores.data ? resolveSelection({ stores: allStores, saved: readSaved() }) : null);

  const select = useCallback((companyId: string, storeId: string) => {
    const next = { companyId, storeId };
    persist(next);
    setChosen(next);
  }, []);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["tenant"] });
  }, [queryClient]);

  const loading = context.isPending || stores.isPending;
  // Como no legado: com uma empresa só, ela já aparece no cabeçalho antes de escolher a loja.
  const selectedCompanyId = selection?.companyId ?? (companies.length === 1 ? companies[0]!.id : null);
  return {
    loading,
    companies,
    storesByCompany: groupByCompany(allStores),
    selection,
    selectedCompany: companies.find((c) => c.id === selectedCompanyId) ?? null,
    selectedStore: allStores.find((s) => s.id === selection?.storeId) ?? null,
    needsSelection: !loading && !selection,
    isSystemAdmin: context.data?.is_system_admin === true,
    isCompanyAdmin: context.data?.is_company_admin === true,
    select,
    refresh,
  };
}

function useLanTenant(): TenantState {
  const identity = useQuery({
    queryKey: ["tenant", "site-identity"],
    queryFn: () => apiRequest<{ company_id: string; store_id: string }>("/site-identity"),
    staleTime: Infinity,
  });
  const selection = identity.data ? { companyId: identity.data.company_id, storeId: identity.data.store_id } : null;
  return {
    loading: identity.isPending,
    companies: [],
    storesByCompany: {},
    selection,
    selectedCompany: null,
    selectedStore: null,
    needsSelection: false,
    isSystemAdmin: false,
    isCompanyAdmin: false,
    select: () => undefined,
    refresh: async () => undefined,
  };
}

function CloudTenantProvider({ children }: { children: ReactNode }) {
  return <TenantContext.Provider value={useCloudTenant()}>{children}</TenantContext.Provider>;
}

function LanTenantProvider({ children }: { children: ReactNode }) {
  return <TenantContext.Provider value={useLanTenant()}>{children}</TenantContext.Provider>;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const { backend } = useRuntime();
  return backend === "cloud" ? <CloudTenantProvider>{children}</CloudTenantProvider> : <LanTenantProvider>{children}</LanTenantProvider>;
}

export function useTenant(): TenantState {
  const tenant = useContext(TenantContext);
  if (!tenant) throw new Error("useTenant fora do TenantProvider.");
  return tenant;
}
```

- [ ] **Step 8: Rodar os testes**

Run: `npx vitest run src/shared/tenant`
Expected: PASS (8 testes).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(tenant): loja escolhida na nuvem e identidade fixa na loja

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Tela de login (nuvem, loja e primeiro acesso)

**Files:**
- Create: `src/shared/session/login/LoginPageShell.tsx` (cópia de `LEGACY/src/components/auth/LoginPageShell.tsx`)
- Create: `src/shared/session/login/login-messages.ts`, `src/shared/session/login/remembered-email.ts`
- Create: `src/shared/session/login/CloudLoginForm.tsx`, `src/shared/session/login/PasswordResetDialog.tsx`
- Create: `src/shared/session/login/LanLoginForm.tsx`, `src/shared/session/login/BootstrapPasswordForm.tsx`
- Create: `src/app/login/page.tsx`
- Test: `src/shared/session/login/login-messages.test.ts`, `src/shared/session/login/login-forms.test.tsx`

**Interfaces:**
- Consumes: `sessionClient`, `ApiError` (Task 6); `LoginPageShell` props do legado; `getServerConfig` (Task 5).
- Produces: `bootstrapErrorMessage(code: string | undefined, fallback: string): string`; `LOCAL_PASSWORD_MIN_LENGTH = 6`, `LOCAL_PASSWORD_MAX_LENGTH = 128`; `rememberedEmail.read(): string`, `.save(email)`, `.clear()` (chave `ecp_admin_last_email`).

**Referência obrigatória (JSX idêntico):** `LEGACY/src/pages/LoginPage.tsx` — `CloudLoginForm` (linhas 138–404), `AdminApiLoginForm` no ramo `urlFromBuildEnv === true` (linhas 835–1083, bloco `: (<> ... </>)` sem as abas) e o modo `bootstrap` (linhas 739–833). No Next a URL da API é configuração do servidor, que corresponde ao ramo `urlFromBuildEnv` do legado: **não há abas Login/Configuração nem campos de host/porta.**

- [ ] **Step 1: Teste das mensagens (falha)**

`src/shared/session/login/login-messages.test.ts`:
```ts
import { bootstrapErrorMessage } from "./login-messages";

describe("bootstrapErrorMessage", () => {
  it("usa o texto do legado para cada código conhecido", () => {
    expect(bootstrapErrorMessage("user_not_found", "x")).toBe(
      "Este email não existe nesta base local ou a conta ainda não foi sincronizada.",
    );
    expect(bootstrapErrorMessage("weak_password", "x")).toBe("Senha não cumpre os requisitos (≥ 6 caracteres).");
    expect(bootstrapErrorMessage("provisioning_code_expired", "x")).toBe(
      "Código de primeiro acesso expirado. Peça um novo ao administrador.",
    );
  });

  it("código desconhecido usa a mensagem do servidor", () => {
    expect(bootstrapErrorMessage("outro", "Mensagem do servidor")).toBe("Mensagem do servidor");
    expect(bootstrapErrorMessage(undefined, "Mensagem do servidor")).toBe("Mensagem do servidor");
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/shared/session/login/login-messages.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar mensagens e e-mail lembrado**

`src/shared/session/login/login-messages.ts` (substitui a cadeia de ternários do legado por uma tabela; textos idênticos):
```ts
export const LOCAL_PASSWORD_MIN_LENGTH = 6;
export const LOCAL_PASSWORD_MAX_LENGTH = 128;

const BOOTSTRAP_ERRORS: Record<string, string> = {
  user_not_found: "Este email não existe nesta base local ou a conta ainda não foi sincronizada.",
  password_already_set: "A senha local já foi definida. Volte e inicie sessão com email e senha.",
  user_inactive: "Usuário inativo. Contacte o administrador do sistema.",
  weak_password: `Senha não cumpre os requisitos (≥ ${LOCAL_PASSWORD_MIN_LENGTH} caracteres).`,
  bootstrap_disabled: "A API não permite este cadastro (ver AUTH_MODE=pg_users no serviço da Admin API).",
  provisioning_code_required:
    "Este servidor exige um código de primeiro acesso. Peça ao administrador para gerar um no painel da nuvem.",
  provisioning_code_invalid: "Código de primeiro acesso inválido. Confira se copiou o código completo.",
  provisioning_code_expired: "Código de primeiro acesso expirado. Peça um novo ao administrador.",
  provisioning_code_email_mismatch: "O código de primeiro acesso pertence a outro email.",
  provisioning_code_wrong_store: "O código de primeiro acesso pertence a outra loja.",
  bootstrap_rate_limited: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
};

export function bootstrapErrorMessage(code: string | undefined, fallback: string): string {
  return (code && BOOTSTRAP_ERRORS[code]) || fallback;
}

/** Códigos do login local que levam à tela de primeiro acesso. */
export const NEEDS_BOOTSTRAP_CODES = new Set(["local_password_not_set", "invalid_password_hash"]);
```

`src/shared/session/login/remembered-email.ts`:
```ts
const KEY = "ecp_admin_last_email";

/** Conveniência por navegador (nunca senha): pré-preenche o e-mail do último login. */
export const rememberedEmail = {
  read(): string {
    try {
      return localStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  },
  save(email: string): void {
    try {
      localStorage.setItem(KEY, email);
    } catch {
      /* sem armazenamento: só não lembra */
    }
  },
  clear(): void {
    this.save("");
  },
};
```

Run: `npx vitest run src/shared/session/login/login-messages.test.ts` → Expected: PASS.

- [ ] **Step 4: Testes dos formulários (falham)**

`src/shared/session/login/login-forms.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/shared/http/api-error";
import { Toaster } from "@/shared/ui/primitives/toaster";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), useSearchParams: () => new URLSearchParams() }));
const sessionClient = { login: vi.fn(), firstAccess: vi.fn(), requestPasswordReset: vi.fn() };
vi.mock("@/shared/session/session-client", () => ({ sessionClient }));

const { LanLoginForm } = await import("./LanLoginForm");
const { CloudLoginForm } = await import("./CloudLoginForm");

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("LanLoginForm", () => {
  it("mostra os textos do legado no modo loja", () => {
    render(<LanLoginForm />);
    expect(screen.getByText("Modo Local · Admin API")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bem-vindo de volta" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("admin@local.dev")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("login ok lembra o e-mail e vai para o painel", async () => {
    sessionClient.login.mockResolvedValue({ id: "u1", email: "a@loja.dev" });
    render(<LanLoginForm />);
    await userEvent.type(screen.getByLabelText("Email"), "a@loja.dev");
    await userEvent.type(screen.getByLabelText("Senha"), "segredo");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(localStorage.getItem("ecp_admin_last_email")).toBe("a@loja.dev");
  });

  it("senha local não definida abre o primeiro acesso", async () => {
    sessionClient.login.mockRejectedValue(new ApiError(401, "local_password_not_set", "x"));
    render(<><LanLoginForm /><Toaster /></>);
    await userEvent.type(screen.getByLabelText("Email"), "novo@loja.dev");
    await userEvent.type(screen.getByLabelText("Senha"), "qualquer");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("heading", { name: "Primeiro acesso" })).toBeInTheDocument();
    expect(screen.getByText("novo@loja.dev")).toBeInTheDocument();
  });

  it("API fora do ar mostra o aviso do legado", async () => {
    sessionClient.login.mockRejectedValue(new ApiError(503, "backend_unreachable", "Não foi possível contactar 127.0.0.1:4080."));
    render(<><LanLoginForm /><Toaster /></>);
    await userEvent.type(screen.getByLabelText("Email"), "a@loja.dev");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("URL da Admin API inacessível")).toBeInTheDocument();
  });
});

describe("CloudLoginForm", () => {
  it("mostra os textos do legado no modo nuvem", () => {
    render(<CloudLoginForm />);
    expect(screen.getByText("Modo Nuvem · EasyFoodAPI")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("usuário@empresa.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Esqueci a senha" })).toBeInTheDocument();
  });

  it("credencial errada mostra a mensagem do servidor", async () => {
    sessionClient.login.mockRejectedValue(new ApiError(401, "invalid_credentials", "Email ou senha incorretos."));
    render(<><CloudLoginForm /><Toaster /></>);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.type(screen.getByLabelText("Senha"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("Não foi possível entrar")).toBeInTheDocument();
    expect(screen.getByText("Email ou senha incorretos.")).toBeInTheDocument();
  });

  it("recuperar senha envia o e-mail pela API", async () => {
    sessionClient.requestPasswordReset.mockResolvedValue(undefined);
    render(<><CloudLoginForm /><Toaster /></>);
    await userEvent.type(screen.getByLabelText("Email"), "a@b.com");
    await userEvent.click(screen.getByRole("button", { name: "Esqueci a senha" }));
    await userEvent.click(await screen.findByRole("button", { name: "Enviar email" }));
    await waitFor(() => expect(sessionClient.requestPasswordReset).toHaveBeenCalledWith("a@b.com"));
    expect(await screen.findByText("Email enviado")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Rodar para ver falhar**

Run: `npx vitest run src/shared/session/login/login-forms.test.tsx`
Expected: FAIL — módulos não encontrados.

- [ ] **Step 6: Copiar o `LoginPageShell`**

```bash
cp ../easyfoodmanagerWEB/src/components/auth/LoginPageShell.tsx src/shared/session/login/LoginPageShell.tsx
sed -i 's#@/lib/version#@/shared/version#' src/shared/session/login/LoginPageShell.tsx
```
O arquivo usa `new Date().getFullYear()` (sem estado de cliente) e não precisa de `"use client"`. Nenhuma classe muda.

- [ ] **Step 7: Implementar `PasswordResetDialog.tsx`**

JSX idêntico ao `<Dialog>` de `LEGACY/src/pages/LoginPage.tsx` linhas 330–378; a lógica chama `sessionClient.requestPasswordReset`.
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/primitives/dialog";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useToast } from "@/shared/ui/use-toast";
import { sessionClient } from "@/shared/session/session-client";

interface Props {
  open: boolean;
  initialEmail: string;
  onOpenChange(open: boolean): void;
}

export function PasswordResetDialog({ open, initialEmail, onOpenChange }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [lastInitial, setLastInitial] = useState(initialEmail);
  if (initialEmail !== lastInitial) {
    setLastInitial(initialEmail);
    setEmail(initialEmail);
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      toast({ title: "Indique o seu email", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await sessionClient.requestPasswordReset(email);
      toast({ title: "Email enviado", description: "Verifique a sua caixa de entrada." });
      onOpenChange(false);
      setEmail("");
    } catch (error) {
      toast({
        title: "Falha ao enviar email",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar senha</DialogTitle>
          <DialogDescription>Enviaremos um link para o seu email com instruções.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-11 bg-card/60 border-border focus-visible:border-primary"
                placeholder="usuário@empresa.com"
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A enviar…
                </>
              ) : (
                "Enviar email"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 8: Implementar `CloudLoginForm.tsx`**

JSX idêntico às linhas 234–329 de `LEGACY/src/pages/LoginPage.tsx`, com o rótulo fixo `"Modo Nuvem · EasyFoodAPI"`.
```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Cloud, Eraser, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useToast } from "@/shared/ui/use-toast";
import { sessionClient } from "@/shared/session/session-client";
import { LoginPageShell } from "./LoginPageShell";
import { PasswordResetDialog } from "./PasswordResetDialog";
import { rememberedEmail } from "./remembered-email";
import { useExpiredSessionNotice } from "./use-expired-session-notice";

export function CloudLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  useExpiredSessionNotice(useSearchParams());

  useEffect(() => setEmail(rememberedEmail.read()), []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Preencha email e senha", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await sessionClient.login(email, password);
      setPassword("");
      rememberedEmail.save(email.trim());
      toast({ title: "Sessão iniciada" });
      router.replace("/");
    } catch (error) {
      toast({
        title: "Não foi possível entrar",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const clearSavedData = () => {
    rememberedEmail.clear();
    setEmail("");
    toast({ title: "Dados salvos removidos", description: "Email e URL foram apagados deste navegador." });
  };

  return (
    <LoginPageShell
      modeBadge={{ icon: Cloud, label: "Modo Nuvem · EasyFoodAPI" }}
      title="Bem-vindo de volta"
      subtitle="Acesse sua conta para gerenciar totens, NFC-e e sincronização."
    >
      <>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-11 bg-card/60 border-border focus-visible:border-primary"
                placeholder="usuário@empresa.com"
                disabled={submitting}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-foreground">
                Senha
              </Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setResetOpen(true)}
                disabled={submitting}
              >
                Esqueci a senha
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-11 bg-card/60 border-border focus-visible:border-primary"
                disabled={submitting}
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-11 glow-primary bg-primary hover:bg-primary/90" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A entrar…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            disabled={submitting}
            onClick={clearSavedData}
          >
            <Eraser className="mr-2 h-4 w-4" />
            Limpar dados salvos
          </Button>
        </form>
        <PasswordResetDialog open={resetOpen} initialEmail={email} onOpenChange={setResetOpen} />
      </>
    </LoginPageShell>
  );
}
```

Criar `src/shared/session/login/use-expired-session-notice.ts`:
```ts
"use client";

import { useEffect } from "react";
import { useToast } from "@/shared/ui/use-toast";

/** `/login?expired=1`: chegou aqui porque a sessão venceu no meio do uso. */
export function useExpiredSessionNotice(searchParams: URLSearchParams | null) {
  const { toast } = useToast();
  const expired = searchParams?.get("expired") === "1";
  useEffect(() => {
    if (expired) toast({ title: "Sua sessão expirou. Entre de novo.", variant: "destructive" });
  }, [expired, toast]);
}
```

- [ ] **Step 9: Implementar `BootstrapPasswordForm.tsx`**

JSX idêntico às linhas 739–833 de `LEGACY/src/pages/LoginPage.tsx`.
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2, Server } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useToast } from "@/shared/ui/use-toast";
import { ApiError } from "@/shared/http/api-error";
import { sessionClient } from "@/shared/session/session-client";
import { LoginPageShell } from "./LoginPageShell";
import { LOCAL_PASSWORD_MAX_LENGTH, LOCAL_PASSWORD_MIN_LENGTH, bootstrapErrorMessage } from "./login-messages";
import { rememberedEmail } from "./remembered-email";

interface Props {
  email: string;
  onCancel(): void;
  onDone(): void;
}

export function BootstrapPasswordForm({ email, onCancel, onDone }: Props) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [provisioningCode, setProvisioningCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validationError = (): string | null => {
    if (newPassword.length < LOCAL_PASSWORD_MIN_LENGTH) return `Senha local precisa de ≥ ${LOCAL_PASSWORD_MIN_LENGTH} caracteres`;
    if (newPassword.length > LOCAL_PASSWORD_MAX_LENGTH) return `Senha local não pode exceder ${LOCAL_PASSWORD_MAX_LENGTH} caracteres`;
    if (newPassword !== confirmPassword) return "As senhas não conferem";
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validationError();
    if (problem) {
      toast({ title: problem, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      try {
        await sessionClient.firstAccess({ email: email.trim(), newPassword, provisioningCode });
      } catch (error) {
        const code = error instanceof ApiError ? error.code : undefined;
        const fallback = error instanceof Error ? error.message : "Falha ao definir senha local.";
        toast({ title: "Não foi possível definir a senha local", description: bootstrapErrorMessage(code, fallback), variant: "destructive" });
        return;
      }
      try {
        await sessionClient.login(email.trim(), newPassword);
      } catch (error) {
        toast({
          title: "Senha gravada, mas falha no login local",
          description: error instanceof Error ? error.message : "Falha ao iniciar sessão local",
          variant: "destructive",
        });
        return;
      }
      // Senha nunca fica em memória depois do sucesso.
      setNewPassword("");
      setConfirmPassword("");
      setProvisioningCode("");
      rememberedEmail.save(email.trim());
      toast({ title: "Senha local cadastrada", description: "Nas próximas vezes utilize este email e esta senha para entrar." });
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginPageShell
      modeBadge={{ icon: Server, label: "Modo Local · Admin API" }}
      title="Primeiro acesso"
      subtitle="Defina a senha local deste usuário. Ela ficará guardada na base PostgreSQL deste servidor para os próximos logins."
      footerNote="Autenticação via Admin API · Dados no PostgreSQL local"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Conta:</span>{" "}
          <span className="font-mono text-foreground/90">{email.trim()}</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bootstrap-new-password">Nova senha local</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="bootstrap-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-9"
              placeholder={`Mínimo ${LOCAL_PASSWORD_MIN_LENGTH} caracteres`}
              disabled={submitting}
              autoFocus
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bootstrap-confirm-password">Confirmar senha</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="bootstrap-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-9"
              placeholder="Repita a senha"
              disabled={submitting}
            />
          </div>
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">As senhas não conferem.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bootstrap-code">Código de primeiro acesso</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="bootstrap-code"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={provisioningCode}
              onChange={(e) => setProvisioningCode(e.target.value)}
              className="pl-9 font-mono text-xs"
              placeholder="Cole aqui o código, se solicitado"
              disabled={submitting}
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Exigido apenas em servidores configurados para isso. O administrador gera o código no painel da nuvem (menu
            Infra → Códigos de primeiro acesso).
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || newPassword.length < LOCAL_PASSWORD_MIN_LENGTH || newPassword !== confirmPassword}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A gravar…
              </>
            ) : (
              "Cadastrar senha"
            )}
          </Button>
          <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-foreground" disabled={submitting} onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </LoginPageShell>
  );
}
```

Conferir a quebra de linha do parágrafo "Exigido apenas…" contra o legado: o texto renderizado é o mesmo, o JSX pode quebrar em outra coluna.

- [ ] **Step 10: Implementar `LanLoginForm.tsx`**

JSX idêntico ao ramo `urlFromBuildEnv` (linhas 994–1052) + botão "Limpar dados salvos" (1053–1080) de `LEGACY/src/pages/LoginPage.tsx`.
```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eraser, Loader2, Lock, Mail, Server } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useToast } from "@/shared/ui/use-toast";
import { ApiError } from "@/shared/http/api-error";
import { sessionClient } from "@/shared/session/session-client";
import { BootstrapPasswordForm } from "./BootstrapPasswordForm";
import { LoginPageShell } from "./LoginPageShell";
import { NEEDS_BOOTSTRAP_CODES } from "./login-messages";
import { rememberedEmail } from "./remembered-email";
import { useExpiredSessionNotice } from "./use-expired-session-notice";

export function LanLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  useExpiredSessionNotice(useSearchParams());

  useEffect(() => setEmail(rememberedEmail.read()), []);

  const handleLoginFailure = (error: unknown) => {
    if (error instanceof ApiError && NEEDS_BOOTSTRAP_CODES.has(error.code)) {
      setBootstrapping(true);
      toast({ title: "Primeiro acesso neste equipamento", description: "Defina uma senha local para esta base." });
      return;
    }
    if (error instanceof ApiError && error.code === "user_inactive") {
      toast({ title: "Usuário inativo", description: "Esta conta foi desativada. Contacte o administrador.", variant: "destructive" });
      return;
    }
    if (error instanceof ApiError && error.code === "backend_unreachable") {
      toast({ title: "URL da Admin API inacessível", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Não foi possível entrar",
      description: error instanceof Error ? error.message : "Falha no login",
      variant: "destructive",
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast({ title: "Preencha email e senha", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await sessionClient.login(trimmedEmail, password);
      rememberedEmail.save(trimmedEmail);
      toast({ title: "Sessão iniciada" });
      router.replace("/");
    } catch (error) {
      handleLoginFailure(error);
    } finally {
      setPassword("");
      setSubmitting(false);
    }
  };

  const clearSavedData = () => {
    rememberedEmail.clear();
    setEmail("");
    toast({ title: "Dados salvos removidos", description: "Email e URL da Admin API foram apagados deste navegador." });
  };

  if (bootstrapping) {
    return <BootstrapPasswordForm email={email} onCancel={() => setBootstrapping(false)} onDone={() => router.replace("/")} />;
  }

  return (
    <LoginPageShell
      modeBadge={{ icon: Server, label: "Modo Local · Admin API" }}
      title="Bem-vindo de volta"
      subtitle="Acesse sua conta para gerenciar totens, NFC-e e sincronização neste servidor."
      footerNote="Autenticação via Admin API · Dados no PostgreSQL local"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-foreground">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 h-11 bg-card/60 border-border focus-visible:border-primary"
              placeholder="admin@local.dev"
              disabled={submitting}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-foreground">
            Senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 h-11 bg-card/60 border-border focus-visible:border-primary"
              disabled={submitting}
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-11 glow-primary bg-primary hover:bg-primary/90" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A entrar…
            </>
          ) : (
            "Entrar"
          )}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="w-full text-muted-foreground" disabled={submitting} onClick={clearSavedData}>
          <Eraser className="mr-2 h-4 w-4" />
          Limpar dados salvos
        </Button>
      </form>
    </LoginPageShell>
  );
}
```

- [ ] **Step 11: Página `/login`**

`src/app/login/page.tsx`:
```tsx
import { Suspense } from "react";
import { getServerConfig } from "@/server/gateway";
import { CloudLoginForm } from "@/shared/session/login/CloudLoginForm";
import { LanLoginForm } from "@/shared/session/login/LanLoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const { backend } = getServerConfig();
  return <Suspense>{backend === "cloud" ? <CloudLoginForm /> : <LanLoginForm />}</Suspense>;
}
```

- [ ] **Step 12: Rodar testes, typecheck e lint**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: PASS; sem erros.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(login): telas de login e primeiro acesso idênticas ao legado

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Redefinição de senha (única parte com Supabase)

**Files:**
- Create: `src/shared/session/reset/password-recovery.ts`, `src/shared/session/reset/ResetPasswordPage.tsx`, `src/app/reset-password/page.tsx`
- Test: `src/shared/session/reset/ResetPasswordPage.test.tsx`

**Interfaces:**
- Produces: `readRecoveryLink(search: string, hash: string): { kind: "token_hash"; tokenHash: string } | { kind: "session"; accessToken: string; refreshToken: string } | null`; `verifyRecoveryToken(tokenHash): Promise<boolean>`; `adoptRecoverySession(accessToken, refreshToken): Promise<boolean>`; `updatePassword(password): Promise<void>` (lança `Error` PT-BR).

**Referência obrigatória (JSX idêntico):** `LEGACY/src/pages/ResetPasswordPage.tsx` linhas 136–220.

- [ ] **Step 1: Teste (falha)**

`src/shared/session/reset/ResetPasswordPage.test.tsx`:
```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "@/shared/ui/primitives/toaster";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
const recovery = { verifyRecoveryToken: vi.fn(), adoptRecoverySession: vi.fn(), updatePassword: vi.fn() };
vi.mock("./password-recovery", async (original) => ({ ...(await original<object>()), ...recovery }));

const { ResetPasswordPage } = await import("./ResetPasswordPage");
const { readRecoveryLink } = await import("./password-recovery");

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/reset-password");
});

describe("readRecoveryLink", () => {
  it("reconhece o link novo com token_hash", () => {
    expect(readRecoveryLink("?type=recovery&token_hash=abc", "")).toEqual({ kind: "token_hash", tokenHash: "abc" });
  });
  it("reconhece o link antigo com a sessão no hash", () => {
    expect(readRecoveryLink("", "#type=recovery&access_token=a&refresh_token=r")).toEqual({ kind: "session", accessToken: "a", refreshToken: "r" });
  });
  it("sem link de recuperação devolve null", () => {
    expect(readRecoveryLink("", "")).toBeNull();
  });
});

describe("ResetPasswordPage", () => {
  it("sem link mostra 'Link inválido ou expirado.'", async () => {
    render(<ResetPasswordPage />);
    expect(await screen.findByText("Link inválido ou expirado.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar ao login" }));
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("link válido permite gravar a nova senha", async () => {
    window.history.replaceState({}, "", "/reset-password?type=recovery&token_hash=abc");
    recovery.verifyRecoveryToken.mockResolvedValue(true);
    recovery.updatePassword.mockResolvedValue(undefined);
    render(<><ResetPasswordPage /><Toaster /></>);
    await userEvent.type(await screen.findByLabelText("Nova senha"), "novasenha1");
    await userEvent.type(screen.getByLabelText("Confirmar nova senha"), "novasenha1");
    await userEvent.click(screen.getByRole("button", { name: "Guardar nova senha" }));
    await waitFor(() => expect(recovery.updatePassword).toHaveBeenCalledWith("novasenha1"));
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("senha curta é recusada antes de chamar o Supabase", async () => {
    window.history.replaceState({}, "", "/reset-password?type=recovery&token_hash=abc");
    recovery.verifyRecoveryToken.mockResolvedValue(true);
    render(<><ResetPasswordPage /><Toaster /></>);
    await userEvent.type(await screen.findByLabelText("Nova senha"), "123");
    await userEvent.type(screen.getByLabelText("Confirmar nova senha"), "123");
    await userEvent.click(screen.getByRole("button", { name: "Guardar nova senha" }));
    expect(await screen.findByText("Senha fraca")).toBeInTheDocument();
    expect(recovery.updatePassword).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/shared/session/reset`
Expected: FAIL.

- [ ] **Step 3: Implementar `password-recovery.ts`**

```ts
"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * O ÚNICO ponto do painel que fala com o Supabase: o link de recuperação do e-mail é
 * emitido e validado por ele, e a API não tem rota equivalente.
 */
let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("A troca de senha precisa de NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  client = createClient(url, key, { auth: { persistSession: false, detectSessionInUrl: false } });
  return client;
}

export type RecoveryLink =
  | { kind: "token_hash"; tokenHash: string }
  | { kind: "session"; accessToken: string; refreshToken: string };

export function readRecoveryLink(search: string, hash: string): RecoveryLink | null {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  if ((query.get("type") ?? fragment.get("type")) !== "recovery") return null;
  const tokenHash = query.get("token_hash") ?? fragment.get("token_hash");
  if (tokenHash) return { kind: "token_hash", tokenHash };
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken };
  return null;
}

export async function verifyRecoveryToken(tokenHash: string): Promise<boolean> {
  const { error } = await supabase().auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  return !error;
}

/** Links antigos (via /auth/v1/verify) já trazem a sessão no hash. */
export async function adoptRecoverySession(accessToken: string, refreshToken: string): Promise<boolean> {
  const { error } = await supabase().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  return !error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 4: Implementar `ResetPasswordPage.tsx`**

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useToast } from "@/shared/ui/use-toast";
import { APP_VERSION_LABEL } from "@/shared/version";
import { adoptRecoverySession, readRecoveryLink, updatePassword, verifyRecoveryToken } from "./password-recovery";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const link = readRecoveryLink(window.location.search, window.location.hash);
    const verify = async () => {
      if (!link) return false;
      return link.kind === "token_hash"
        ? verifyRecoveryToken(link.tokenHash)
        : adoptRecoverySession(link.accessToken, link.refreshToken);
    };
    verify()
      .catch(() => false)
      .then((ok) => {
        if (!active) return;
        setValidLink(ok);
        setChecking(false);
        if (ok) window.history.replaceState({}, document.title, "/reset-password");
        else if (link) toast({ title: "Link inválido ou expirado", variant: "destructive" });
      });
    return () => {
      active = false;
    };
  }, [toast]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({ title: "Senha fraca", description: "Mínimo 8 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      toast({ title: "Senha atualizada", description: "Faça login com a nova senha." });
      router.replace("/login");
    } catch (error) {
      toast({
        title: "Não foi possível atualizar",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl font-heading text-foreground">Nova senha</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">Defina a sua nova senha de acesso. v{APP_VERSION_LABEL}</CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando link de recuperação…
            </div>
          ) : !validLink ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
              <p className="font-medium">Link inválido ou expirado.</p>
              <p className="mt-1 text-muted-foreground">Solicite um novo email de recuperação a partir da tela de login.</p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => router.replace("/login")}>
                Voltar ao login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password" className="text-foreground">
                  Nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-background border-input"
                    placeholder="••••••••"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm" className="text-foreground">
                  Confirmar nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="pl-9 bg-background border-input"
                    placeholder="••••••••"
                    disabled={submitting}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A guardar…
                  </>
                ) : (
                  "Guardar nova senha"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

`src/app/reset-password/page.tsx`:
```tsx
import { ResetPasswordPage } from "@/shared/session/reset/ResetPasswordPage";

export default function Page() {
  return <ResetPasswordPage />;
}
```

- [ ] **Step 5: Rodar os testes**

Run: `npx vitest run src/shared/session/reset`
Expected: PASS (6 testes).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(reset): redefinição de senha isolada no único ponto com Supabase

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Layout do painel — sidebar, cabeçalho, seletor de loja e 404

**Files:**
- Create: `src/shared/layout/nav-items.ts`, `src/shared/layout/external-access.ts`
- Create: `src/shared/layout/AppSidebar.tsx`, `src/shared/layout/RuntimeModeBadge.tsx`, `src/shared/layout/HeaderStoreInfo.tsx`, `src/shared/layout/UserMenu.tsx`, `src/shared/layout/CompanySelectionModal.tsx`, `src/shared/layout/StoreGate.tsx`, `src/shared/layout/AppLayout.tsx`, `src/shared/layout/ErrorBoundary.tsx`, `src/shared/layout/NotFound.tsx`
- Create: `src/app/(panel)/layout.tsx`, `src/app/(panel)/page.tsx`, `src/app/(panel)/not-found.tsx`, `src/app/(panel)/[...missing]/page.tsx`
- Test: `src/shared/layout/nav-items.test.ts`, `src/shared/layout/external-access.test.ts`, `src/shared/layout/AppLayout.test.tsx`

**Interfaces:**
- Consumes: `useRuntime`, `useTenant`, `sessionClient`, `apiRequest`, primitivas.
- Produces:
  - `interface NavItem { title: string; url: string; icon: LucideIcon; external?: "billing" | "ai-credits" }`, `interface NavGroup { label: string; items: NavItem[] }`
  - `buildNavGroups(input: { backend: "cloud" | "lan"; isSystemAdmin: boolean; isCompanyAdmin: boolean }): NavGroup[]`
  - `isNavItemActive(pathname: string, url: string): boolean`
  - `buildSsoUrl(baseUrl: string, tokenHash: string): string`; `useExternalAccess(): { openBilling(): Promise<void>; openAiCredits(): Promise<void>; openSupport(): Promise<void>; billingLoading: boolean; supportLoading: boolean }`

**Referências obrigatórias (JSX idêntico):** `LEGACY/src/components/AppSidebar.tsx`, `AppLayout.tsx`, `RuntimeModeBadge.tsx` (linhas 82–101), `HeaderStoreInfo.tsx`, `CompanySelectionModal.tsx`, `ErrorBoundary.tsx`, `pages/NotFound.tsx`.

Diferenças permitidas em relação ao legado (todas sem efeito visual no navegador):
- `style={{ WebkitAppRegion: ... }}` do cabeçalho sai (só servia à janela do Electron).
- Removidos: badge "PG conectado", badge/banner Mock, `DesktopAppInstallPrompt`.
- `HeaderStoreInfo` fica sem `LicensePlanBadge` e sem o aviso de licença até a Fase 5.
- Sidebar: o item "Sair" executa logout nos dois backends (o legado mostrava "Sair" nesses mesmos modos).

- [ ] **Step 1: Testes da navegação e do SSO (falham)**

`src/shared/layout/nav-items.test.ts`:
```ts
import { buildNavGroups, isNavItemActive } from "./nav-items";

const titles = (groups: ReturnType<typeof buildNavGroups>) => groups.flatMap((g) => g.items.map((i) => i.title));

describe("buildNavGroups", () => {
  it("mantém os grupos e a ordem do legado", () => {
    const groups = buildNavGroups({ backend: "cloud", isSystemAdmin: false, isCompanyAdmin: false });
    expect(groups.map((g) => g.label)).toEqual(["Visão Geral", "Operação", "Cadastros", "Infra / Serviços", "Falar com o suporte"]);
    expect(titles(groups)).toEqual([
      "Dashboard", "Receitas", "Comandas", "Transações", "NFC-e", "Produtos", "Unidades", "Emitente NFC-e",
      "Sincronização", "Totens", "PIXnoPDV", "Agentes de Serviço", "Planos", "Créditos IA", "Manual",
    ]);
  });

  it("modo loja ganha o Espelho FB↔PG", () => {
    expect(titles(buildNavGroups({ backend: "lan", isSystemAdmin: false, isCompanyAdmin: false }))).toContain("Espelho FB↔PG");
    expect(titles(buildNavGroups({ backend: "cloud", isSystemAdmin: false, isCompanyAdmin: false }))).not.toContain("Espelho FB↔PG");
  });

  it("nuvem: admin da empresa vê códigos de primeiro acesso; admin do sistema vê também a auditoria", () => {
    const companyAdmin = titles(buildNavGroups({ backend: "cloud", isSystemAdmin: false, isCompanyAdmin: true }));
    expect(companyAdmin).toContain("Códigos de primeiro acesso");
    expect(companyAdmin).not.toContain("Logs de Auditoria");
    const systemAdmin = titles(buildNavGroups({ backend: "cloud", isSystemAdmin: true, isCompanyAdmin: false }));
    expect(systemAdmin).toContain("Códigos de primeiro acesso");
    expect(systemAdmin).toContain("Logs de Auditoria");
  });
});

describe("isNavItemActive (mesma regra do NavLink do legado)", () => {
  it("'/' só é ativo na raiz", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/products", "/")).toBe(false);
  });
  it("demais itens ficam ativos nas subrotas", () => {
    expect(isNavItemActive("/nfce/123", "/nfce")).toBe(true);
    expect(isNavItemActive("/nfce-issuer", "/nfce")).toBe(false);
    expect(isNavItemActive("/sync/espelho", "/sync")).toBe(true);
  });
});
```

`src/shared/layout/external-access.test.ts`:
```ts
import { buildSsoUrl } from "./external-access";

describe("buildSsoUrl", () => {
  it("monta o /sso do EasyBilling preservando o destino, como o legado", () => {
    expect(buildSsoUrl("https://billing.easysoftcloud.com.br/modules/easycommandpay", "abc")).toBe(
      "https://billing.easysoftcloud.com.br/sso?sso_token=abc&sso_type=magiclink&next=%2Fmodules%2Feasycommandpay",
    );
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/shared/layout`
Expected: FAIL.

- [ ] **Step 3: Implementar `nav-items.ts` e `external-access.ts`**

`src/shared/layout/nav-items.ts`:
```ts
import {
  ArrowLeftRight, BookOpen, Building2, ClipboardList, CreditCard, FileText, KeyRound, LayoutDashboard,
  Monitor, Package, QrCode, Receipt, RefreshCw, Ruler, ScrollText, Server, Sparkles, TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Abre o EasyBilling numa aba nova em vez de navegar. */
  external?: "billing" | "ai-credits";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const SUPPORT_GROUP_LABEL = "Falar com o suporte";
const INFRA_GROUP_LABEL = "Infra / Serviços";

const BASE_GROUPS: NavGroup[] = [
  { label: "Visão Geral", items: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Receitas", url: "/receitas", icon: TrendingUp },
  ] },
  { label: "Operação", items: [
    { title: "Comandas", url: "/orders", icon: ClipboardList },
    { title: "Transações", url: "/transactions", icon: CreditCard },
    { title: "NFC-e", url: "/nfce", icon: FileText },
  ] },
  { label: "Cadastros", items: [
    { title: "Produtos", url: "/products", icon: Package },
    { title: "Unidades", url: "/units", icon: Ruler },
    { title: "Emitente NFC-e", url: "/nfce-issuer", icon: Building2 },
  ] },
  { label: INFRA_GROUP_LABEL, items: [
    { title: "Sincronização", url: "/sync", icon: RefreshCw },
    { title: "Totens", url: "/totems", icon: Monitor },
    { title: "PIXnoPDV", url: "/pixnopdv", icon: QrCode },
    { title: "Agentes de Serviço", url: "/agents", icon: Server },
    { title: "Planos", url: "/billing", icon: Receipt, external: "billing" },
    { title: "Créditos IA", url: "/ai-credits", icon: Sparkles, external: "ai-credits" },
  ] },
  { label: SUPPORT_GROUP_LABEL, items: [{ title: "Manual", url: "/manual", icon: BookOpen }] },
];

export function buildNavGroups(input: { backend: "cloud" | "lan"; isSystemAdmin: boolean; isCompanyAdmin: boolean }): NavGroup[] {
  const cloud = input.backend === "cloud";
  const extras: Record<string, NavItem[]> = {
    [INFRA_GROUP_LABEL]: [
      ...(cloud ? [] : [{ title: "Espelho FB↔PG", url: "/sync/espelho", icon: ArrowLeftRight }]),
      ...(cloud && (input.isSystemAdmin || input.isCompanyAdmin)
        ? [{ title: "Códigos de primeiro acesso", url: "/bootstrap-codes", icon: KeyRound }]
        : []),
    ],
    [SUPPORT_GROUP_LABEL]: cloud && input.isSystemAdmin ? [{ title: "Logs de Auditoria", url: "/audit-logs", icon: ScrollText }] : [],
  };
  return BASE_GROUPS.map((group) => ({ ...group, items: [...group.items, ...(extras[group.label] ?? [])] }));
}

export function isNavItemActive(pathname: string, url: string): boolean {
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}
```

`src/shared/layout/external-access.ts`:
```ts
"use client";

import { useCallback, useState } from "react";
import { apiRequest } from "@/shared/http/api-client";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useToast } from "@/shared/ui/use-toast";

export function buildSsoUrl(baseUrl: string, tokenHash: string): string {
  const url = new URL(baseUrl);
  const next = `${url.pathname}${url.search}${url.hash}` || "/";
  const sso = new URL("/sso", `${url.protocol}//${url.host}`);
  sso.searchParams.set("sso_token", tokenHash);
  sso.searchParams.set("sso_type", "magiclink");
  sso.searchParams.set("next", next);
  return sso.toString();
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Tente novamente em instantes.");

/** EasyBilling (Planos, Créditos IA) e suporte. Na loja não há SSO: abre o endereço direto. */
export function useExternalAccess() {
  const { backend, adminPlatformUrl } = useRuntime();
  const { toast } = useToast();
  const [billingLoading, setBillingLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  const openAdmin = useCallback(
    async (path: string, errorTitle: string) => {
      if (billingLoading) return;
      setBillingLoading(true);
      try {
        const base = `${adminPlatformUrl}${path}`;
        let target = base;
        if (backend === "cloud") {
          const { token_hash: tokenHash } = await apiRequest<{ token_hash?: string }>("/auth/derived-session", { method: "POST", body: {} });
          if (!tokenHash) throw new Error("O servidor não devolveu o link de acesso.");
          target = buildSsoUrl(base, tokenHash);
        }
        window.open(target, "_blank", "noopener,noreferrer");
      } catch (error) {
        toast({ title: errorTitle, description: errorMessage(error), variant: "destructive" });
      } finally {
        setBillingLoading(false);
      }
    },
    [adminPlatformUrl, backend, billingLoading, toast],
  );

  const openSupport = useCallback(async () => {
    if (supportLoading) return;
    if (backend !== "cloud") {
      toast({ title: "Suporte indisponível", description: "Indisponível nesta instalação.", variant: "destructive" });
      return;
    }
    setSupportLoading(true);
    const popup = window.open("about:blank", "_blank");
    try {
      const { redirect_url: redirectUrl } = await apiRequest<{ redirect_url?: string }>("/auth/sso/support", { method: "POST", body: {} });
      if (!redirectUrl) throw new Error("Falha ao gerar acesso ao suporte.");
      if (popup) popup.location.href = redirectUrl;
      else window.location.href = redirectUrl;
    } catch (error) {
      popup?.close();
      toast({ title: "Suporte indisponível", description: errorMessage(error), variant: "destructive" });
    } finally {
      setSupportLoading(false);
    }
  }, [backend, supportLoading, toast]);

  return {
    openBilling: () => openAdmin("/modules/easycommandpay", "Não foi possível abrir o EasyBilling"),
    openAiCredits: () => openAdmin("/ai-credits", "Não foi possível abrir os Créditos IA"),
    openSupport,
    billingLoading,
    supportLoading,
  };
}
```

Run: `npx vitest run src/shared/layout/nav-items.test.ts src/shared/layout/external-access.test.ts` → Expected: PASS.

- [ ] **Step 4: `AppSidebar.tsx`**

JSX idêntico a `LEGACY/src/components/AppSidebar.tsx` (linhas 124–284), sem os trechos de mock:
```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, Headset, Loader2, LogOut } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/shared/ui/primitives/sidebar";
import { cn } from "@/shared/ui/cn";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useTenant } from "@/shared/tenant/tenant-context";
import { sessionClient } from "@/shared/session/session-client";
import { APP_VERSION_LABEL } from "@/shared/version";
import { SUPPORT_GROUP_LABEL, buildNavGroups, isNavItemActive, type NavItem } from "./nav-items";
import { useExternalAccess } from "./external-access";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();
  const router = useRouter();
  const { backend } = useRuntime();
  const { isSystemAdmin, isCompanyAdmin } = useTenant();
  const { openBilling, openAiCredits, openSupport, billingLoading, supportLoading } = useExternalAccess();
  const navGroups = buildNavGroups({ backend, isSystemAdmin, isCompanyAdmin });

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const handleSignOut = async () => {
    await sessionClient.logout().catch(() => undefined);
    router.replace("/login");
  };

  const renderExternal = (item: NavItem) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        onClick={() => {
          handleNavClick();
          void (item.external === "billing" ? openBilling() : openAiCredits());
        }}
        disabled={billingLoading}
        tooltip={item.title}
        className="hover:bg-sidebar-accent/50 transition-colors"
      >
        {billingLoading ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <item.icon className="mr-2 h-4 w-4 shrink-0" />}
        {!collapsed && (
          <span className="flex flex-1 items-center justify-between">
            <span>{item.title}</span>
            <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
          </span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderLink = (item: NavItem) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild>
        <Link
          href={item.url}
          onClick={handleNavClick}
          className={cn(
            "hover:bg-sidebar-accent/50 transition-colors",
            isNavItemActive(pathname, item.url) && "bg-sidebar-accent text-primary font-medium",
          )}
        >
          <item.icon className="mr-2 h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`px-4 py-5 ${collapsed ? "px-2" : ""}`}>
          {!collapsed ? (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">
                <span className="text-primary">Easy</span>FoodManager
              </h1>
              <p className="mt-0.5 text-xs text-sidebar-foreground/50">Admin v{APP_VERSION_LABEL}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-primary font-bold text-lg">E</span>
            </div>
          )}
        </div>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.label === SUPPORT_GROUP_LABEL && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={openSupport}
                      disabled={supportLoading}
                      tooltip="Falar com o suporte"
                      className="hover:bg-sidebar-accent/50 transition-colors"
                    >
                      {supportLoading ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Headset className="mr-2 h-4 w-4 shrink-0" />}
                      {!collapsed && (
                        <span className="flex flex-1 items-center justify-between">
                          <span>Falar com o suporte</span>
                          <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {group.items.map((item) => (item.external ? renderExternal(item) : renderLink(item)))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} className="hover:bg-destructive/20 text-destructive transition-colors cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
```

- [ ] **Step 5: `RuntimeModeBadge.tsx`, `HeaderStoreInfo.tsx`, `UserMenu.tsx`**

`src/shared/layout/RuntimeModeBadge.tsx` (JSX das linhas 82–101 do legado; textos dos ramos "EasyFoodAPI" e "Admin API"):
```tsx
"use client";

import { CloudCog } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { useRuntime } from "@/shared/runtime/runtime-context";

export function RuntimeModeBadge() {
  const { backend, apiDisplayOrigin } = useRuntime();
  const badge =
    backend === "cloud"
      ? {
          label: "Cloud",
          detail: "EasyFoodAPI",
          className: "border-primary/30 bg-primary/10 text-primary",
          tooltip: "Modo 3 via EasyFoodAPI: o navegador fala só com a API, que fala com o banco. Sem conexão direta ao Supabase.",
        }
      : {
          label: "Admin API",
          detail: apiDisplayOrigin,
          className: "border-info/30 bg-info/10 text-info",
          tooltip: `Modo 2: Browser conectado à Admin API HTTP em ${apiDisplayOrigin}. Banco PG é acessado pelo backend local.`,
        };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`mr-2 hidden min-w-0 max-w-[min(100%,22rem)] cursor-help items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium sm:flex sm:px-3 ${badge.className}`}
          >
            <CloudCog className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="shrink-0">{badge.label}</span>
            {badge.detail && <span className="truncate opacity-80">{badge.detail}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {badge.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

`src/shared/layout/HeaderStoreInfo.tsx` (JSX de `LEGACY/src/components/HeaderStoreInfo.tsx` sem os blocos `plan`/`license`, que voltam na Fase 5):
```tsx
"use client";

import { Building2, ChevronDown, Store } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/cn";
import { useTenant } from "@/shared/tenant/tenant-context";

export function HeaderStoreInfo({ onOpenModal }: { onOpenModal(): void }) {
  const { selectedCompany, selectedStore, companies, storesByCompany } = useTenant();
  if (!selectedCompany) return null;

  const storeCount = Object.values(storesByCompany).flat().length;
  const canChange = companies.length > 1 || storeCount > 1;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => canChange && onOpenModal()}
      className={cn(
        "mr-1 flex h-auto items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2 py-1 text-xs text-foreground hover:bg-primary/10 sm:mr-2 sm:gap-2 sm:px-3",
        !canChange && "cursor-default hover:bg-primary/5",
      )}
      title={canChange ? "Trocar empresa/loja" : selectedCompany.name}
    >
      <Building2 className="hidden h-3.5 w-3.5 shrink-0 text-primary sm:inline-block" aria-hidden />
      <span className="hidden max-w-[160px] truncate font-medium sm:inline-block">{selectedCompany.name}</span>
      {selectedStore && (
        <>
          <span className="hidden text-muted-foreground sm:inline-block">/</span>
          <Store className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="max-w-[100px] truncate sm:max-w-[160px]">
            {selectedStore.legacy_store_code} – {selectedStore.trade_name}
          </span>
        </>
      )}
      {canChange && <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:inline-block" />}
    </Button>
  );
}
```

O legado considera `availableStores` (lojas da empresa selecionada) em `canChange`; aqui o total de lojas do usuário produz o mesmo resultado para quem tem uma empresa, e habilita a troca quando há lojas em outras empresas — que o modal do legado também mostra.

`src/shared/layout/UserMenu.tsx` (JSX das linhas 244–273 do `AppLayout` legado):
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, LogOut, User } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/primitives/dropdown-menu";
import { useToast } from "@/shared/ui/use-toast";
import { sessionClient } from "@/shared/session/session-client";

export function UserMenu() {
  const router = useRouter();
  const { toast } = useToast();
  const [resetLoading, setResetLoading] = useState(false);
  const { data: user } = useQuery({ queryKey: ["session", "user"], queryFn: sessionClient.currentUser, staleTime: 5 * 60_000 });
  const email = user?.email;
  if (!email) return null;

  const handleResetPassword = async () => {
    setResetLoading(true);
    try {
      await sessionClient.requestPasswordReset(email);
      toast({ title: "Email enviado", description: "Verifique a sua caixa de entrada para redefinir a senha." });
    } catch (error) {
      toast({ title: "Erro ao enviar email", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignOut = async () => {
    await sessionClient.logout().catch(() => undefined);
    router.replace("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <User className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Perfil</p>
            <p className="text-xs leading-none text-muted-foreground truncate">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleResetPassword} disabled={resetLoading}>
          <KeyRound className="mr-2 h-4 w-4" />
          <span>{resetLoading ? "A enviar…" : "Redefinir senha"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Terminar sessão</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 6: `CompanySelectionModal.tsx`**

Copiar `LEGACY/src/components/CompanySelectionModal.tsx` e adaptar **só a origem dos dados**, mantendo todo o JSX:
```bash
cp ../easyfoodmanagerWEB/src/components/CompanySelectionModal.tsx src/shared/layout/CompanySelectionModal.tsx
```
Depois editar:
1. Primeira linha: `"use client";`
2. Imports: primitivas de `@/shared/ui/primitives/*`, `cn` de `@/shared/ui/cn`, `useAutoHideScroll` de `@/shared/ui/use-auto-hide-scroll`, `useTenant` de `@/shared/tenant/tenant-context`, tipos `Company`/`Store as StoreType` de `@/shared/tenant/tenant`.
3. Substituir o bloco de `useCompanyStore()` e os dois `useEffect`/`handleRefresh`/`handleConfirm` por:
```tsx
  const { companies: availableCompanies, storesByCompany: allStoresByCompany, loading, select, selection, refresh } = useTenant();
  const allStoresLoaded = !loading;
  const selectedCompanyId = selection?.companyId ?? null;
  const selectedStoreId = selection?.storeId ?? null;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPair, setSelectedPair] = useState<{ companyId: string; storeId: string } | null>(selection);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleConfirm = () => {
    if (selectedPair) {
      select(selectedPair.companyId, selectedPair.storeId);
      onOpenChange?.(false);
    }
  };
```
4. O legado compartilhava um único `scrollRef` entre todos os cartões (só o último recebia o efeito). Extrair o `<div ref={scrollRef} className="divide-y ... autohide-scroll">` para um componente local no mesmo arquivo, com as **mesmas classes**, que chama `useAutoHideScroll` para si:
```tsx
function StoreList({ children }: { children: ReactNode }) {
  const scrollRef = useAutoHideScroll<HTMLDivElement>();
  return (
    <div ref={scrollRef} className="divide-y divide-border/30 max-h-[40vh] sm:max-h-[44vh] overflow-y-auto overscroll-contain autohide-scroll">
      {children}
    </div>
  );
}
```
e usar `<StoreList>…</StoreList>` no lugar do `<div ref={scrollRef} …>`. Adicionar `type ReactNode` ao import de `react` e remover `useEffect` se ficar sem uso.

Conferir que o JSX é o mesmo:
```bash
diff <(grep -o 'className="[^"]*"' ../easyfoodmanagerWEB/src/components/CompanySelectionModal.tsx | sort) <(grep -o 'className="[^"]*"' src/shared/layout/CompanySelectionModal.tsx | sort)
```
Expected: sem saída.

- [ ] **Step 7: `StoreGate.tsx`, `ErrorBoundary.tsx`, `NotFound.tsx`, `AppLayout.tsx`**

`src/shared/layout/StoreGate.tsx` (JSX das linhas 281–305 do `AppLayout` legado):
```tsx
"use client";

import { CloudCog } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";

export function StoreGate({ loading, onSelect }: { loading: boolean; onSelect(): void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <CloudCog className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          {loading ? "Carregando empresas e lojas…" : "Selecione uma loja para continuar"}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {loading
            ? "Aguarde enquanto carregamos os acessos da sua conta."
            : "Para acessar os dados é necessário escolher a empresa e a loja onde deseja trabalhar."}
        </p>
      </div>
      {!loading && (
        <Button onClick={onSelect} size="lg" className="font-semibold">
          Selecionar loja
        </Button>
      )}
    </div>
  );
}
```

`src/shared/layout/ErrorBoundary.tsx` — copiar `LEGACY/src/components/ErrorBoundary.tsx`, trocar imports (`@/shared/ui/primitives/button`), adicionar `"use client";`, e em `componentDidCatch` substituir `reportError(...)` por:
```ts
    // Relatório automático volta na Fase 5, pelo servidor do Next.
    console.error("[ErrorBoundary]", error, info.componentStack);
```
O texto exibido não muda.

`src/shared/layout/NotFound.tsx` (JSX idêntico ao `LEGACY/src/pages/NotFound.tsx`, `<a>` preservado):
```tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function NotFound() {
  const pathname = usePathname();
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
}
```

`src/shared/layout/AppLayout.tsx` (JSX de `LEGACY/src/components/AppLayout.tsx` linhas 214–317, sem Electron/Mock/instalação):
```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { SidebarProvider, SidebarTrigger } from "@/shared/ui/primitives/sidebar";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useTenant } from "@/shared/tenant/tenant-context";
import { AppSidebar } from "./AppSidebar";
import { CompanySelectionModal } from "./CompanySelectionModal";
import { HeaderStoreInfo } from "./HeaderStoreInfo";
import { RuntimeModeBadge } from "./RuntimeModeBadge";
import { StoreGate } from "./StoreGate";
import { UserMenu } from "./UserMenu";

/** O modal só abre se a falta de loja persistir ~200ms (evita piscar em recarregamentos). */
const SELECTION_MODAL_DELAY_MS = 200;

export function AppLayout({ children }: { children: ReactNode }) {
  const { backend } = useRuntime();
  const cloud = backend === "cloud";
  const { needsSelection, selectedCompany, selection, loading } = useTenant();
  const [dark, setDark] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!cloud) return;
    if (!needsSelection) {
      setModalOpen(false);
      return;
    }
    const timer = window.setTimeout(() => setModalOpen(true), SELECTION_MODAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [cloud, needsSelection]);

  const reopenIfNeeded = () => {
    if (cloud && needsSelection && !modalOpen) setModalOpen(true);
  };
  const blocked = cloud && !selection;

  return (
    <SidebarProvider>
      <div className="flex h-screen max-h-screen w-full min-h-0 overflow-hidden">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="h-10 flex items-center border-b border-border px-4 gap-2 shrink-0 bg-card/50 backdrop-blur-sm">
            <div>
              <SidebarTrigger />
            </div>
            <div className="ml-2 hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              <span>Desenvolvido por</span>
              {/* eslint-disable-next-line @next/next/no-img-element -- mesmo <img> do legado, sem otimização que mude o pixel */}
              <img src="/easysoft-logo.png" alt="EasySoft" className="h-5 object-contain opacity-80" />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <RuntimeModeBadge />
              {cloud && selectedCompany && <HeaderStoreInfo onOpenModal={() => setModalOpen(true)} />}
              {cloud && <UserMenu />}
              <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} className="h-7 w-7">
                {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </header>
          <main className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6" onClickCapture={reopenIfNeeded}>
            {blocked ? <StoreGate loading={loading} onSelect={() => setModalOpen(true)} /> : children}
          </main>
        </div>
      </div>
      {cloud && <CompanySelectionModal open={modalOpen} onOpenChange={setModalOpen} />}
    </SidebarProvider>
  );
}
```

- [ ] **Step 8: Rotas do painel**

`src/app/(panel)/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { getServerConfig } from "@/server/gateway";
import { RuntimeProvider } from "@/shared/runtime/runtime-context";
import { TenantProvider } from "@/shared/tenant/tenant-context";
import { AppLayout } from "@/shared/layout/AppLayout";
import { ErrorBoundary } from "@/shared/layout/ErrorBoundary";

export const dynamic = "force-dynamic";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { backend, apiDisplayOrigin, adminPlatformUrl } = getServerConfig();
  return (
    <RuntimeProvider value={{ backend, apiDisplayOrigin, adminPlatformUrl }}>
      <TenantProvider>
        <ErrorBoundary>
          <AppLayout>{children}</AppLayout>
        </ErrorBoundary>
      </TenantProvider>
    </RuntimeProvider>
  );
}
```

`src/app/(panel)/page.tsx` (o Dashboard chega na Fase 2; até lá a raiz mostra o painel vazio):
```tsx
export default function HomePage() {
  return null;
}
```

`src/app/(panel)/not-found.tsx`:
```tsx
import { NotFound } from "@/shared/layout/NotFound";

export default function PanelNotFound() {
  return <NotFound />;
}
```

`src/app/(panel)/[...missing]/page.tsx` (rota desconhecida dentro do painel mostra a 404 com o layout, como a rota `*` do legado):
```tsx
import { notFound } from "next/navigation";

export default function MissingPage() {
  notFound();
}
```

- [ ] **Step 9: Teste do layout**

`src/shared/layout/AppLayout.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";

vi.mock("next/navigation", () => ({ usePathname: () => "/nfce/1", useRouter: () => ({ replace: vi.fn() }) }));
const tenant = {
  loading: false, companies: [], storesByCompany: {}, selection: null as null | { companyId: string; storeId: string },
  selectedCompany: null, selectedStore: null, needsSelection: false, isSystemAdmin: false, isCompanyAdmin: false,
  select: vi.fn(), refresh: vi.fn(),
};
vi.mock("@/shared/tenant/tenant-context", () => ({ useTenant: () => tenant }));

const { AppLayout } = await import("./AppLayout");

function renderLayout(runtime: RuntimeInfo) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RuntimeProvider value={runtime}>
        <AppLayout>
          <p>conteúdo</p>
        </AppLayout>
      </RuntimeProvider>
    </QueryClientProvider>,
  );
}

describe("AppLayout", () => {
  it("modo loja: badge Admin API com a origem, conteúdo liberado e item ativo destacado", () => {
    tenant.selection = { companyId: "c", storeId: "s" };
    renderLayout({ backend: "lan", apiDisplayOrigin: "127.0.0.1:4080", adminPlatformUrl: "https://b" });
    expect(screen.getByText("Admin API")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1:4080")).toBeInTheDocument();
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "NFC-e" }).className).toContain("bg-sidebar-accent");
    expect(screen.getByText("Espelho FB↔PG")).toBeInTheDocument();
  });

  it("modo nuvem sem loja bloqueia o conteúdo com o aviso do legado", () => {
    tenant.selection = null;
    renderLayout({ backend: "cloud", apiDisplayOrigin: "api", adminPlatformUrl: "https://b" });
    expect(screen.getByText("Selecione uma loja para continuar")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo")).toBeNull();
    expect(screen.getByText("EasyFoodAPI")).toBeInTheDocument();
  });
});
```

Run: `npx vitest run src/shared/layout && npx tsc --noEmit && npm run lint`
Expected: PASS; sem erros.

- [ ] **Step 10: Build de produção**

Run: `BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4080 npm run build`
Expected: build conclui; rotas `/login`, `/reset-password`, `/`, `/[...missing]`, `/api/*` listadas.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat(layout): sidebar, cabeçalho, seletor de loja e 404 idênticos ao legado

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Regressão visual legado × Next

**Files:**
- Create: `tests/visual/fake-api.ts`, `tests/visual/compare.ts`, `tests/visual/playwright.config.ts`, `tests/visual/visual.spec.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: legado em `LEGACY` (dev server Vite) e este projeto (build de produção).
- Produces: `npm run test:visual` verde = as telas da Fase 1 são idênticas.

Servidores levantados pelo Playwright:

| Nome | Porta | Comando |
|---|---|---|
| fake API loja | 4999 | `node --experimental-strip-types tests/visual/fake-api.ts lan 4999` |
| fake API nuvem | 4998 | `node --experimental-strip-types tests/visual/fake-api.ts cloud 4998` |
| legado loja | 8080 | `npm run dev -- --port 8080 --strictPort` em `LEGACY` com `VITE_API_URL=http://127.0.0.1:4999 VITE_CLOUD_MODE= VITE_CLOUD_API=` |
| legado nuvem | 8081 | `npm run dev -- --port 8081 --strictPort` em `LEGACY` com `VITE_API_URL= VITE_CLOUD_MODE=true VITE_CLOUD_API=true VITE_CLOUD_API_TARGET=http://127.0.0.1:4998` |
| Next loja | 3000 | `npx next start --port 3000` com `BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999` |
| Next nuvem | 3001 | `npx next start --port 3001` com `BACKEND=cloud EASYFOOD_API_URL=http://127.0.0.1:4998` |

- [ ] **Step 1: API falsa determinística**

`tests/visual/fake-api.ts`:
```ts
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const [, , mode = "lan", portArg = "4999"] = process.argv;
const prefix = mode === "cloud" ? "/api/v1" : "/v1";

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "u1", email: "admin@local.dev", typ: "access", exp: 4102444800 })}.fake`;

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "*", ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const cloudStores = [
  { id: "s1", company_id: "c1", trade_name: "Centro", legacy_store_code: "1", store_type: null, is_default: true },
  { id: "s2", company_id: "c1", trade_name: "Norte", legacy_store_code: "2", store_type: null, is_default: false },
];

createServer(async (req, res) => {
  const path = (req.url ?? "").split("?")[0] ?? "";
  if (req.method === "OPTIONS") return send(res, 204, undefined);
  if (path === "/health") return send(res, 200, { ok: true });

  if (path === `${prefix}/auth/login` && req.method === "POST") {
    const { email } = await readJson(req);
    if (mode === "lan" && email === "novo@loja.dev") {
      return send(res, 401, { error: "Senha local ainda não definida.", error_code: "local_password_not_set" });
    }
    if (mode === "lan") return send(res, 200, { access_token: jwt, token_type: "Bearer", expires_in: 28800 });
    return send(res, 200, { user: { id: "u1", email } }, { "set-cookie": "efa_session=fake; Path=/; HttpOnly; SameSite=Lax" });
  }
  if (mode === "cloud") {
    if (path === `${prefix}/auth/me`) return send(res, 200, { id: "u1", email: "admin@nuvem.dev" });
    if (path === `${prefix}/me/context`) {
      return send(res, 200, {
        user: { id: "u1", email: "admin@nuvem.dev" },
        is_system_admin: false,
        is_company_admin: false,
        companies: [{ id: "c1", name: "Empresa Demo", cnpj: "00.000.000/0001-00" }],
      });
    }
    if (path === `${prefix}/me/all-stores` || path === `${prefix}/me/stores`) return send(res, 200, cloudStores);
  }
  if (mode === "lan" && path === `${prefix}/site-identity`) return send(res, 200, { company_id: "cL", store_id: "sL" });
  return send(res, 404, { error: "not_found", message: "Não encontrado." });
}).listen(Number(portArg), "127.0.0.1");
```

- [ ] **Step 2: Comparação de imagens**

`tests/visual/compare.ts`:
```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

/** Tolerância só para anti-aliasing de fonte: até 0,1% dos pixels. */
export const MAX_DIFF_RATIO = 0.001;

export function diffRatio(name: string, legacy: Buffer, next: Buffer): number {
  const a = PNG.sync.read(legacy);
  const b = PNG.sync.read(next);
  if (a.width !== b.width || a.height !== b.height) return 1;
  const diff = new PNG({ width: a.width, height: a.height });
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
  if (changed > 0) {
    mkdirSync("tests/visual/output", { recursive: true });
    writeFileSync(`tests/visual/output/${name}-legacy.png`, legacy);
    writeFileSync(`tests/visual/output/${name}-next.png`, next);
    writeFileSync(`tests/visual/output/${name}-diff.png`, PNG.sync.write(diff));
  }
  return changed / (a.width * a.height);
}
```

- [ ] **Step 3: Configuração do Playwright**

`tests/visual/playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

const LEGACY = "../easyfoodmanagerWEB";

export default defineConfig({
  testDir: ".",
  timeout: 90_000,
  workers: 1,
  use: { colorScheme: "dark", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    { command: "node --experimental-strip-types tests/visual/fake-api.ts lan 4999", url: "http://127.0.0.1:4999/health", cwd: "../.." },
    { command: "node --experimental-strip-types tests/visual/fake-api.ts cloud 4998", url: "http://127.0.0.1:4998/health", cwd: "../.." },
    {
      command: "npm run dev -- --port 8080 --strictPort",
      cwd: `../../${LEGACY}`,
      url: "http://localhost:8080/login",
      env: { VITE_API_URL: "http://127.0.0.1:4999", VITE_CLOUD_MODE: "", VITE_CLOUD_API: "" },
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --port 8081 --strictPort",
      cwd: `../../${LEGACY}`,
      url: "http://localhost:8081/login",
      env: { VITE_API_URL: "", VITE_CLOUD_MODE: "true", VITE_CLOUD_API: "true", VITE_CLOUD_API_TARGET: "http://127.0.0.1:4998" },
      timeout: 120_000,
    },
    {
      command: "npx next start --port 3000",
      cwd: "../..",
      url: "http://localhost:3000/login",
      env: { BACKEND: "lan", EASYFOOD_API_URL: "http://127.0.0.1:4999" },
    },
    {
      command: "npx next start --port 3001",
      cwd: "../..",
      url: "http://localhost:3001/login",
      env: { BACKEND: "cloud", EASYFOOD_API_URL: "http://127.0.0.1:4998" },
    },
  ],
});
```

- [ ] **Step 4: Cenários**

`tests/visual/visual.spec.ts`:
```ts
import { expect, test, type Page } from "@playwright/test";
import { MAX_DIFF_RATIO, diffRatio } from "./compare";

const APPS = {
  lan: { legacy: "http://localhost:8080", next: "http://localhost:3000" },
  cloud: { legacy: "http://localhost:8081", next: "http://localhost:3001" },
} as const;

type Scenario = {
  name: string;
  mode: keyof typeof APPS;
  /** Leva a página ao estado a comparar. Roda igual nos dois apps. */
  reach(page: Page, base: string): Promise<void>;
  /**
   * Recorte da comparação. Padrão: a tela inteira. O cenário da nuvem compara só o
   * seletor: o cabeçalho de nuvem do legado ainda tem plano/licença/IA (Fase 5).
   */
  region?(page: Page): ReturnType<Page["locator"]>;
};

async function login(page: Page, base: string, email: string) {
  await page.goto(`${base}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill("qualquer");
  await page.getByRole("button", { name: "Entrar" }).click();
}

const scenarios: Scenario[] = [
  { name: "login-loja", mode: "lan", reach: async (p, b) => { await p.goto(`${b}/login`); } },
  { name: "login-nuvem", mode: "cloud", reach: async (p, b) => { await p.goto(`${b}/login`); } },
  { name: "reset-sem-link", mode: "lan", reach: async (p, b) => {
    await p.goto(`${b}/reset-password`);
    await p.getByText("Link inválido ou expirado.").waitFor();
  } },
  { name: "primeiro-acesso", mode: "lan", reach: async (p, b) => {
    await login(p, b, "novo@loja.dev");
    await p.getByRole("heading", { name: "Primeiro acesso" }).waitFor();
    await p.getByText("Primeiro acesso neste equipamento").waitFor();
  } },
  { name: "painel-404-loja", mode: "lan", reach: async (p, b) => {
    await login(p, b, "admin@local.dev");
    await p.waitForURL(`${b}/`);
    await p.goto(`${b}/rota-inexistente`);
    await p.getByText("Oops! Page not found").waitFor();
  } },
  { name: "painel-seletor-nuvem", mode: "cloud", reach: async (p, b) => {
    await login(p, b, "admin@nuvem.dev");
    await p.getByText("Selecione onde trabalhar").waitFor();
  }, region: (p) => p.getByRole("dialog") },
];

async function capture(page: Page, scenario: Scenario): Promise<Buffer> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  const options = { animations: "disabled", caret: "hide" } as const;
  return scenario.region ? scenario.region(page).screenshot(options) : page.screenshot(options);
}

for (const scenario of scenarios) {
  test(scenario.name, async ({ browser }, testInfo) => {
    const shots: Buffer[] = [];
    for (const base of [APPS[scenario.mode].legacy, APPS[scenario.mode].next]) {
      const context = await browser.newContext(testInfo.project.use);
      const page = await context.newPage();
      await scenario.reach(page, base);
      shots.push(await capture(page, scenario));
      await context.close();
    }
    const ratio = diffRatio(`${scenario.name}-${testInfo.project.name}`, shots[0]!, shots[1]!);
    expect(ratio, `diferença em ${scenario.name}; ver tests/visual/output`).toBeLessThanOrEqual(MAX_DIFF_RATIO);
  });
}
```

- [ ] **Step 5: Rodar a regressão visual**

```bash
cd /c/Users/crist/Desktop/easyfoodmanagerWEB && npm ci   # só se node_modules não existir
cd /c/Users/crist/Desktop/easyfoodmanagerNEXT
BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999 npm run build
npx playwright install chromium
npm run test:visual
```
Expected: 12 testes (6 cenários × desktop/mobile) PASS.

Quando um cenário falhar, abrir `tests/visual/output/<cenário>-diff.png`, localizar a região e corrigir o **Next** até igualar o legado. Nunca ajustar `MAX_DIFF_RATIO` para passar.

- [ ] **Step 6: README**

`README.md`:
````markdown
# EasyFood Manager (Next.js)

Painel administrativo do EasyFood Manager, só web. Visual idêntico ao painel
legado (`easyfoodmanagerWEB`), sem Electron.

## Rodar

```bash
cp .env.example .env   # escolher BACKEND e EASYFOOD_API_URL
npm install
npm run dev            # http://localhost:3000
```

| `BACKEND` | Backend | Sessão |
|---|---|---|
| `lan` | easyfoodmanagerAPI da loja (porta 4080) | JWT guardado pelo Next em cookie `httpOnly` |
| `cloud` | EasyFoodAPI (porta 3010) | cookie `httpOnly` da própria API |

O navegador só fala com o Next (`/api/session/*` e `/api/v1/*`); o token nunca
fica acessível a JavaScript.

## Verificar

```bash
npm run typecheck
npm run lint
npm test               # unidade e componentes
npm run test:visual    # legado × Next, pixel a pixel (precisa do legado em ../easyfoodmanagerWEB)
```

## Estrutura

- `src/app/` — rotas (páginas finas) e route handlers.
- `src/server/` — só servidor: configuração, gateways de sessão, repasse.
- `src/shared/` — UI copiada do legado, cliente HTTP, sessão, tenant, layout.
- `src/modules/<feature>/` — `domain` → `application` → `infrastructure` → `ui` (Fase 2+).

Spec: `docs/superpowers/specs/2026-09-26-migracao-nextjs-design.md`.
````

- [ ] **Step 7: Verificação final e commit**

Run: `npm run typecheck && npm run lint && npm test && npm run test:visual`
Expected: tudo verde.

```bash
git add -A
git commit -m "test(visual): regressão legado × Next da Fase 1 e README

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```
