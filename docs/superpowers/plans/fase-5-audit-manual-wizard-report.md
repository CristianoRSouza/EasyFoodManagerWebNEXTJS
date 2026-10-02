# Fase 5 — Onda 1, agente C: Auditoria, Manual e Wizard (relatório)

> **Superado em parte por `fase-5-integracao-report.md`** (markdown/captura de tela, relator em `src/shared/errors`, licença em `src/shared/license`, Auditoria na loja, máscaras visuais removidas). Em caso de conflito, vale o relatório de integração.

Branch `feat/fase-1-fundacao`. Nada commitado; nenhum `git commit/merge/push/stash/reset/checkout/
restore`. Nenhum `.env` lido. Nenhum teste chama API real ou Supabase (`fetch` simulado).

## Arquivos criados/alterados

```
src/shared/ui/primitives/accordion.tsx                 # primitiva copiada do legado ("use client", cn → @/shared/ui/cn)
package.json / package-lock.json                        # + "@radix-ui/react-accordion": "^1.2.2" (versão do legado; instalada 1.2.20)

src/modules/audit/domain/unified-audit-log.ts          (+ .test.ts)  tipos, rótulos, filtros, paginação
src/modules/audit/application/audit-log-repository.ts
src/modules/audit/infrastructure/unified-audit-log-mapper.ts   (+ .test.ts)
src/modules/audit/infrastructure/api-audit-log-repository.ts   (+ .test.ts)
src/modules/audit/ui/use-audit-log-repository.ts
src/modules/audit/ui/use-audit-logs-page.ts
src/modules/audit/ui/AuditLogsPage.tsx                 (+ .test.tsx)
src/modules/audit/ui/AuditLogsFilters.tsx
src/modules/audit/ui/AuditLogTimelineEntry.tsx
src/modules/audit/ui/AuditLogsPagination.tsx
src/app/(panel)/audit-logs/page.tsx

src/modules/manual/ui/ManualPage.tsx                   (+ .test.tsx)
src/app/(panel)/manual/page.tsx

src/modules/setup/domain/sync-env.ts                   (+ .test.ts)  passos, .env, IBConfig.INI
src/modules/setup/ui/use-wizard-form.ts
src/modules/setup/ui/WizardPage.tsx                    (+ .test.tsx)
src/modules/setup/ui/WizardStepsSetup.tsx              passos 1–4
src/modules/setup/ui/WizardStepsFinish.tsx             passos 5–7
src/app/(panel)/wizard/page.tsx

tests/visual/fixtures/{audit,manual,wizard}.ts
tests/visual/scenarios/{audit,manual,wizard}.ts
```

`src/shared/audit/audit-log.ts` (Fase 4) foi **reutilizado**, não duplicado:
`filterAuditLogsByActionAndPeriod`, `formatAuditValue`, `formatAuditDateTime`, `AuditPeriodFilter`.

## Endpoints

| Tela | Backend | Chamada |
|---|---|---|
| Auditoria | `cloud` | `GET /api/v1/audit-logs?limit=500` (repasse → EasyFoodAPI `/v1/audit-logs`), cabeçalhos `x-company-id`/`x-store-id`. Mesma rota/limite de `LEGACY/src/lib/cloud-api-data.ts#fetchApiUnifiedAuditLogs(500)`; resposta `{ data: UnifiedAuditLog[] }`. `queryKey ["unified-audit-logs", companyId, storeId]`, `staleTime` 60 s. |
| Auditoria | `lan` | nenhuma — a easyfoodmanagerAPI da loja não tem `/v1/audit-logs` (só `/totems/:id/audit-logs` e `/service-agents/:id/audit-logs`). |
| Manual, Wizard | ambos | nenhuma (conteúdo estático / tudo no navegador). |

`isSystemAdmin` vem de `useTenant()` (`/me/context`), o mesmo dado que o `useIsSystemAdmin` do
legado usa no modo API.

## Decisões e diferenças em relação ao legado

1. **Auditoria no modo loja → "Indisponível nesta instalação"** (instrução do plano). O legado, no
   modo loja, caía em "Acesso restrito" (o `useIsSystemAdmin` dá `false` fora da nuvem). O Next usa o
   mesmo layout (ícone `ShieldAlert`, mesmas classes) com o título "Indisponível nesta instalação"
   e o texto "Os logs de auditoria estão disponíveis apenas no modo Nuvem." Sem chamada à API.
   O menu já esconde o item fora da nuvem (`buildNavGroups`).
2. **Estado de erro na auditoria (bug do legado).** No legado, falha da API virava
   `logs = []` e a tela dizia "Nenhum registro de auditoria", uma mentira para um administrador. O
   Next mostra "Não foi possível carregar os logs de auditoria." (`text-destructive`, mesmo lugar e
   classes da mensagem de vazio; mesmo padrão de `ProductsPage`).
