import type {
  NfceManualCorrectionContext,
  NfceManualCorrectionPayload,
  NfceMutationResult,
} from "../domain/nfce-correction";
import type { NfceDetail } from "../domain/nfce-detail";
import type { NfceEvent, NfceLogEntry } from "../domain/nfce-history";
import type { NfceItem } from "../domain/nfce-item";
import type { NfceAttentionCounts, NfceListQuery, NfcePage, NfceTotals } from "../domain/nfce-note";
import type { NfcePayment } from "../domain/nfce-payment";
import type { NfceXmlKind } from "../domain/nfce-xml";

export type {
  NfceManualCorrectionContext,
  NfceManualCorrectionItem,
  NfceManualCorrectionPayload,
  NfceManualCorrectionPayment,
  NfceManualCorrectionRecipient,
  NfceMutationResult,
} from "../domain/nfce-correction";
export type { NfceAttentionCounts, NfceListQuery, NfcePage, NfceTotals } from "../domain/nfce-note";

/** O ZIP de XML pronto para baixar, e as contagens do pacote (ausentes não fazem sentido aqui: quem monta é sempre este repositório, no navegador). */
export interface NfceXmlArchiveResult {
  blob: Blob;
  filename: string;
  /** Contagens do pacote. Ausente na nuvem — lá quem monta (e conta) é a API, como no legado. */
  stats?: NfceXmlArchiveStats;
}

export interface NfceXmlArchiveStats {
  notes: number;
  files: number;
  authorized: number;
  cancelled: number;
  notAuthorized: number;
  withoutXml: number;
}

/**
 * Porta de acesso às notas fiscais (NFC-e) — todos os endpoints que a lista (`/nfce`) e o
 * detalhe (`/nfce/:id`) consomem no modo LAN (`easyfoodmanagerAPI`, `GET/POST /v1/nfce/*`).
 *
 * Só leitura, exceto `saveManualCorrection`/`saveAndReprocessManualCorrection`/`reprocess` — as
 * únicas mutações que a NFC-e aceita, e mesmo assim limitadas ao estado `manual_review` (ver
 * `domain/nfce-correction.ts`).
 */
export interface NfceRepository {
  list(query: NfceListQuery): Promise<NfcePage>;

  /**
   * Totais do PERÍODO inteiro (mesmos filtros de `list`, sem `page`/`limit`). `null` quando o
   * backend não tem como calcular (nunca deve acontecer no modo LAN — ver implementação).
   */
  totals(query: NfceListQuery): Promise<NfceTotals | null>;

  attentionCounts(): Promise<NfceAttentionCounts>;

  /** `null` quando a nota não existe. */
  detail(noteId: string): Promise<NfceDetail | null>;

  items(noteId: string): Promise<NfceItem[]>;

  payments(noteId: string): Promise<NfcePayment[]>;

  logs(noteId: string): Promise<NfceLogEntry[]>;

  events(noteId: string): Promise<NfceEvent[]>;

  /**
   * O XML de um tipo, para a nota `noteId`. No modo LAN o XML só existe se já veio inline no
   * `detail` carregado (`alreadyLoaded`) — não há rota própria para buscar um XML avulso.
   */
  xml(noteId: string, kind: NfceXmlKind, alreadyLoaded?: NfceDetail | null): Promise<string | null>;

  /**
   * ZIP com os XML de TODAS as notas que casam com o filtro (não a página carregada na tela).
   * Busca os lotes via `GET /nfce/notes-xml` e monta o pacote no navegador.
   */
  downloadXmlArchive(query: NfceListQuery): Promise<NfceXmlArchiveResult>;

  /**
   * Invariante 1 (`domain/nfce-correction.ts`): a implementação valida com
   * `validateNfceManualCorrection(context, payload)` ANTES de montar o `POST` — não é opcional
   * nem responsabilidade de quem chama. `context` vem de `NfceDetailBundle` (status/CRT/UF/total
   * da nota carregados); quem chama não pode simplesmente omitir a checagem (Menor 1 da revisão
   * da Fase 3: antes, só o hook de UI validava, e um segundo chamador futuro passaria direto).
   */
  saveManualCorrection(
    noteId: string,
    context: NfceManualCorrectionContext,
    payload: NfceManualCorrectionPayload,
  ): Promise<NfceMutationResult>;

  saveAndReprocessManualCorrection(
    noteId: string,
    context: NfceManualCorrectionContext,
    payload: NfceManualCorrectionPayload,
  ): Promise<NfceMutationResult>;

  reprocess(noteId: string): Promise<NfceMutationResult>;
}
