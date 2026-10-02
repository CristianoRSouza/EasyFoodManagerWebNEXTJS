# Fase 4 — Onda 0: base (relatório)

> **Superado por `fase-4-integracao-report.md`** (e pelas "Correções pós-revisão" de
> `fase-4-revisao-final.md`). Este relatório descreve um estado intermediário; onde divergir do código, vale o código e aqueles dois documentos.

Branch `feat/fase-1-fundacao`. Nada commitado — nenhum `git commit/merge/push/stash/reset/checkout/
restore` foi usado. Nenhum `.env` foi lido. Nenhum teste chama API real ou Supabase (tudo com
`fetch` mockado via `vi.spyOn`). `npx vitest` sempre executado a partir de `/c/Users/...` (drive
maiúsculo).

Entregues os 5 itens da Onda 0 do plano (`2026-09-29-fase-4-dispositivos.md`). O módulo
`src/modules/bootstrap` (agente C, em paralelo) não foi tocado.

## 1. Primitivas que faltavam

Comparando os imports `@/components/ui/*` de `TotemConfigPage`, `AgentConfigPage`,
`PixnopdvStoreCredentialsPage`, `BootstrapCodePage` e `components/{totem,agent,license}/*` contra
`src/shared/ui/primitives/` já existente, faltavam três: `alert`, `switch`, `radio-group`
(`card`, `badge`, `button`, `skeleton`, `tooltip`, `dialog`, `select`, `input`, `label`,
`separator`, `tabs` já existiam de fases anteriores).

Copiadas verbatim (`"use client"` + `@/lib/utils` → `@/shared/ui/cn`, resto idêntico):

- `src/shared/ui/primitives/alert.tsx` — `Alert`, `AlertTitle`, `AlertDescription` (sem dependência nova).
- `src/shared/ui/primitives/switch.tsx` — `Switch` (usa `@radix-ui/react-switch`).
- `src/shared/ui/primitives/radio-group.tsx` — `RadioGroup`, `RadioGroupItem` (usa `@radix-ui/react-radio-group`).

`package.json`: adicionados `@radix-ui/react-switch": "^1.1.2"` e
`"@radix-ui/react-radio-group": "^1.2.2"` — exatamente as versões do legado
(`easyfoodmanagerWEB/package.json`), instaladas via `npm install <pkg>@<versão>`.

Testes: 3 casos novos em `src/shared/ui/primitives/primitives.test.tsx` (Alert variant destructive,
Switch `data-state`, RadioGroup item selecionado) — arquivo já existente, ampliado no mesmo estilo
(sem criar arquivo por primitiva, seguindo o padrão da Fase 2 Onda 0).

Import: `@/shared/ui/primitives/<nome>` (sem barrel, mesmo padrão das primitivas já existentes).

## 2. `src/shared/license/`

Porta fiel de `LEGACY/src/lib/license-labels.ts`, `LEGACY/src/lib/totem-license-display.ts`,
`LEGACY/src/components/license/{LicensePlanBadge,LicenseStatusBadge}.tsx`.

| Arquivo | Exports |
|---|---|
| `license-labels.ts` | `PLAN_SLUG_LABELS`, `LICENSE_TYPE_LABELS` (records); `LicenseLabelRecord` (interface: `id: string`, `device_key?: string \| null`, `license_type?: string \| null`, `plan_slug?: string \| null`, `created_at: string`); `compareLicensesForLabelOrder(a: LicenseLabelRecord, b: LicenseLabelRecord): number`; `getLicensePlanLabel(licenseType?: string \| null, planSlug?: string \| null): string`; `isDemoLicense(licenseType?: string \| null, planSlug?: string \| null): boolean`; `buildLicenseLabelMap(licenses: LicenseLabelRecord[]): Map<string, string>` |
| `totem-license-display.ts` | `TotemLicenseFields` (interface — ver divergência abaixo); `hasActiveTotemLicense(totem: Pick<TotemLicenseFields, "license_id" \| "license_status">): boolean`; `effectiveTotemIsActive(totem: Pick<TotemLicenseFields, "is_active" \| "license_id" \| "license_status">): boolean`; `hasTotemLicenseInLocalPg` (`@deprecated`, delega para `hasActiveTotemLicense`) |
| `LicensePlanBadge.tsx` | `LicensePlanBadgeProps { licenseType?: string \| null; planSlug?: string \| null; displayLabel?: string \| null; className?: string }`; componente `LicensePlanBadge(props: LicensePlanBadgeProps)` |
| `LicenseStatusBadge.tsx` | componente `LicenseStatusBadge({ isActive: boolean \| null; expiresAt: string \| null })` |

