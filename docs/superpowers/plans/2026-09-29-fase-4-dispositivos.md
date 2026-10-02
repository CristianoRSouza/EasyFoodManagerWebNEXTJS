# Fase 4 — Dispositivos: plano de execução

**Objetivo:** migrar Totens (`/totems`), PIXnoPDV (`/pixnopdv`), Agentes de Serviço (`/agents`) e Códigos de primeiro acesso (`/bootstrap-codes`) com visual E comportamento idênticos ao legado.

**Regras gerais:** as da Fase 2 (`2026-09-27-fase-2-operacao.md`, "Regras que valem para todos") + convenções consolidadas (`fase-2-integracao-report.md`, `fase-3-integracao-report.md`): `ui/XPage.tsx`, `ui/use-x-repository.ts`, `Tenant` no construtor, helpers de `src/shared/*`, sem commits.

**Regra de paridade (decisão do usuário):** na dúvida, TUDO fica idêntico ao legado — visual e comportamento, inclusive textos, campos em claro e avisos. Só se desvia quando o comportamento do legado dependia do Electron (aí replica-se o comportamento do Electron no modo loja, como a edição do Emitente na Fase 3) ou é um bug claro; nos dois casos, documentar no relatório.

**Caminhos:** `LEGACY` = `C:\Users\crist\Desktop\easyfoodmanagerWEB` (somente leitura, referência ÚNICA); `REF` = `C:\Users\crist\Desktop\EASYCOMMAND REFATORADO` (somente leitura; domain/infrastructure de `modules/{totems,pixnopdv,agents}`, nunca UI); `API` = `C:\Users\crist\Desktop\easyfoodmanagerAPI\src\routes\v1\{totems,service-agents,pixnopdv-store-credentials}.ts` (contrato real).

## Invariante crítica

**Segredos de TEF/PIX do totem e da loja** (`aditum_tef_*`, tokens/segredos do PIXnoPDV e afins) nunca são exibidos, logados ou reenviados em claro além do que o legado faz; seguir exatamente o fluxo do legado (redação, cifragem `enc:v1:` feita no servidor/edge, campos "definido"), conferindo o que a API aceita/devolve. Testes dedicados.

## Onda 0 — base (1 agente)

1. Primitivas que faltam (ex.: `alert`, `switch`, `dialog` extras) copiadas do legado como nas fases anteriores.
2. `src/shared/license/`: `LicensePlanBadge` (cópia fiel de `LEGACY/src/components/license/LicensePlanBadge.tsx` e `LicenseStatusBadge.tsx`), `license-labels`, `totem-license-display` (lógica pura + testes).
3. `src/modules/pixnopdv` — núcleo: domínio, `pixnopdv-store-merge` (port de `LEGACY/src/lib/pixnopdv-store-merge.ts` + testes), repositório (`GET`/`PUT /v1/pixnopdv-store-credentials`), hook e o componente `ui/PixnopdvStoreCredentialsCard.tsx` (cópia fiel, dividido se > ~300 linhas). O Totens reutiliza o que precisar daqui pelo `index` público do módulo.
4. Relatório `docs/superpowers/plans/fase-4-onda-0-report.md` com assinaturas exportadas.
5. Verde: typecheck, lint 0/0, testes.

## Onda 1 — telas (3 agentes em paralelo, depois da onda 0)

| Agente | Tela | Arquivos | LEGACY |
|---|---|---|---|
| A | Totens `/totems` | `src/modules/totems/**`, `src/app/(panel)/totems/page.tsx`, `tests/visual/{fixtures,scenarios}/totems.ts` | `pages/TotemConfigPage.tsx`, `components/totem/{TotemFormDialog,TotemAuditDialog,TotemReactivateLicenseDialog,TotemStatusSwitch}.tsx`, `lib/totem-fiscal.ts`, `types/totem.types.ts` |
| B | Agentes `/agents` + PIXnoPDV `/pixnopdv` (página fina sobre o card da onda 0) | `src/modules/agents/**`, `src/app/(panel)/agents/page.tsx`, `src/app/(panel)/pixnopdv/page.tsx`, `tests/visual/{fixtures,scenarios}/{agents,pixnopdv}.ts` | `pages/AgentConfigPage.tsx`, `components/agent/*`, `types/agent.types.ts`, `pages/PixnopdvStoreCredentialsPage.tsx` |
| C | Códigos de primeiro acesso `/bootstrap-codes` (só nuvem; no modo loja a rota mostra "Indisponível nesta instalação" como o menu já esconde) | `src/modules/bootstrap/**`, `src/app/(panel)/bootstrap-codes/page.tsx`, `tests/visual/{fixtures,scenarios}/bootstrap.ts` | `pages/BootstrapCodePage.tsx`, `lib/issue-bootstrap-code.ts` |

O formulário de totem (1.676 linhas no legado) deve ser dividido em componentes/seções do módulo, nenhum arquivo acima de ~300 linhas. Rotas de fixture não podem repetir as de outro arquivo.

## Onda 2 — integração, revisão final e correções

Build, `test:visual` completo (Fases 1–4), diferença zero, unificação de duplicatas, revisão final, correções. Sem commits.
