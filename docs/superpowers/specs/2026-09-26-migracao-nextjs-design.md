# Migração do EasyFood Manager Web para Next.js — Design

- **Data:** 2026-09-26
- **Origem:** `C:\Users\crist\Desktop\easyfoodmanagerWEB` (Vite + React Router + Electron, v1.2.96)
- **Destino:** `C:\Users\crist\Desktop\easyfoodmanagerNEXT`
- **Status:** aprovado em conversa (Seções 1–3); aguardando revisão deste documento

## 1. Objetivo

Migrar o painel para Next.js **somente web**, removendo o Electron, com:

1. **Visual idêntico** em todas as telas — cores, tipografia, espaçamentos, layout, estados.
   O código por baixo pode e deve mudar.
2. **Código limpo**: sem arquivos gigantes, sem detecção de modo espalhada, sem mock em
   produção, sem token em `localStorage`, sem ramos mortos.

### Critérios de sucesso

- Toda rota do legado (menos as removidas na §7) existe no Next com a mesma URL.
- Regressão visual Playwright: legado × Next com diferença zero por rota (tolerância só para
  anti-aliasing de fonte), em desktop (1440×900) e mobile (390×844).
- `npm run typecheck`, `npm test` e `npm run build` verdes.
- Nenhum token de sessão acessível por JavaScript no navegador.

### Fora de escopo

- Criar endpoints novos nas APIs.
- Deploy (Caddy/Docker/VPS).
- Alterar o design (nem tema claro, nem tokens novos).

## 2. Backends

O navegador fala **só com o Next**. O Next repassa para **um** backend, escolhido pela variável
de servidor `BACKEND`:

| `BACKEND` | Serviço | Sessão | Loja em uso |
|---|---|---|---|
| `cloud` | EasyFoodAPI (`EASYFOOD_API_URL`, padrão `http://localhost:3010`) | cookie `httpOnly` emitido pela API, retransmitido pelo Next | escolhida pelo usuário (`/v1/me/stores`), enviada em `X-Company-Id`/`X-Store-Id` |
| `lan` | easyfoodmanagerAPI (`EASYFOOD_API_URL`, padrão `http://localhost:4080`) | JWT (8h) guardado pelo Next no cookie `httpOnly` `efm_session`, enviado como `Authorization: Bearer` | fixa, de `GET /v1/site-identity` |

As rotas de **dados** (`/v1/products`, `/orders`, `/order-items`, `/transactions`, `/units`,
`/dashboard/*`, `/nfce/*`, `/totems`, `/service-agents`, `/pixnopdv-store-credentials`,
`/sync/*`, `/cbs/*`…) têm o mesmo contrato nos dois serviços. A diferença se limita a sessão,
tenant e aos recursos exclusivos da nuvem.

**Recursos só da nuvem** (`/me/*`, `/billing/*`, `/ai/*`, `/totem-licenses`,
`/auth/recovery-email`, SSO): com `BACKEND=lan` a tela aparece idêntica, com estado
"Indisponível nesta instalação". O repositório `lan` lança `FeatureUnavailableError`; nenhum
dado é inventado.

**Supabase no navegador:** só a tela de redefinição de senha (link do e-mail é do Supabase),
isolada em um arquivo, com `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
⚠️ O projeto Supabase de referência é **PRODUÇÃO**; testes nunca o chamam (mock).

## 3. Arquitetura

```
src/
├── app/                         # só roteamento; páginas finas que montam a tela do módulo
│   ├── (auth)/login, reset-password
│   ├── (panel)/layout.tsx       # AppLayout + AppSidebar idênticos ao legado
│   ├── (panel)/<rota>/page.tsx  # mesmas URLs do legado
│   └── api/
│       ├── session/…            # login, me, logout, primeiro acesso
│       └── v1/[...path]/route.ts# repasse autenticado ao backend
├── modules/<feature>/
│   ├── domain/                  # entidades e regras puras
│   ├── application/             # portas (interfaces de repositório) e casos de uso
│   ├── infrastructure/          # implementação HTTP + mappers
│   └── ui/                      # componentes React da feature
├── shared/
│   ├── ui/                      # shadcn usados + layout/sidebar/header portados
│   ├── http/                    # cliente do navegador (fala só com /api)
│   ├── session/                 # hooks/contexto de sessão
│   └── tenant/                  # loja em uso
└── server/                      # só roda no servidor do Next
    ├── config.ts                # lê e valida BACKEND/EASYFOOD_API_URL (zod)
    └── session/                 # SessionGateway: cloud | lan
