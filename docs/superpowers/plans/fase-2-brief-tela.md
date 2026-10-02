# Brief comum — agente de tela da Fase 2

Você migra UMA tela do painel legado para o projeto Next.js 16 em `C:\Users\crist\Desktop\easyfoodmanagerNEXT` (branch `feat/fase-1-fundacao`). Outros 5 agentes trabalham ao mesmo tempo em outras telas, na mesma árvore de trabalho.

Leia antes de começar:
1. `docs/superpowers/plans/2026-09-27-fase-2-operacao.md` — "Regras que valem para todos" e a linha da sua tela na tabela da Onda 1.
2. `docs/superpowers/plans/fase-2-onda-0-report.md` — as peças compartilhadas prontas (primitivas, PageRefreshButton, StatusBadge, DatePeriodPresetControls, useRequiredTenant, usePlanHistoryWindow, contrato de fixtures/cenários visuais). Use-as; não recrie.
3. A tela do legado (somente leitura) em `C:\Users\crist\Desktop\easyfoodmanagerWEB` — é a referência visual ÚNICA. Leia também como ela obtém dados no modo LAN (`src/lib/data-service.ts` → `src/lib/admin-api-client.ts`) para usar os mesmos endpoints `/v1/*`, parâmetros e formato de resposta.
4. O módulo equivalente em `C:\Users\crist\Desktop\EASYCOMMAND REFATORADO\src\modules\<modulo>` (somente leitura) — aproveite domain/application/infrastructure e testes, renomeando para inglês limpo e adaptando ao contrato real dos endpoints. NÃO use a UI dele.

## Regras duras
- **Proibido** `git commit`, `git merge`, `git push`, `git stash`, `git reset`, `git checkout -- <arquivo>` ou qualquer comando que altere o histórico/índice. Deixe tudo pendente.
- Toque SOMENTE: `src/modules/<modulo>/**`, `src/app/(panel)/<rota>/page.tsx`, `tests/visual/fixtures/<modulo>.ts`, `tests/visual/scenarios/<modulo>.ts`. Não edite arquivos compartilhados (`src/shared/**`, configs, `package.json`). Se faltar algo compartilhado, crie dentro do seu módulo e registre no relatório como "candidato a compartilhado".
- Nunca leia/imprima `.env`. Nunca chame APIs reais ou Supabase.
- JSX e classes Tailwind idênticos ao legado (copie). Textos PT-BR idênticos. Sem ramos Electron/mock/Supabase.
- Repositório com `Tenant` no construtor; a UI obtém via `use<Modulo>Repository()` que usa `useRequiredTenant()`. Dados com TanStack Query, `queryKey` incluindo companyId/storeId.
- TS strict, sem `any`. Nenhum arquivo acima de ~300 linhas (divida em componentes do módulo).
- TDD: teste de domain/mapper antes da implementação; pelo menos um teste de componente da tela (estados carregando, vazio, erro e com dados), com `apiRequest`/fetch simulado.
- Fixture visual determinística (datas fixas) e cenário visual `desktop`+`mobile` da tela carregada com dados, seguindo o contrato do relatório da onda 0. As respostas da fixture devem ter o formato que a easyfoodmanagerAPI devolve (confira em `C:\Users\crist\Desktop\easyfoodmanagerAPI\src\routes\v1\`), porque o LEGADO no modo LAN e o Next consomem a mesma fixture.
- Rodar vitest a partir de `/c/Users/...` (drive maiúsculo).

## Verificação antes de reportar
- `npx vitest run src/modules/<modulo>` verde.
- `npx tsc --noEmit` sem erros nos seus arquivos; `npx eslint src/modules/<modulo> "src/app/(panel)/<rota>"` 0/0.
- NÃO rode `npm run build` nem `npm run test:visual` (os outros agentes estão editando; o controller roda tudo no fim).

## Relatório
Escreva em `docs/superpowers/plans/fase-2-<modulo>-report.md`: arquivos criados, endpoints usados (com parâmetros), decisões, diferenças conhecidas em relação ao legado (se houver, com o motivo), candidatos a compartilhado, resultados dos testes.
Responda SOMENTE: status, resumo dos testes em uma linha, preocupações, caminho do relatório.
