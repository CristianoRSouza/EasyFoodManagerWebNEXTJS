# Fase 3 — Onda 0, item 2: núcleo `src/modules/nfce` (relatório)

Escopo: **apenas** o item 2 da Onda 0 do plano (`2026-09-28-fase-3-fiscal.md`) — o núcleo do
módulo NFC-e (domínio, aplicação, infraestrutura, hook e componentes visuais compartilhados), sem
telas (`ui/list`/`ui/detail` são dos agentes A/B). `src/shared/**` não foi tocado (item 1/3 é de
outro agente, rodando em paralelo). Nada commitado — tudo pendente na árvore de trabalho.

Modo coberto: **LAN** (`easyfoodmanagerAPI`, `Tenant` obrigatório no construtor do repositório,
igual a orders/dashboard/units pós-revisão da Fase 2). Sem ramos Electron/Supabase/Cloud API.

## Verde

- `npx tsc --noEmit`: 0 erros em `src/modules/nfce/**` (erros pré-existentes em
  `src/modules/taxreform/**`, de outro agente, fora do meu escopo — não toquei nesses arquivos).
- `npx eslint src/modules/nfce`: 0/0.
- `npx vitest run src/modules/nfce`: **12 arquivos, 97 testes, todos verdes.**
- `npx vitest run` (repo inteiro): 88/89 arquivos verdes; a única falha
  (`src/modules/issuer/ui/IssuerPage.test.tsx`) é de outro módulo, que não importa nada de
  `nfce` — não investiguei além de confirmar que não toquei nada do que ela depende.

## Dependência nova

`fflate@^0.8.3` (mesma versão do legado) em `package.json`/`package-lock.json` — usada só por
`infrastructure/nfce-xml-archive.ts` (montagem do ZIP de XML no navegador).

## Estrutura entregue

```
src/modules/nfce/
├── domain/
│   ├── nfce-note.ts            # NfceStatus, NfceNote, NfceListQuery, NfcePage, NfceAttentionCounts, NfceTotals
│   ├── nfce-item.ts            # NfceItem (+ ICMS/PIS/COFINS aninhados), sumNfceItemsTotal
│   ├── nfce-payment.ts         # NfcePayment, sumNfcePaymentsNet
│   ├── nfce-history.ts         # NfceLogEntry, NfceEvent
│   ├── nfce-detail.ts          # NfceDetail composto (identification/issuer/recipient/totals/taxReform/documents/recovery)
│   ├── nfce-xml.ts             # NfceXmlKind
│   ├── nfce-formatters.ts      # porta verbatim de LEGACY/src/lib/nfce-formatters.ts (+ teste, 23 casos)
│   └── nfce-correction.ts      # validateNfceManualCorrection — invariante 1 (+ teste, 17 casos)
├── application/
│   └── nfce-repository.ts      # interface NfceRepository + tipos re-exportados
├── infrastructure/
│   ├── nfce-note-mapper.ts     # toNfceNote, toNfceStatus, toPaymentMethods
│   ├── nfce-detail-mapper.ts   # toNfceDetail (+ teste)
│   ├── nfce-item-mapper.ts     # toNfceItem (+ teste)
│   ├── nfce-payment-mapper.ts  # toNfcePayment (+ teste)
│   ├── nfce-history-mapper.ts  # toNfceLogEntry, toNfceEvent (+ teste)
│   ├── nfce-xml-archive.ts     # porta de LEGACY/src/lib/nfce-xml-archive.ts (+ teste, 14 casos)
│   └── api-nfce-repository.ts  # ApiNfceRepository implements NfceRepository (+ teste, 15 casos)
└── ui/
    ├── use-nfce-repository.ts  # useNfceRepository(): NfceRepository
    ├── NfceStatusBadge.tsx     # (+ teste)
    ├── NfcePaymentBadge.tsx    # (+ teste)
    └── NfceSummaryCards.tsx    # cópia fiel do legado, tipada contra NfceTotals (+ teste, 7 casos)
```

`ui/list/**` e `ui/detail/**` **não existem** — são dos agentes A/B.

## Domínio — tipos principais

### `NfceNote` (linha da listagem, `domain/nfce-note.ts`)

```ts
export type NfceStatus =
  | "authorized" | "rejected" | "cancelled" | "draft" | "unusable"
  | "inutilized" | "denied" | "sending" | "manual_review";

export const NFCE_EDITABLE_STATUS: NfceStatus; // "manual_review"

export interface NfceNote {
  id: string; number: number; serie: number; accessKey: string | null;
  status: NfceStatus; totalValue: number; discountValue: number;
  issuedAt: string; authorizedAt: string | null; protocol: string | null;
  returnCode: string | null; returnReason: string | null;
  orderId: string | null; qrCode: string | null;
  issuerCnpj: string; issuerCompanyName: string; issuerTradeName: string | null; issuerUf: string;
  recipientDocument: string | null; recipientName: string | null;
  itemCount: number; paymentMethods: string[]; // ex.: ["03","17"], nunca [""]
  emissionType: number | null; reconcileStatus: string | null; retryCount: number | null;
}

export interface NfceListQuery {
  status?: string; reconcileStatus?: string; from?: string; to?: string;
  search?: string; page?: number; limit?: number;
}
export interface NfcePage { data: NfceNote[]; total: number; page: number; limit: number; }
export interface NfceAttentionCounts { manualReview: number; reconcileFailed: number; unusable: number; }
export interface NfceTotals { total: number; byStatus: Record<string, number>; authorizedAmount: number; }
```