3. **Skeleton de "verificando admin"**: o legado mostra enquanto `useIsSystemAdmin` carrega; o Next
   mostra o mesmo JSX enquanto `useTenant().loading`.
4. **Mapper defensivo**: ação desconhecida é tratada como `updated` (o legado a exibe assim,
   `ACTION_CONFIG[...] ?? ACTION_CONFIG.updated`); **origem desconhecida é descartada**. No legado,
   `SOURCE_CONFIG[log.source].icon` lançaria exceção e derrubaria a tela inteira. `jsonb` em texto
   é aceito; `performed_by` nulo vira `"admin"` (default do legado em `cloud-data.ts`).
5. **Valores de campos sensíveis** (`nfce_service_api_key`, `tef_http_api_key`) continuam sendo
   exibidos como a API devolve, igual ao legado e ao `TotemAuditDialog` do Next. O REF mascarava
   esses valores. Não adotei o mascaramento porque a regra de paridade manda manter o visual.
   **Ponto para o revisor**: se a EasyFoodAPI devolver essas chaves em claro, vale mascará-las na
   UI e/ou na API.
6. **Wizard, leitura do IBConfig.INI (bug do legado)**: o legado usava `/Path=(.+)/i` em qualquer
   posição da linha, então uma `DataPath=` anterior era lida no lugar de `Path=`. Adotei a versão do
   REF, que casa a chave no início da linha. Chave ausente não sobrescreve o campo, como no legado.
7. **Wizard, "Ir para o Dashboard"**: o legado faz `window.location.href = "/"`; o Next usa
   `useRouter().push("/")`, porque o eslint do Next proíbe `location.assign` para rota interna. O
   destino é o mesmo.
8. **Manual**: só troquei `Link to` (react-router) por `next/link href`. Aspas e apóstrofos no JSX
   viraram `&quot;`/`&apos;` por causa do lint `react/no-unescaped-entities`; o texto renderizado não
   muda.
9. **Paginação da auditoria**: adicionei `aria-label` ("Página anterior"/"Próxima página") aos
   botões de seta. Não aparece na tela.
10. Arquivos divididos pelo limite de cerca de 300 linhas: Auditoria (página, filtros, item da
    linha do tempo, paginação) e Wizard (passos 1–4 / 5–7). JSX, classes e textos foram copiados.

## Visual

- `manual-secoes-abertas` (lan): abre "Visão Geral — Arquitetura" e "Configuração de DNS".
- `wizard-conexoes` (lan): passo 3 ("Conexões"), com o `.env` gerado.
- `audit-logs-sem-permissao` (cloud, `admin@nuvem.dev`): "Acesso restrito", idêntico ao legado. O
  `mask` é o mesmo de `scenarios/bootstrap.ts` (menu do usuário e botão de IA do legado). Se o
  agente D colocar o botão de IA no Next, o controller deve rever essa máscara.
- **Sem cenário "auditoria carregada"**: `fake-api.ts` devolve `is_system_admin: false` fixo. A
  fixture `fixtures/audit.ts` (`GET /v1/audit-logs`, datas fixas, 404 em `lan`) já está pronta.
  Um cenário futuro com esses dados precisa selecionar "Todo período", porque o filtro padrão
  ("30 dias") depende do relógio.
- Não rodei `test:visual`, conforme o brief.

## Candidatos a compartilhado

- **`fake-api.ts`**: um `SYSTEM_ADMIN_EMAILS` (ex.: `admin-sistema@nuvem.dev`), análogo a
  `COMPANY_ADMIN_EMAILS`, para `is_system_admin: true` em `/me/context`. Isso libera o cenário
  `audit-logs-carregado`.
- O bloco centralizado "ícone + título + texto" (`ShieldAlert`) aparece em Auditoria (restrito e
  indisponível). Por ora é local.

## Resultados

| Comando | Resultado |
|---|---|
| `npx vitest run src/modules/audit src/modules/manual src/modules/setup src/shared/ui/primitives` | 8 arquivos, **39 testes verdes** |
| `npx tsc --noEmit` (projeto inteiro) | 0 erros |
| `npx eslint src/modules/{audit,manual,setup} src/app/(panel)/{audit-logs,manual,wizard} src/shared/ui/primitives/accordion.tsx` | 0 erros / 0 avisos |

Testes de componente: Auditoria (loja indisponível; nuvem sem admin; carregando; vazio; erro; com
dados; filtro + Limpar); Manual (9 seções fechadas; abrir várias; link `/wizard`); Wizard (estado
inicial; navegação + `.env` reativo; último passo + Dashboard; copiar + toast; upload do
IBConfig.INI).
