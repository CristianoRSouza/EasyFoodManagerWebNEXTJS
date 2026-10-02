# Fase 3 — Emitente NFC-e (`/nfce-issuer`) — relatório

Agente C da Onda 1. Branch `feat/fase-1-fundacao`. Nada commitado (sem `git commit/merge/push/
stash/reset/checkout/restore`). Nenhum `.env` lido, nenhuma API/Supabase real chamada. Toquei
apenas: `src/modules/issuer/**`, `src/app/(panel)/nfce-issuer/page.tsx`,
`tests/visual/fixtures/issuer.ts`, `tests/visual/scenarios/issuer.ts`.

## ATUALIZAÇÃO — edição implementada (ruling do controller)

A primeira entrega desta tela foi somente-leitura, com o raciocínio de que o legado só mostra
"Editar" com `isElectron()` (nunca no navegador/Admin API). O controller decidiu que isso não deve
ser replicado: a API já aceita `PATCH /v1/nfce/issuer-config/:id` em modo Admin API (o próprio
legado grava por aí quando chamado do Electron — o Electron só usa um caminho *diferente*,
IPC + Postgres direto, não a rota HTTP), e como o Next **substitui** o app Electron, a loja perderia
a única forma de editar o emitente se a tela ficasse travada em leitura. Implementei a edição
completa nesta rodada — ver "O que mudou" abaixo. A seção "Decisão central" original fica como
histórico de raciocínio (parcialmente revertido).

### O que mudou

- **`canEdit` substitui `isElectron()`**: `backend === "lan"` (decidido em `use-issuer-page.ts`).
  Mostrei "Editar" só no LAN porque não confirmei que a EasyFoodAPI (nuvem) aceita esta gravação —
  o módulo `EASYCOMMAND REFATORADO/src/modules/issuer/infrastructure/api-issuer-repository.ts`
  (referência de domínio, não de UI) tem um `update()` que **lança erro de propósito** porque "a
  alteração do emitente ainda não existe na EasyFoodAPI". Não gold-plated um caminho de escrita
  cloud sem confirmação de contrato.
- **Descoberta importante em `LEGACY/src/lib/data-service.ts`**: o Electron NÃO usa o mesmo
  `applyPlainSecretsToEncryptedPayload` do servidor — tem o seu próprio
  `applyIssuerSecretEncryptToPayload` (linha ~283), com a MESMA regra "chave presente e vazia →
  apaga o segredo cifrado". A única proteção contra apagar um segredo ao deixar o campo em branco,
  no legado inteiro, é o ref `omitEmptyEasyerpApiKeyOnSaveRef` — e ele só cobre `apikey_easyerp`.
  Se o operador editasse no Electron e deixasse `aditum_tef_partner_token` em branco (o que é o
  caso comum, já que mesmo no Electron a leitura só decifra se `sensitiveDecrypt` funcionar), o
  token cifrado existente seria APAGADO. Isto não é invariante 2 sendo violada (o valor não vaza),
  mas é uma perda de dado silenciosa. O controller pediu explicitamente "empty = unchanged" para
  todos os campos de segredo — generalizei a proteção do `apikey_easyerp` para os quatro campos
  (`aditum_tef_partner_token`, `aditum_tef_activation_code`, `apikey_easyerp`,
  `certificate_password`) em vez de replicar o bug. **Isto é uma melhoria deliberada sobre o
  comportamento literal do legado**, pedida pelo próprio controller ("follow ... empty = unchanged"),
  não uma cópia OK-para-divergir por conta própria.
- **JSX/textos**: idênticos ao legado nas duas seções (leitura e edição) — `EditableInfoRow`,
  `<Select>` de CRT, `Textarea` de infCpl/TEF, `MobileStickyActionBar`, toasts com o mesmo texto
  (`"Salvo com sucesso"` / `"Erro ao salvar"` / `"Cancelar"` / `"Salvar"`/`"Salvando..."`).
- **Sem hint textual novo**: o legado só tem a frase "Chave já existe cifrada na BD..." para
  `apikey_easyerp` (mostrada quando `easyerpApiKeySet`); não inventei textos equivalentes para os
  outros três campos de segredo — a proteção "empty = unchanged" é só lógica de payload, invisível
  na tela, exatamente como pedido ("mesmo JSX/classes/textos").

### domain/issuer-edit-draft.ts (novo)