Os links do Dashboard (`?status=manual_review`, `?status=all&reconcileStatus=failed`,
`?status=unusable`) mapeiam direto para `NfceListQuery.status`/`reconcileStatus` — a tela de lista
(agente A) só precisa ler os `searchParams` da rota e repassar.

### `NfceDetail` (`domain/nfce-detail.ts`)

Composto, não um tipo-linha de 90 campos:

```ts
export interface NfceDetail {
  note: NfceNote;                 // ⚠️ ver nota abaixo sobre total_nota vs valor_total
  model: string | null;
  emissionPurpose: number | null;
  queryUrl: string | null;
  transactionId: string | null;
  identification: NfceIdentification | null; // ambiente, tipo/finalidade emissão, presença, intermediador...
  issuer: NfceIssuerDetail;                   // cnpj, razão, endereço completo, taxRegimeCode (CRT)
  recipient: NfceRecipientDetail | null;      // null quando NENHUM campo do destinatário veio preenchido
  totals: NfceFiscalTotals;                   // products/discount/freight/insurance/otherExpenses/note/icms/icmsSt/ipi/pis/cofins/fcp
  taxReform: NfceTaxReformTotals;             // IBS/CBS (migração 030) — todos os campos number|null
  documents: NfceDocuments;                   // XML inline (podem faltar no LAN também — ver `xml()`)
  recovery: NfceRecovery;                     // reconcile/retry/last-error/manual-fix/origin-replacement
  additionalInfo: string | null;              // infCpl
  taxInfo: string | null;                     // infAdFisco
}
```

⚠️ **Achado importante para o agente B**: a rota `GET /nfce/notes/:id` da `easyfoodmanagerAPI`
**não devolve** `valor_total`/`valor_desconto` — a mesma coluna sai com outro alias
(`total_nota`/`total_desconto`), porque o detalhe também carrega os demais totais fiscais. O
mapeador (`toNfceDetail`) já resolve isso: `detail.note.totalValue`/`discountValue` vêm certos.
Só documentando para quem for comparar com a query SQL do legado e estranhar a ausência do
alias `valor_total` ali.

`NfceItem` (`domain/nfce-item.ts`) e `NfcePayment` (`domain/nfce-payment.ts`) são carregados à
parte (rotas próprias — ver repositório). `NfceItem.icms.cstOrCsosn` guarda CST OU CSOSN (só um
vem preenchido, conforme o CRT do emitente). `sumNfceItemsTotal(items)` reproduz a fórmula SQL do
legado (`gross - discount + freight + insurance + otherExpenses`), útil para o agente B calcular
`originalItemsTotal`/`updatedItemsTotal` da validação de correção.

## Validação de correção manual — invariante 1 (`domain/nfce-correction.ts`)

```ts
export interface NfceManualCorrectionPayload {
  recipient: { cpf: string; cnpj: string; name: string; email: string };
  infoComplementar: string;
  items: { item: number; ncm: string; cfop: string; cest: string; icmsCstCsosn: string }[];
  payments: { seq: number; paymentMethod: string; paymentValue: string; changeValue?: string }[];
  recipientUf?: string;
}
export type NfceMutationResult = { ok: true; message?: string } | { ok: false; error?: string };

export interface NfceManualCorrectionContext {
  status: NfceStatus;
  taxRegimeCode: number | null;   // detail.issuer.taxRegimeCode (CRT)
  issuerUf: string | null;        // detail.issuer.uf
  recipientUf: string | null;     // detail.recipient?.uf ?? null — fallback se o payload não trouxer
  noteTotal: number;              // detail.note.totalValue
  originalItemsTotal: number;     // sumNfceItemsTotal(items ANTES da edição)
  updatedItemsTotal: number;      // sumNfceItemsTotal(items DEPOIS — hoje sempre igual, a correção não toca em preço/qtd)
}

export function validateNfceManualCorrection(
  context: NfceManualCorrectionContext,
  payload: NfceManualCorrectionPayload,
): { ok: true } | { ok: false; error: string };
```

Mirror **exato** de `saveNfceManualCorrection` (`LEGACY/src/lib/data-service.ts`), na mesma ordem
e com as mesmas mensagens: estado `manual_review` obrigatório → NCM/CFOP/CST-CSOSN por item →
CFOP interno/interestadual por UF → forma/valor/troco de pagamento → **invariante 1a** (total dos
itens não pode mudar) → **invariante 1b** (pagamentos − troco ≥ total da nota). A
`easyfoodmanagerAPI` refaz a mesma conferência dentro da transação (`nfce-mutation-logic.ts`) —
ela é a autoridade; esta função só dá feedback antes da rede. **O agente B deve chamar isto antes
de `repository.saveManualCorrection(...)`** e mostrar `result.error` sem nem tentar a chamada
quando `ok: false`.

