# Fase 5 — Sync e demais: plano de execução

**Objetivo:** migrar Sincronização (`/sync`: monitor local no modo loja, monitor da nuvem no modo nuvem), Espelho FB↔PG (`/sync/espelho`, só loja), Logs de Auditoria (`/audit-logs`, só nuvem/admin), Manual (`/manual`), Wizard (`/wizard`), o assistente de IA (botão + painel), o banner de licença vencida, o badge de plano e o aviso de licença no cabeçalho (`HeaderStoreInfo`), e o relatório automático de erros (o `ErrorBoundary` hoje só registra no console).

**Regras gerais:** as mesmas das fases anteriores (Fase 2 "Regras que valem para todos"; convenções em `fase-2/3/4-integracao-report.md`), sem commits.
**Regra de paridade (usuário):** tudo idêntico ao legado em visual e comportamento; desvio só onde o legado dependia do Electron (replicar o comportamento do Electron no modo loja) ou bug claro — sempre documentado.
**Armadilha da nuvem:** o legado em produção roda em `*.easysoftcloud.com.br`, onde `isCloudSupabaseMode()` é verdadeiro pelo hostname — "comportamento do legado na nuvem" = ramo de produção (Supabase), não o ramo dormente `isCloudApiMode()`. No Next, a nuvem fala com a EasyFoodAPI pelo repasse: use as rotas que o cliente `LEGACY/src/lib/cloud-api*.ts` define para cada recurso; onde não houver rota equivalente, a tela mostra "Indisponível nesta instalação" e o relatório registra.
**Supabase no navegador:** continua proibido fora da redefinição de senha.

**Caminhos:** `LEGACY` = `C:\Users\crist\Desktop\easyfoodmanagerWEB` (somente leitura); `REF` = `C:\Users\crist\Desktop\EASYCOMMAND REFATORADO` (domain/infrastructure de `modules/{sync,audit,assistant,setup}`, `shared/plan`, `shared/errors`; nunca UI); `API` = `C:\Users\crist\Desktop\easyfoodmanagerAPI\src\routes\v1\{sync,sync-local-panel,sync-fbpg-panel}.ts`.

## Onda 0 — base (1 agente)

1. Primitivas que faltam (ex.: `accordion`) copiadas do legado.
2. `src/shared/sync/`: `SyncEventsPanel` (813 linhas no legado → dividir), `ErrorSummary`, `PayloadDetails`, `sync-log-status`, `sync-op-label`, `friendly-labels` (o que for usado por mais de uma tela) — cópias fiéis, lógica pura com testes.
3. Relatório `fase-5-onda-0-report.md`.

## Onda 1 — telas (4 agentes em paralelo)

| Agente | Escopo | Arquivos | LEGACY |
|---|---|---|---|
| A | Sincronização `/sync` (loja: `SyncMonitor` + `local-sync-monitor`; nuvem: `CloudSyncMonitor` + `cloud-sync-inbox/outbox`) | `src/modules/sync/**`, `src/app/(panel)/sync/page.tsx`, `tests/visual/{fixtures,scenarios}/sync.ts` | `pages/SyncMonitor.tsx`, `pages/CloudSyncMonitor.tsx`, `lib/local-sync-monitor.ts`, `lib/cloud-sync-*.ts` |
| B | Espelho FB↔PG `/sync/espelho` (só loja) | `src/modules/sync-mirror/**`, `src/app/(panel)/sync/espelho/page.tsx`, `tests/visual/{fixtures,scenarios}/sync-mirror.ts` | `pages/SyncMirror.tsx`, `components/sync-mirror/*`, `lib/sync-mirror-*.ts` |
| C | Auditoria `/audit-logs` (nuvem, admin do sistema), Manual `/manual`, Wizard `/wizard` | `src/modules/{audit,manual,setup}/**`, rotas correspondentes, fixtures/cenários `{audit,manual,wizard}.ts` | `pages/{AuditLogsPage,Manual,Wizard}.tsx`, `types/audit.types.ts` |
| D | Assistente de IA (`AIChatButton`/`AIChatPanel`/`useAIChat`/`useAICredits`), `LicenseExpiredBanner`, badge de plano + aviso de licença no `HeaderStoreInfo`, relatório de erros pelo servidor do Next | `src/modules/assistant/**`, `src/modules/billing/**`, `src/shared/layout/{AppLayout,HeaderStoreInfo,ErrorBoundary}.tsx`, `src/app/api/error-report/route.ts`, `src/server/**` (só o necessário para o relatório de erros), fixtures/cenários `{assistant,billing}.ts` | `components/ai-chat/*`, `hooks/useAIChat.ts`, `hooks/useAICredits.ts`, `hooks/useLicenseStatus.ts`, `components/billing/*`, `components/HeaderStoreInfo.tsx`, `lib/error-reporter.ts`, `lib/cloud-api-ai.ts`, `lib/cloud-api-billing.ts` |

Relatório de erros (agente D): o navegador envia ao próprio Next (`POST /api/error-report`), e o servidor encaminha ao mesmo destino que o legado usa (descobrir em `error-reporter.ts`), sem expor chaves ao navegador; com o mesmo formato, limites e redação de dados do legado. Com isso o texto "Um relatório foi enviado automaticamente" do `ErrorBoundary` passa a ser verdadeiro.

Os cenários visuais que antes escondiam o botão de IA do legado (Fase 4, códigos de primeiro acesso) devem deixar de escondê-lo quando o botão existir no Next.

## Onda 2 — integração, revisão final e correções

Build, `test:visual` completo (Fases 1–5), diferença zero, remoção das exclusões que dependiam da Fase 5, unificação de duplicatas, revisão final, correções. Sem commits.