```ts
export type IssuerEditDraft = Record<string, string>; // chaves snake_case = colunas da API
export const ISSUER_NUMERIC_FIELDS: Set<string>;   // igual a `numericFields` do legado
export const ISSUER_SECRET_FIELDS: Set<string>;    // aditum_tef_partner_token, aditum_tef_activation_code, apikey_easyerp, certificate_password
export function draftFromConfig(config: NfceIssuerConfig): IssuerEditDraft;
export function buildIssuerUpdatePayload(draft: IssuerEditDraft): Record<string, unknown>;
```

`buildIssuerUpdatePayload` é a peça central da invariante 2 na edição: campo de segredo em branco
é **omitido** do corpo (nunca `null`); preenchido, vai como string (a API cifra/grava). Campo
numérico em branco vira `null`, preenchido vira `parseInt`. Os demais campos seguem a regra
"branco → `null`" do legado. Testada exaustivamente em `issuer-edit-draft.test.ts` (13 testes).

### Repositório

`IssuerRepository.update(id, payload)` novo — `ApiIssuerRepository.update()` faz
`PATCH /nfce/issuer-config/${id}` com o `payload` (já construído por `buildIssuerUpdatePayload`) e
o tenant; propaga `ApiError` (com `.message` em PT-BR) para quem chama decidir o toast — igual ao
`catch (error: any) { toast({ description: error.message }) }` do legado.

### `use-issuer-page.ts`

Ganhou `editingId`, `draft`, `saving`, `canEdit`, `startEditing`, `cancelEditing`,
`handleFieldChange`, `handleSave` — mesmo fluxo do `NfceIssuerConfigPage` (`startEditing` semeia o
rascunho com `draftFromConfig`; `handleSave` constrói o payload, faz o PATCH, toast, sai da edição
e recarrega; erro mantém a edição aberta com o rascunho intacto, para o operador tentar de novo).

### Componentes com o branch de edição adicionado

`IssuerStatusHeader` (botões Editar/Cancelar/Salvar), `IssuerMainGrid` (todos os campos de
Empresa/Endereço/NFC-e/Metadados, incluindo o `<Select>` de CRT), `IssuerInfCplCard` (2 Textareas),
`IssuerTefCard` (2 Textareas de segredo + 2 Inputs de TEF admin), `IssuerEasyerpCard` (3 campos +
hint), `IssuerCertificateCard` (9 campos, incluindo `certificate_password`, que só existe em
edição — igual ao legado, que também nunca o mostra em leitura). `IssuerPage.tsx` acrescentou a
barra sticky mobile (Editar / Cancelar+Salvar), igual ao legado.

## Diferença nova, esperada no teste visual (`nfce-issuer-carregado`)

O legado, em modo LAN (navegador, sem `window.electronAPI`), **não mostra "Editar"** — só o
Electron mostra. O Next agora mostra "Editar" sempre que `backend === "lan"`. Isso é intencional
(ruling do controller) mas vai aparecer como diferença de pixels na comparação visual
legado-vs-Next da cena `nfce-issuer-carregado` (o cabeçalho de status e a faixa mobile terão o
botão extra). Não ajustei a cena (fora do meu escopo tocar em `tests/visual/scenario.ts`, e a
Onda 2 é quem roda `test:visual` e decide `region()`/crops) — sinalizando aqui para quem for rodar
a comparação: **o diff aqui é esperado e correto**, não é regressão a corrigir portando de volta
para leitura.

## Endpoints usados (modo LAN, `easyfoodmanagerAPI`)

- `GET /v1/nfce/issuer-config` (`nfce-issuer-config.ts`) → `{ data: Row[] }`. A própria API já
  remove `aditum_tef_partner_token`, `aditum_tef_activation_code`, `apikey_easyerp` e
  `certificate_password` da resposta (`mapIssuerRowToClient`), devolvendo só as flags
  `easyerp_api_key_set`, `aditum_tef_partner_token_encrypted_set`,
  `aditum_tef_activation_code_encrypted_set`, `issuer_sensitive_secrets_ready`.
- `GET /v1/nfce/acbr-config` (`nfce.ts`) → `{ data: Row[] }` (`id, key, value, description,
  updated_at`). Sem parâmetros.