**Divergência deliberada — `TotemLicenseFields`**: o legado tipa os parâmetros de
`totem-license-display.ts` como `Pick<TotemConfig, ...>`, importado de `@/types/totem.types`. Este
módulo vive em `src/shared/license`, consumido pelo módulo `src/modules/totems` (Onda 1) — não o
contrário. Importar `TotemConfig` de um módulo que ainda não existe (e que, quando existir, deveria
depender de `shared`, nunca o inverso) quebraria a direção de dependência que todo o resto do
projeto já segue (`shared/plan`, `shared/format` etc. não dependem de `modules/*`). `TotemLicenseFields`
é a mesma forma estrutural que o `Pick<>` do legado usa, só declarada localmente. Nenhuma regra
mudou — mesmos testes de comportamento.

Testes: `license-labels.test.ts` (9 casos, port literal do legado — mesmo arquivo de teste, mesmas
asserções), `totem-license-display.test.ts` (12 casos — **novo**, o legado não tinha teste para este
arquivo; a Fase 4 pede "lógica pura + testes", então escrevi cobertura TDD para as 3 funções),
`LicensePlanBadge.test.tsx` (3 casos — plano pago sem ícone, demo com tooltip/título, `displayLabel`
sobrescrevendo), `LicenseStatusBadge.test.tsx` (5 casos — inativa/expirada/expirando/ativa/ativa sem
data). Total: 4 arquivos, **26 testes**, todos verdes.

Import: `@/shared/license/<nome>` (sem barrel).

## 3. `src/modules/pixnopdv` — núcleo

```
src/modules/pixnopdv/
  domain/
    pixnopdv-store-credentials.ts   # tipos
    pixnopdv-store-merge.ts         # porta pura do merge/mapper do legado
    pixnopdv-store-merge.test.ts    # 15 casos, port literal do teste do legado
  application/
    pixnopdv-repository.ts          # interface PixnopdvRepository
  infrastructure/
    api-pixnopdv-repository.ts      # ApiPixnopdvRepository (GET/PUT /v1/pixnopdv-store-credentials)
    api-pixnopdv-repository.test.ts # 5 casos
  ui/
    use-pixnopdv-repository.ts      # usePixnopdvRepository()
    use-pixnopdv-store-credentials.ts  # estado/query/handlers do cartão
    PixnopdvStoreCredentialsCard.tsx   # cópia fiel do JSX do legado
    PixnopdvStoreCredentialsCard.test.tsx  # 9 casos (loading/vazio/erro/dados/salvar/limpar)
```

### Contrato conferido contra a API real

