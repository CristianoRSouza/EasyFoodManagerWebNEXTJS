# Atualização do legado de referência: 1.3.12 → 1.3.13

**Data:** 2026-10-01 · **Branch:** `feat/fase-1-fundacao` (sem commit)

Base já portada: legado `b2f8393` (PR #52). Novos commits do legado (`easyfoodmanagerWEB`, só
leitura, ref `origin/hom` = `5e08144`): `git log --oneline b2f8393..origin/hom` → PR #54 (versão
1.3.13) e PR #56 (`fix(totem): pergunta antes de salvar quando a série NFC-e é de outro totem`).

Referência visual/comportamental: **checkout separado** em `C:\Users\crist\legacy-ref-hom`
(`git -C easyfoodmanagerWEB worktree add --detach C:\Users\crist\legacy-ref-hom origin/hom` + `npm ci`).
Nenhum branch/arquivo de `easyfoodmanagerWEB` ou `apiNuvem` foi alterado (o worktree é o único
efeito git; `git status` de `legacy-ref-hom` continua limpo).

## PR → mudança → onde ficou no Next

| PR | Mudança no legado | Classe | Next (arquivo) / testes |
|---|---|---|---|
| #54 | Versão 1.3.13 (`package.json`, `version.ts`, `CHANGELOG`) | I | `package.json`/`package-lock.json` → **1.3.13** (rótulo da barra lateral = `1.3.13`, via `NEXT_PUBLIC_APP_VERSION`); `src/shared/version.test.ts`. `CHANGELOG` não é exibido — não portado |
| #56 | `TotemSeriesOwner`, `describeTotemSeriesOwner`, `decideSeriesOwnerAction` (`totem-fiscal.ts`) | D/C | `src/modules/totems/domain/totem-fiscal.ts`; casos do `totem-series-owner.test.ts` do legado portados literalmente em `domain/totem-fiscal.test.ts` |
| #56 | `TOTEM_SERIES_OWNER_SQL` (consulta direta) | E | Não portado (ramo Electron). O caso de teste do SQL virou teste do contrato da rota em `infrastructure/api-totem-repository.test.ts` |
| #56 | `fetchTotemSeriesOwner` (`data-service.ts`): Admin API → `GET /v1/totems/series-owner?serie=&environment=[&totemId=]` → `data ?? null`; fora da Admin API (nuvem) → `null` sem rede | D | `TotemRepository#seriesOwner` (`application/totem-repository.ts`), `ApiTotemRepository#seriesOwner` (LAN: a rota; cloud: `null` sem `fetch`), `toTotemSeriesOwner` em `infrastructure/totem-mapper.ts`; testes em `api-totem-repository.test.ts` |
| #56 | `TotemSeriesSaveOptions` + `withTransferSeries`: `transfer_series_id` só no corpo da Admin API (criar/editar); nuvem nunca recebe | D | `TotemSeriesSaveOptions` em `application/totem-repository.ts`; `withTransferSeries` + `create/update(..., opts)` em `ApiTotemRepository`; testes (LAN com/sem, nuvem nunca) |
| #56 | `TotemFormDialog.tsx`: antes de salvar (só fora da nuvem) consulta o dono (`.catch(() => null)`); `blocked` → aba NFC-e + toast destrutivo "Série NFC-e em uso por outro totem ativo"; `confirm_transfer` → `AlertDialog` "Transferir a série NFC-e?" (mesmo JSX/classes/textos); "Transferir e salvar" reenvia com `transferSeriesId`; Cancelar não salva | V/C | Lógica em `ui/use-totem-form-state.ts` (`handleSubmit`, `confirmTransfer`, `pendingTransfer`); JSX do `AlertDialog` copiado em `ui/TotemFormDialog.tsx`; consulta injetada por `lookupSeriesOwner` (`use-totems-page.ts` → `TotemsPage.tsx`). Primitiva nova `src/shared/ui/primitives/alert-dialog.tsx` (cópia do shadcn do legado) + dependência `@radix-ui/react-alert-dialog`. Testes de componente em `ui/TotemsPage.test.tsx` (8 casos: pergunta com textos, confirmar → PATCH com `transfer_series_id` e fecha, cancelar → sem PATCH e formulário aberto, linha sem totem, dono ativo bloqueia/aba NFC-e, série livre, rota ausente → salva direto, nuvem não consulta) |
| #56 | `TotemConfigPage.tsx`: `handleCreate/handleUpdate(data, licenseId, opts)` | C | `use-totems-page.ts` (`handleCreate`/`handleUpdate` repassam `opts`) |
| #56 | `ensureTotemSeriesConfigLocal` (não cria série com outro dono), `transferTotemSeriesLocal`, mensagem `series_transfer_refused` | E | Ignorados: ramo Electron/PG direto; no LAN quem faz isso é a Admin API |

### Desvios conscientes

Nenhum novo. O comportamento do salvar depois da confirmação segue o já documentado do Next (ver
`atualizacao-legado-1.3.12.md` e `TotemsPage — voucher sem suporte na API da loja`).

## Harness visual

- `tests/visual/playwright.config.ts`: legado configurável por **`LEGACY_DIR`** (absoluto, ou
  relativo à raiz do repo Next); padrão continua `../apiNuvem`.