- `PATCH /v1/nfce/issuer-config/:id` — implementado (ver acima). Corpo: colunas de
  `PATCHABLE_COLUMNS`/`PLAIN_SECRET_KEYS` da rota da API; o servidor cifra os 3 campos de
  `PLAIN_SECRET_KEYS` antes de gravar e rejeita campo desconhecido (`unknown_field`) ou corpo vazio
  (`empty_patch`) — `buildIssuerUpdatePayload` só envia colunas que o legado também envia, então não
  deve bater em `unknown_field`; `empty_patch` só ocorreria se TODOS os campos ficassem em branco
  (não testado — o `id`/campos obrigatórios do domínio sempre vêm preenchidos do `draftFromConfig`).

No repositório (`ApiIssuerRepository`), `acbrConfig()` só chama a rota quando `backend === "lan"` —
fora disso devolve `[]` sem requisição, replicando `fetchNfceAcbrConfig` do legado (que também
devolve `[]` fora de Admin API/Electron, pois o ACBrLib só roda sincronizado do Firebird da loja).
`list()`/`update()` chamam a mesma rota canônica nos dois backends citados no código (como
`ApiProductRepository.fiscal()` faz para rotas iguais nos dois backends) — não verifiquei o
contrato do backend "cloud" para `/nfce/issuer-config` GET (fora do escopo desta tela, que o brief
restringe ao modo LAN); por isso `canEdit` é `false` na nuvem, e o mapper de leitura é defensivo a
campos ausentes.

## Invariante 2 (segredos do emitente nunca em claro)

Confirmei em `easyfoodmanagerAPI/src/routes/v1/nfce-issuer-config.ts` que o servidor já redige os
segredos antes de responder (leitura) e cifra antes de gravar (escrita). A UI é a última linha de
defesa dos dois lados:

- **Leitura**: `IssuerTefCard`/`IssuerEasyerpCard` nunca renderizam o valor — só decidem entre um
  texto fixo ("•••••••• (definido — cifrado na BD)" etc.) e "—".
- **Edição**: `draftFromConfig` força os 4 campos de segredo a abrirem SEMPRE em branco
  (incondicionalmente — nem olha o valor do domínio), e `buildIssuerUpdatePayload` nunca inclui a
  chave no PATCH quando o campo continua em branco (evita apagar o segredo existente).

Testes dedicados:
- `issuer-edit-draft.test.ts`: "nunca inventa um segredo" (mapper), "os 4 campos de segredo sempre
  abrem em branco" (draft), "segredo em branco é OMITIDO do payload", "segredo preenchido é
  enviado, uma vez".
- `IssuerPage.test.tsx`: leitura com um valor em claro simulado nunca aparece no DOM.
- `IssuerPage.edit.test.tsx`: "segredo NÃO digitado não entra no corpo do PATCH" (todos os 4 campos
  de uma vez), "segredo digitado é enviado uma vez no PATCH e nunca aparece em claro na tela depois
  de salvar".

## Diferenças conhecidas em relação ao legado

1. **Edição só no LAN** (`canEdit = backend === "lan"`) — a nuvem (EasyFoodAPI) não tem contrato de
   escrita confirmado para este cadastro (ver acima). Sem paralelo direto no legado (lá a distinção
   era Electron vs. não-Electron, não LAN vs. nuvem).