`C:\Users\crist\Desktop\easyfoodmanagerAPI\src\routes\v1\pixnopdv-store-credentials.ts`:
`GET /v1/pixnopdv-store-credentials` → `{ data: <view> }`; `PUT` (mesmo corpo do `PutInput`) →
`{ ok: true, data: <view> }`. A rota resolve a loja no servidor (`resolveSiteIdentity()`) — não lê
`store_id` de query/header —, mas o `tenant` ainda vai no cabeçalho `x-company-id`/`x-store-id`
(convenção do projeto: todo repositório recebe `Tenant`, igual a `ApiIssuerRepository`). Confirmado
em `data-service.ts` do legado (`fetchPixnopdvStoreCredentialsProducao`/
`savePixnopdvStoreCredentialsProducao`) que **o mesmo caminho `/v1/pixnopdv-store-credentials`** é
usado tanto pelo Modo 2 (Admin API/LAN, via `adminApiGetJson`/`adminApiPutJson`) quanto pelo Modo 3
(Cloud EasyFoodAPI, via `fetchApiPixnopdvCredentials`/`salvarPixnopdvApi` em `cloud-api-data.ts`) —
por isso `ApiPixnopdvRepository` não precisa do `backend` no construtor (diferente de
`ApiIssuerRepository`, que usa `backend` só para pular `acbrConfig()` fora do LAN); os dois backends
do Next (`lan`, `cloud`) chamam a mesma rota.

### Assinaturas exportadas

```ts
// domain/pixnopdv-store-credentials.ts
export interface PixnopdvStoreCredentialsView {
  store_id: string;
  environment: "producao";
  api_base_url: string | null;
  basic_user: string | null;
  basic_token_set: boolean;
  secret_key_set: boolean;
  insecure_tls: boolean;
  enabled: boolean;
  updated_at: string | null;
}
export interface PixnopdvStoreCredentialsPutInput {
  api_base_url?: string | null;
  basic_user?: string | null;
  basic_token?: string | null;
  secret_key?: string | null;
  insecure_tls?: boolean;
  enabled?: boolean;
}

// domain/pixnopdv-store-merge.ts
export type PixnopdvMergedRow = {
  api_base_url: string | null; basic_user: string | null; basic_token: string | null;
  secret_key: string | null; insecure_tls: boolean; enabled: boolean;
};
export function mergePixnopdvStorePut(prev: PixnopdvMergedRow | null, input: PixnopdvStoreCredentialsPutInput): PixnopdvMergedRow;
export function mapPixnopdvRowToView(row: Record<string, unknown> | null | undefined, storeId: string): PixnopdvStoreCredentialsView;

// application/pixnopdv-repository.ts
export interface PixnopdvRepository {
  get(): Promise<PixnopdvStoreCredentialsView>;
  save(input: PixnopdvStoreCredentialsPutInput): Promise<PixnopdvStoreCredentialsView>;
}

// infrastructure/api-pixnopdv-repository.ts
export class ApiPixnopdvRepository implements PixnopdvRepository {
  constructor(tenant: Tenant);
}

// ui/use-pixnopdv-repository.ts
export function usePixnopdvRepository(): PixnopdvRepository;

// ui/use-pixnopdv-store-credentials.ts
export function usePixnopdvStoreCredentials(): {
  writable: boolean;
  data: PixnopdvStoreCredentialsView | undefined;
  isLoading: boolean; isError: boolean; error: unknown; refetch: () => Promise<unknown>;
  apiBaseUrl: string; setApiBaseUrl: (v: string) => void;
  basicUser: string; setBasicUser: (v: string) => void;
  insecureTls: boolean; setInsecureTls: (v: boolean) => void;
  enabled: boolean; setEnabled: (v: boolean) => void;
  basicTokenInput: string; onBasicTokenChange: (v: string) => void;
  secretKeyInput: string; onSecretKeyChange: (v: string) => void;
  clearBasicToken: boolean; onClearBasicToken: () => void;
  clearSecretKey: boolean; onClearSecretKey: () => void;
  handleSave: () => Promise<void>;
};

// ui/PixnopdvStoreCredentialsCard.tsx
export function PixnopdvStoreCredentialsCard(props: { embedInPage?: boolean }): JSX.Element;
```

Import (sem barrel — "índice público" do módulo = esta lista de caminhos diretos):
`@/modules/pixnopdv/ui/PixnopdvStoreCredentialsCard`, `.../ui/use-pixnopdv-repository`,
`.../application/pixnopdv-repository`, `.../domain/pixnopdv-store-credentials`,
`.../domain/pixnopdv-store-merge`. O agente de Totens (Onda 1) reusa `PixnopdvStoreCredentialsCard`
direto por este caminho — não precisou nada além do já feito aqui (o card já resolve tenant/backend
sozinho via os hooks do próprio módulo).

