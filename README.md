# EasyFood Manager (Next.js)

Painel administrativo do EasyFood Manager, só web. Visual idêntico ao painel
legado (EasyFoodManager-Web 1.3.12, clone `apiNuvem`), sem Electron.

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

Variáveis opcionais (ver `.env.example`):

| Variável | Uso |
|---|---|
| `SESSION_COOKIE_SECURE` | `false` quando o painel é servido em HTTP puro na rede da loja; `true` atrás de HTTPS. Ausente: `true` em produção, `false` em desenvolvimento. |
| `ADMIN_PLATFORM_URL` | Endereço do EasyBilling (Planos e Créditos IA), lido só no servidor. Padrão: `https://billing.easysoftcloud.com.br`. |
| `ERROR_REPORT_SECRET` | Liga o relatório automático de erros: o navegador envia a `POST /api/error-report` e o servidor encaminha ao EasyGuardian com `x-report-secret` (o mesmo segredo da edge `error-report-proxy` do legado). Só no servidor. **Ausente: envio desligado** (a rota responde 204 e descarta o relatório). |
| `EASYFOOD_AMBIENTE` | `homolog` mostra a faixa "HOMOLOGAÇÃO" no topo e o prefixo `[HOMOLOGAÇÃO]` no título da aba (como o legado 1.3.12). Ausente ou outro valor: produção. Lido em execução, no servidor. |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Projeto Supabase do ambiente, usado só pela tela de redefinição de senha. Lidos em execução, no servidor (a mesma build serve produção e homologação). Só a chave **publicável**. |
| `ERROR_REPORT_URL` | Destino alternativo do relatório de erros. Padrão: o EasyGuardian do legado. **Precisa ser `https://`** (o segredo vai no cabeçalho); outro esquema desliga o envio e fica registrado no log do servidor. |

## Verificar

```bash
npm run typecheck
npm run lint
npm test               # unidade e componentes
npm run test:visual    # legado × Next, pixel a pixel (pré-requisitos abaixo)
```

`npm run test:visual` sobe o Next com `next start`, então exige `npm run build`
antes, e precisa do repositório legado em `../apiNuvem` (EasyFoodManager-Web 1.3.12) com
as dependências dele instaladas (`npm ci` lá). O harness injeta no legado um projeto Supabase
fictício (`tests/visual/harness-supabase.ts`) e intercepta todo `*.supabase.co`.

`npm install` funciona num clone novo graças ao `.npmrc` (`legacy-peer-deps=true`):
sem ele, o npm quebra ao resolver os peers do vitest@4.

## Estrutura

- `src/app/` — rotas (páginas finas) e route handlers.
- `src/server/` — só servidor: configuração, gateways de sessão, repasse.
- `src/shared/` — UI copiada do legado, cliente HTTP, sessão, tenant, layout.
- `src/modules/<feature>/` — `domain` → `application` → `infrastructure` → `ui` (Fase 2+).

Spec: `docs/superpowers/specs/2026-09-26-migracao-nextjs-design.md`.