## Repositório (`application/nfce-repository.ts` + `infrastructure/api-nfce-repository.ts`)

```ts
export interface NfceRepository {
  list(query: NfceListQuery): Promise<NfcePage>;
  totals(query: NfceListQuery): Promise<NfceTotals | null>;
  attentionCounts(): Promise<NfceAttentionCounts>;
  detail(noteId: string): Promise<NfceDetail | null>;             // null em 404
  items(noteId: string): Promise<NfceItem[]>;
  payments(noteId: string): Promise<NfcePayment[]>;
  logs(noteId: string): Promise<NfceLogEntry[]>;
  events(noteId: string): Promise<NfceEvent[]>;
  xml(noteId: string, kind: NfceXmlKind, alreadyLoaded?: NfceDetail | null): Promise<string | null>;
  downloadXmlArchive(query: NfceListQuery): Promise<NfceXmlArchiveResult>; // { blob, filename, stats }
  saveManualCorrection(noteId: string, payload: NfceManualCorrectionPayload): Promise<NfceMutationResult>;
  saveAndReprocessManualCorrection(noteId: string, payload: NfceManualCorrectionPayload): Promise<NfceMutationResult>;
  reprocess(noteId: string): Promise<NfceMutationResult>;
}
```

`useNfceRepository()` (`ui/use-nfce-repository.ts`) devolve `ApiNfceRepository` memoizado por
`[tenant]`, igual a orders/dashboard/units.

Pontos de atenção para os agentes A/B:

- **`xml()` não bate rede no modo LAN** — o XML só existe se já veio inline no `detail` carregado
  (a `easyfoodmanagerAPI` lê o PG da loja, que devolve as colunas de XML junto com a nota). Passe
  sempre o `NfceDetail` já carregado como terceiro argumento; sem ele, ou se o campo pedido vier
  vazio, a função devolve `null` — trate como "este XML não existe para este documento", não como
  erro.
- **`downloadXmlArchive`** pagina por `afterId` (cursor por `id`, não por página) contra
  `GET /nfce/notes-xml`, monta o ZIP com `fflate` no navegador e devolve `{ blob, filename, stats }`
  prontos — a tela só precisa disparar um `<a download>` com o `blob`/`filename`. `stats` tem
  `{ notes, files, authorized, cancelled, notAuthorized, withoutXml }`, útil para um toast de
  resumo ("327 notas, 4 sem XML").
- **`total`/`totals` nunca somam página** — `totals()` bate `/nfce/totals` (mesmos filtros de
  `list`, sem `page`/`limit`); é o que `NfceSummaryCards` espera em `totals`.
- **`saveAndReprocessManualCorrection`** encadeia `saveManualCorrection` → `reprocess`; para no
  primeiro `ok: false` e devolve esse resultado sem chamar o segundo passo.
- Toda chamada passa `Tenant` (nunca `TenantHeaders`) — mesmo padrão pós-revisão da Fase 2
  (I7 do `fase-2-revisao-final.md`).

## Componentes visuais compartilhados (`ui/`)

```tsx
<NfceStatusBadge status="authorized" className?: string />   // aria-label="Status: Autorizada"
<NfcePaymentBadge code="17" />                                // aria-label="PIX"
<NfceSummaryCards totals={NfceTotals | null} dateFrom?: string dateTo?: string />
```

Cópia fiel do legado (JSX/classes/textos idênticos), só a tipagem de `NfceSummaryCards` foi
adaptada de `{ porStatus, valorAutorizado }` (legado) para `{ byStatus, authorizedAmount }`
(nosso `NfceTotals` em inglês) — comportamento e saída visual idênticos (teste de 7 casos portado
verbatim do legado, adaptando só os nomes de campo do fixture).

## O que NÃO fiz (fora do escopo do item 2)

- Não toquei `src/shared/**` (primitivas, `issuer-sections`, `CloudFieldWarning` — item 1/3).
- Não criei `ui/list/**`, `ui/detail/**`, nem `src/app/(panel)/nfce/**` (agentes A/B).
- Não investiguei a falha pré-existente em `src/modules/issuer/ui/IssuerPage.test.tsx` (módulo
  sem relação de import com `nfce`).

## Concerns para a Onda 1

1. O agente A (lista) precisa decidir onde armazenar/ler os `searchParams` da rota para alimentar
   `NfceListQuery` — não criei nenhum hook de página, só o repositório.
2. O agente B (detalhe) precisa montar `NfceManualCorrectionContext` a partir do `NfceDetail` +
   `NfceItem[]` carregados (campos indicados acima) antes de chamar `validateNfceManualCorrection`.
3. `NfceDetail.recipient` pode ser `null` mesmo em nota autorizada (consumidor não identificado) —
   o formulário de correção precisa lidar com estado inicial vazio, não assumir objeto presente.