### Decisões e divergências (regra de paridade)

1. **Tipos em snake_case, não camelCase+mapper.** Diferente de `modules/issuer` (que converte
   `snake_case` → camelCase com `asNumber`/`asBoolean` porque lida com uma linha crua do Postgres),
   aqui a API já devolve JSON com os tipos finais — não há linha de banco a normalizar — e o
   componente é cópia fiel do legado, que referencia estes mesmos nomes de campo no JSX
   (`data.api_base_url`, `data.basic_token_set`, …). Um mapper camelCase seria uma tradução sem
   necessidade e afastaria o componente do "cópia fiel" pedido no item 3 do plano. Documentado no
   topo de `domain/pixnopdv-store-credentials.ts`.
2. **`writable` sempre `true` no Next — corrige um bug do legado, não o reproduz.** No legado,
   `writable = isElectronShell() || isAdminApiConfigured() || isCloudSupabaseMode() ||
   isBrowserMockDatasetMode()`. Conferido em `admin-api-client.ts`/`cloud-api.ts`:
   `isAdminApiConfigured()` retorna `false` sempre que `isCloudApiMode()` é `true` (mutuamente
   exclusivas). Ou seja, no Modo 3 real (Cloud via EasyFoodAPI) — que TEM
   `fetchApiPixnopdvCredentials`/`salvarPixnopdvApi` funcionais — o legado mostra o alerta "não é
   possível editar credenciais da loja" mesmo podendo gravar. É um bug claro (a lista de `writable`
   nunca foi atualizada quando o Modo 3 foi introduzido). O Next só tem os backends `lan`
   (≈ Modo 2) e `cloud` (≈ Modo 3), os dois graváveis pela API real — `writable = backend ===
   "lan" || backend === "cloud"`, sempre `true` na prática. Documentado no JSDoc do hook e do
   componente.
3. **Alerta "Não foi possível resolver a loja" (Electron) OMITIDO.** É texto específico do modo
   desktop Electron (`ecb_sync.site_identity` local) — não existe no Next (regra de paridade:
   diverge quando o comportamento do legado dependia do Electron).
4. **`pixnopdv-store-merge.ts` não é usado por `ApiPixnopdvRepository`.** A API real já faz o merge
   no servidor; o repositório só repassa. A porta existe porque o servidor fake do harness visual
   (`tests/visual/fixtures/pixnopdv.ts`, a ser escrito na Onda 1 pelo agente B) precisa simular o
   MESMO comportamento stateful de `GET`/`PUT` sem duplicar a lógica à mão — usará
   `mergePixnopdvStorePut`/`mapPixnopdvRowToView` diretamente, já testados aqui.
5. **`GET` nunca devolve `data` nulo na API real** — `mapRowToClient(null, storeId)` sempre volta um
   objeto completo com defaults (`enabled: true`, flags `_set: false`). O alerta "Sem credenciais de
   produção para esta loja" (`data == null`) do card, portanto, é praticamente inatingível pela API
   de verdade — mas foi mantido literalmente (JSX idêntico ao legado, testado com `fetch` mockado
   devolvendo `data: null` diretamente) porque a regra de paridade pede identidade visual "na
   dúvida", e remover código morto não documentado como bug não se qualifica como a exceção da
   regra.

## 4. Este relatório

`docs/superpowers/plans/fase-4-onda-0-report.md` (este arquivo).

## 5. Resultado dos comandos (execução final)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 erros |
| `npm run lint` (`eslint src`) | 0 erros / 0 avisos |
| `npx vitest run` | **111 arquivos, 738 testes, todos verdes** |

Sub-resultados conferidos isoladamente durante o desenvolvimento:
`src/shared/ui/primitives/primitives.test.tsx` (5/5), `src/shared/license/**` (4 arquivos, 26/26),
`src/modules/pixnopdv/**` (3 arquivos, 28/28).