```

### Regras

- Dependências apontam para dentro: `domain` não importa nada; `application` só `domain`;
  `infrastructure` e `ui` dependem de `application`/`domain`. `ui` nunca importa `infrastructure`.
- Um único ponto monta os repositórios (container), recebendo a loja no construtor — consultar
  sem tenant é impossível por construção.
- Código (identificadores) em inglês; textos de interface e mensagens em PT-BR.
- Arquivo acima de ~300 linhas é sinal para dividir.
- TypeScript `strict`; sem `any` explícito.

### Reaproveitamento do EASYCOMMAND REFATORADO

Trazer `domain`, `application`, `infrastructure` e testes dos módulos, revisando ao trazer:
padronizar nomes em inglês, remover comentários que citam arquivos inexistentes, alinhar
contratos com a easyfoodmanagerAPI. **Não** trazer a camada `ui` dele (visual divergente),
nem `.env`, nem o tema claro.

## 4. Sessão

Contrato do Next para o navegador (igual nos dois backends):

```
POST /api/session/login          { email, password } → 200 { user } | 400/401/429 { code, message }
GET  /api/session                → 200 { user } | 401
POST /api/session/logout         → 204
POST /api/session/first-access/* → só BACKEND=lan (bootstrap/set-local-password)
*    /api/v1/*                   → repasse autenticado
```

`SessionGateway` (servidor):

- **CloudSessionGateway:** repassa login/me/logout; retransmite `Set-Cookie`; no repasse
  envia o cookie e os cabeçalhos de tenant.
- **LanSessionGateway:** guarda o JWT em `efm_session` (`httpOnly`, `Secure` fora de dev,
  `SameSite=Lax`, `Max-Age = expires_in`); no repasse converte em `Bearer`; `me` vem das claims
  do JWT (só leitura para exibir — a API valida a assinatura a cada chamada); logout apaga o
  cookie.

`proxy.ts` (antigo `middleware.ts` no Next 16) redireciona para `/login` quem não tem cookie de sessão (conveniência, não
segurança). Qualquer 401 em `/api/v1/*` limpa o cache do TanStack Query e leva a
`/login?expired=1` com "Sua sessão expirou. Entre de novo.".

## 5. UI idêntica

- Copiados sem alteração de valores: `index.css` (Navy Trust, dark-only), `tailwind.config.ts`,
  Tailwind **3.4** (não v4), fontes Sora/Manrope pelo mesmo `<link>` do Google Fonts do
  legado (`next/font` renomearia a família e mudaria o fallback — risco ao pixel-idêntico),
  componentes `components/ui` efetivamente usados, ícones `lucide-react`, `recharts`, `sonner`.
- Cada tela do legado vira componente(s) em `modules/<feature>/ui/`, preservando JSX e classes
  Tailwind; muda só a origem dos dados (repositório via TanStack Query em vez do `data-service`).
- Componentes interativos são Client Components; `page.tsx` permanece fino.

## 6. Mapa de telas

| Rota | Tela legado | Módulo | Fase |
|---|---|---|---|
| `/login` | LoginPage | shared/session | 1 |
| `/reset-password` | ResetPasswordPage | shared/session | 1 |
| layout | AppLayout, AppSidebar, header, badges | shared/ui | 1 |
| `/` | Dashboard | dashboard | 2 |
| `/products` | Products | products | 2 |
| `/orders` | Orders | orders | 2 |
| `/transactions` | Transactions | transactions | 2 |
| `/units` | Units | units | 2 |
| `/receitas` | ReceitasPage | revenue | 2 |
| `/nfce` | NfcePage | nfce | 3 |
| `/nfce/:id` | NfceDetailPage | nfce | 3 |
| `/nfce-issuer` | NfceIssuerConfigPage | issuer | 3 |
| `/nfce-issuer-fiscal` | NfceIssuerFiscalPage | issuer | 3 |
| `/totems` | TotemConfigPage | totems | 4 |
| `/pixnopdv` | PixnopdvStoreCredentialsPage | pixnopdv | 4 |
| `/agents` | AgentConfigPage | agents | 4 |
| `/bootstrap-codes` | BootstrapCodePage | bootstrap | 4 |
| `/sync` | SyncMonitor / CloudSyncMonitor | sync | 5 |
| `/sync/espelho` | SyncMirror | sync-mirror | 5 |
| `/audit-logs` | AuditLogsPage | audit | 5 |
| `/manual` | Manual | manual | 5 |
| `/wizard` | Wizard | setup | 5 |
| `*` | NotFound | shared/ui | 1 |
| — | AIChatButton/Panel, LicenseExpiredBanner, CompanySelectionModal | assistant, billing, tenant | 5 |

## 7. O que é removido

- `electron/` inteiro, scripts de empacotamento, `*.bat` de release desktop.
- Ramos `isElectron()`/IPC; configuração de banco local (`testDbConnection`,
  `load/saveElectronDbConfig`); `DesktopAppInstallPrompt`.
- Detecção de modo (`cloud-mode.ts`, `isCloudSupabaseMode`, `isAdminApiConfigured`).
- `mock-data.ts` e `MockDatasetBanner`.
- `cloud-data.ts` (Supabase direto no navegador) e o cliente Supabase gerado, exceto o uso
  isolado da redefinição de senha.
- Funções que só existiam via PG local e não têm endpoint (ex.: runtime TEF): a tela mostra
  "Indisponível nesta instalação".

## 8. Tratamento de erros

- `ApiError { status, code, message }` único; a tela decide pelo `code`, exibe `message` em PT-BR.
- 401 → fluxo de sessão expirada (§4). 403 → "Você não tem acesso a esta loja." 429 → mensagem
  da API. Rede/5xx → estado de erro da tela com botão "Tentar novamente".
- `FeatureUnavailableError` → estado "Indisponível nesta instalação".
- `ErrorBoundary` no layout do painel, com o mesmo visual do legado.

## 9. Testes

- **Unitários (Vitest):** domain e mappers (os 132 do Refatorado, adaptados); `SessionGateway`
  cloud e lan com backend simulado — login ok/erro/429, cookie→Bearer, cookie expirado,
  logout; teste garantindo que nenhuma resposta ao navegador contém o token.
- **Componentes (Testing Library):** estados de carregando/vazio/erro/indisponível por tela.
- **Regressão visual (Playwright):** legado em modo LAN e Next apontando para a mesma
  easyfoodmanagerAPI local (`docker compose` do repositório da API) com dados fixos; screenshot
  por rota, desktop e mobile. Telas só da nuvem comparadas com respostas simuladas.

## 10. Fases

Cada fase tem seu plano, é implementada test-first e só fecha com a regressão visual das suas
telas verde.

1. **Fundação:** projeto Next.js 16 / React 19 / TS strict (mesmas versões do Refatorado); design system; layout; sessão/BFF;
   cliente HTTP; container; harness de testes e de regressão visual; login, reset, 404.
2. **Operação:** Dashboard, Produtos, Comandas, Transações, Unidades, Receitas.
3. **Fiscal:** NFC-e lista e detalhe, Emitente, Configuração fiscal.
4. **Dispositivos:** Totens, PIXnoPDV, Agentes, Códigos de bootstrap.
5. **Sync e demais:** Sync, Espelho, Auditoria, Manual, Wizard, IA, billing, seletor de loja.

## 11. Riscos

- **EasyFoodAPI (3010) sem código-fonte nesta máquina:** contrato inferido dos clientes
  existentes (legado `cloud-api*.ts` e Refatorado). Divergências aparecem só com a API real.
- **Anti-aliasing entre versões de React/Next** pode gerar diferenças mínimas de pixel sem
  mudança de design — daí a tolerância restrita a fonte.
- **Dados de referência:** a regressão visual depende de um PG local com dados fixos; o seed
  faz parte da Fase 1.