- Fixture `tests/visual/fixtures/totems.ts`: `GET /v1/totems/series-owner` determinístico — a
  série 2 de produção é do `TOTEM-LOJA01-CAIXA02` (inativo, `current_number` 57); qualquer outra
  combinação é livre.
- Cenário novo `totems-transferir-serie` (lan): editar o totem ativo, aba NFC-e, série → 2,
  Salvar → espera o "Transferir a série NFC-e?" com "nº 58" (sem nenhum PATCH).

## Verificação contra a API real (local)

Ambiente: API `:4080` (`easyfoodmanagerAPI` `main` = `6f2f1a0`), Docker PG `:5433`, login
`qa.admin@local.dev`. Nada de homologação/produção.

**Achado:** a API local **não tem** o lado servidor do PR #56 — `GET /v1/totems/series-owner`
responde `404 {"error":"not_found"}` e o `totemPatchBodySchema` (zod, não estrito) descarta
`transfer_series_id`. O `origin/main` remoto está à frente (`777a08c`), mas não foi buscado (sem
`git fetch`, regra da tarefa). Por isso a verificação foi feita em dois caminhos:

1. **API real direta (sem a rota):** Next `:3100` → `:4080`; legado em `:8095` → proxy
   passthrough `:4082` → `:4080` (só para CORS, sem reiniciar a API). Editar `TOTEM-CAIXA-01`
   para a série 4: os dois fazem `GET .../series-owner` (404), **não mostram diálogo** e fazem
   **um PATCH** direto — mesmo `.catch(() => null)` do legado.
2. **Contrato do PR #56 emulado:** shim local (`:4081`, script no scratchpad da sessão) que
   responde `series-owner` com a mesma SQL do legado (`TOTEM_SERIES_OWNER_SQL`, via `psql` no
   container) e, num PATCH 2xx com `transfer_series_id`, aplica a transferência com a guarda do
   legado (`transferTotemSeriesLocal`); o resto vai para a `:4080`. Legado em `:8096` e Next
   `next start :3105`, ambos → `:4081`. Semente: série 4 / homologação (`current_number` 30)
   do `TOTEM-BALCAO` (inativo).

| Passo (TOTEM-CAIXA-01, ativo, homologação) | Legado `:8096` | Next `:3105` |
|---|---|---|
| Série 3 (do CAIXA-02 **ativo**) → Salvar | toast "Série NFC-e em uso por outro totem ativo" + "A série 3 de homologação está vinculada ao totem TOTEM-CAIXA-02 (ativo). Dois totens ativos…", aba NFC-e ativa, sem diálogo, sem PATCH | idêntico |
| Série 4 (do BALCAO inativo) → Salvar | "Transferir a série NFC-e?" / "A série 4 de homologação está vinculada ao totem TOTEM-BALCAO (inativo)." / "…TOTEM-CAIXA-01 passa a emitir na série 4 de homologação, e a numeração continua do nº 31." / "Só este ambiente é transferido. O totem TOTEM-BALCAO fica sem essa série." | texto idêntico |
| Cancelar | diálogo fecha, formulário aberto, sem PATCH | idêntico |
| Transferir e salvar | 1 PATCH com `transfer_series_id`, API 200, série 4/homolog passa ao CAIXA-01 (nº 30 preservado) | 1 PATCH com `transfer_series_id`, API 200, mesmo estado final no banco; "Totem atualizado com sucesso" e formulário fecha |

Observação: depois do PATCH 200, o legado mostra erro e mantém o formulário aberto porque a sua
checagem `assertAdminApiTotemRuntimePersisted` acusa as colunas de voucher ausentes nesta API
(problema anterior e alheio ao PR #56; o Next trata isso como aviso — desvio já documentado no
1.3.12). Banco restaurado ao estado original ao final (7 linhas em `nfce_series_config`, séries
dos totens 4/1/3). Servidores temporários (`:4081`, `:4082`, `:8095`, `:8096`, `:3105`) encerrados;
`:3100`, `:8090` e `:4080` intocados.

## Resultados

| Comando | Resultado |
|---|---|
| `npm run typecheck` | OK (0 erros) |
| `npm run lint` | OK (0 erros, 0 avisos) |
| `npm test` (`--no-file-parallelism`, `NODE_OPTIONS=--max-old-space-size=6144`) | 182 arquivos, **1369 testes passando** |
| `BACKEND=lan EASYFOOD_API_URL=http://127.0.0.1:4999 npm run build` | OK — todas as rotas dinâmicas (ƒ) |
| `LEGACY_DIR=C:\Users\crist\legacy-ref-hom npm run test:visual` (2 shards) | **116/116 passando** (58 cenários × desktop/mobile, inclui `totems-transferir-serie`); `MAX_DIFF_RATIO` inalterado. `totems-transferir-serie` sem imagem de diferença em `tests/visual/output` (diferença 0) |

## Pendências

- A API local (`easyfoodmanagerAPI` em `6f2f1a0`) precisa ser atualizada para o commit que traz
  `GET /v1/totems/series-owner`, `transfer_series_id` e o 409 de `reconcileTotemSeriesOwnership`;
  até lá, legado e Next salvam sem perguntar (paridade mantida). O contrato portado vem do cliente
  do legado; não foi conferido contra o código do servidor novo.
- O worktree `C:\Users\crist\legacy-ref-hom` continua registrado no `easyfoodmanagerWEB`
  (`git worktree list`); removê-lo é decisão do usuário (`git worktree remove`).