2. **Proteção "empty = unchanged" generalizada aos 4 campos de segredo**, não só `apikey_easyerp`
   como no legado — pedido explícito do controller, documentado como melhoria (ver "Descoberta
   importante" acima).
3. **Estado de erro na carga inicial funde-se ao estado vazio**, como no legado: `loadData` do
   legado só faz `console.error` e segue com `configs = []` quando a chamada falha (só o *refresh*
   silencioso mostra toast de falha). Portei isso literalmente: `useIssuerPage` não distingue
   "erro" de "vazio" na primeira carga — os dois caem no mesmo card "Nenhuma configuração de
   emitente encontrada.". `IssuerPage.test.tsx` tem os dois testes (vazio/erro) exercitando o
   mesmo resultado visual, de propósito.
4. **Toasts** usam o texto exato do legado ("Dados atualizados"/"Cadastro do emitente
   recarregado.", "Salvo com sucesso"/"Configuração do emitente atualizada.", "Erro ao salvar",
   "Falha ao atualizar").
5. **Diff visual esperado em `nfce-issuer-carregado`** por causa do botão "Editar" — ver seção
   dedicada acima.

## Candidatos a compartilhado

Nenhum. Tudo que precisei já existia em `src/shared/ui/issuer-sections/` e
`src/shared/ui/CloudFieldWarning.tsx` (Onda 0a) ou em `src/shared/format/date-time.ts` e
`src/shared/infrastructure/convert.ts` (Fase 2).

## Estrutura (atualizada)

```
src/modules/issuer/
  domain/nfce-issuer-config.ts        # NfceIssuerConfig, NfceAcbrConfig (camelCase) +
                                       # isCertificateExpired/certificateDaysLeft/isCertificateUrgent
  domain/nfce-issuer-config.test.ts
  domain/issuer-edit-draft.ts         # NOVO: draftFromConfig, buildIssuerUpdatePayload, invariante 2 na edição
  domain/issuer-edit-draft.test.ts
  application/issuer-repository.ts    # porta: list(), acbrConfig(), update()
  infrastructure/issuer-config-mapper.ts       # snake_case (API) -> domínio
  infrastructure/issuer-config-mapper.test.ts
  infrastructure/api-issuer-repository.ts      # ApiIssuerRepository(tenant, backend) + update()
  infrastructure/api-issuer-repository.test.ts
  ui/use-issuer-repository.ts
  ui/use-issuer-page.ts               # useQuery + refresh/toast + edição (editingId/draft/saving)
  ui/IssuerPage.tsx                   # orquestrador (loading/vazio/dados/edição + sticky mobile)
  ui/IssuerStatusHeader.tsx           # status + badges + Editar/Cancelar/Salvar
  ui/IssuerMainGrid.tsx               # Dados da Empresa / Endereço / NFC-e-NFe / Metadados (leitura+edição)
  ui/IssuerInfCplCard.tsx             # infCpl 250/251 (leitura+edição)
  ui/IssuerTefCard.tsx                # TEF Aditum — invariante 2 (leitura+edição)
  ui/IssuerEasyerpCard.tsx            # Identificação EasyERP — invariante 2 (leitura+edição)
  ui/IssuerCertificateCard.tsx        # Certificado Digital (leitura+edição)
  ui/AcbrConfigTable.tsx              # tabela ACBrLib (só leitura, sem edição no legado também)
  ui/IssuerPage.test.tsx              # carregando / vazio / erro / dados + invariante 2 (leitura)
  ui/IssuerPage.edit.test.tsx         # NOVO: Editar/Cancelar/Salvar, erro ao salvar, invariante 2 na edição
src/app/(panel)/nfce-issuer/page.tsx
tests/visual/fixtures/issuer.ts
tests/visual/scenarios/issuer.ts
```

Maior arquivo de produção: `IssuerTefCard.tsx` (197 linhas) — ainda bem abaixo do limite de ~300.

## Resultados dos testes

- `npx vitest run src/modules/issuer` (de `/c/Users/crist/Desktop/easyfoodmanagerNEXT`) — **6
  arquivos, 45 testes, todos verdes**:
  - domínio: 8 testes de certificado + 13 de `issuer-edit-draft` (draft/payload/invariante 2);
  - infraestrutura: 9 testes de mapper + 7 de repositório (list/acbrConfig/update, incluindo PATCH
    com corpo/tenant corretos, id codificado na URL, erro com mensagem PT-BR);
  - página (leitura): 6 testes — carregando/vazio/erro/dados/invariante 2;
  - página (edição): 7 testes — abrir com campos preenchidos, esconder "Editar" na nuvem, cancelar
    restaura e não chama a API, salvar com sucesso (PATCH+toast+sai da edição), erro ao salvar
    (toast+mantém edição), segredo não digitado não vai no PATCH, segredo digitado vai uma vez e
    nunca aparece em claro depois.
- `npx tsc --noEmit` — **0 erros no projeto inteiro** (os 2 erros de `src/modules/taxreform` da
  entrega anterior deste relatório já não existem mais — corrigidos por outro agente, sem relação
  com este trabalho).
- `npx eslint src/modules/issuer "src/app/(panel)/nfce-issuer"` — **0 erros / 0 avisos**.
- Não rodei `npm run build` nem `npm run test:visual` (regra da Fase 3 — outros agentes editando a
  mesma árvore; o controller roda ao final). Fixture (`tests/visual/fixtures/issuer.ts`) registra
  rotas próprias (`/v1/nfce/issuer-config`, `/v1/nfce/acbr-config`), sem colisão com A/B/D.