Um ajuste de lint foi necessário: `react-hooks/set-state-in-effect` disparou no `useEffect` que
repõe o formulário quando os dados recarregam (`use-pixnopdv-store-credentials.ts`) — mesmo padrão
já presente em `shared/layout/AppLayout.tsx`/`shared/session/login/*` — resolvido com
`// eslint-disable-next-line react-hooks/set-state-in-effect` inline e comentário, não alteração de
`eslint.config.mjs` (convenção já estabelecida nas Fases 2/3, ver `grep eslint-disable` no
repositório).

Um ajuste de `tsc` foi necessário em `license-labels.ts` (`deviceKeySortNum`): `noUncheckedIndexedAccess`
do Next exige `m?.[1]` em vez de `m[1]` (o legado não tem essa flag) — sem mudança de comportamento.

## Arquivos criados/alterados nesta sessão

```
src/shared/ui/primitives/alert.tsx                       # novo
src/shared/ui/primitives/switch.tsx                       # novo
src/shared/ui/primitives/radio-group.tsx                  # novo
src/shared/ui/primitives/primitives.test.tsx               # ampliado (+3 casos)
src/shared/license/license-labels.ts                       # novo
src/shared/license/license-labels.test.ts                  # novo
src/shared/license/totem-license-display.ts                # novo
src/shared/license/totem-license-display.test.ts           # novo
src/shared/license/LicensePlanBadge.tsx                     # novo
src/shared/license/LicensePlanBadge.test.tsx                # novo
src/shared/license/LicenseStatusBadge.tsx                   # novo
src/shared/license/LicenseStatusBadge.test.tsx              # novo
src/modules/pixnopdv/domain/pixnopdv-store-credentials.ts   # novo
src/modules/pixnopdv/domain/pixnopdv-store-merge.ts         # novo
src/modules/pixnopdv/domain/pixnopdv-store-merge.test.ts    # novo
src/modules/pixnopdv/application/pixnopdv-repository.ts     # novo
src/modules/pixnopdv/infrastructure/api-pixnopdv-repository.ts       # novo
src/modules/pixnopdv/infrastructure/api-pixnopdv-repository.test.ts  # novo
src/modules/pixnopdv/ui/use-pixnopdv-repository.ts           # novo
src/modules/pixnopdv/ui/use-pixnopdv-store-credentials.ts    # novo
src/modules/pixnopdv/ui/PixnopdvStoreCredentialsCard.tsx     # novo
src/modules/pixnopdv/ui/PixnopdvStoreCredentialsCard.test.tsx # novo
package.json / package-lock.json                             # +@radix-ui/react-switch, +@radix-ui/react-radio-group
docs/superpowers/plans/fase-4-onda-0-report.md                # este relatório
```

## Pendências / observações para a Onda 1

- Nenhum item da Onda 0 ficou pendente.
- O agente de Totens (A) ainda precisa portar `totem-fiscal.ts` e `types/totem.types.ts` (fora do
  escopo da Onda 0 — não são primitivas nem o núcleo do PIXnoPDV) e vai consumir
  `src/shared/license/*` e `src/modules/pixnopdv/ui/PixnopdvStoreCredentialsCard` diretamente.
- O agente de Agentes/PIXnoPDV (B) só precisa do módulo `pixnopdv` para a página `/pixnopdv` (a
  tela é fina sobre o card, igual ao legado `PixnopdvStoreCredentialsPage.tsx`); nenhum uso de
  `shared/license` foi encontrado em `AgentConfigPage`/`components/agent/*` no legado.
- `RadioGroup`/`RadioGroupItem` só é usado pelo `TotemFormDialog` (ambiente ACBr: produção/
  homologação, por exemplo) — confirmar ao portar que nenhuma outra opção do formulário foi
  esquecida.
- Tudo pendente de commit, como determinado pelas regras da Fase 4.
