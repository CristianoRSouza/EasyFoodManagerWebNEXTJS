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
