import { apiRequest, request, toResult } from "@/shared/http/api-client";
import type { RuntimeInfo } from "@/shared/runtime/runtime-context";
import { ApiError } from "@/shared/http/api-error";
import { toQueryString } from "@/shared/http/query-string";
import type { Tenant } from "@/shared/tenant/use-required-tenant";
import {
  validateNfceManualCorrection,
  type NfceManualCorrectionContext,
  type NfceManualCorrectionPayload,
  type NfceMutationResult,
} from "../domain/nfce-correction";
import type { NfceDetail } from "../domain/nfce-detail";
import type { NfceEvent, NfceLogEntry } from "../domain/nfce-history";
import type { NfceItem } from "../domain/nfce-item";
import type { NfceAttentionCounts, NfceListQuery, NfcePage, NfceTotals } from "../domain/nfce-note";
import type { NfcePayment } from "../domain/nfce-payment";
import type { NfceXmlKind } from "../domain/nfce-xml";
import type { NfceRepository, NfceXmlArchiveResult } from "../application/nfce-repository";
import { toNfceDetail } from "./nfce-detail-mapper";
import { toNfceEvent, toNfceLogEntry } from "./nfce-history-mapper";
import { toNfceItem } from "./nfce-item-mapper";
import { toNfceNote } from "./nfce-note-mapper";
import { toNfcePayment } from "./nfce-payment-mapper";
import {
  buildXmlArchiveInBrowser,
  describeXmlArchiveFilters,
  xmlArchiveFileName,
  type NfceXmlRow,
} from "./nfce-xml-archive";

type Row = Record<string, unknown>;

/** Tamanho do lote lido por ida ao banco durante a exportação — não é um teto, só o passo da paginação por `afterId`. */
const XML_ARCHIVE_BATCH_SIZE = 200;

function listQueryParams(query: NfceListQuery): Record<string, string | number | null | undefined> {
  return {
    status: query.status,
    reconcileStatus: query.reconcileStatus,
    from: query.from,
    to: query.to,
    search: query.search,
  };
}

/** O XML do tipo pedido quando já veio no detalhe (loja); `null` se ausente ou em branco. */
function inlineXml(detail: NfceDetail | null | undefined, kind: NfceXmlKind): string | null {
  const documents = detail?.documents;
  if (!documents) return null;
  const value =
    kind === "authorized"
      ? documents.authorizedXml
      : kind === "cancellation"
        ? documents.cancellationXml
        : kind === "signed"
          ? documents.signedXml
          : documents.generatedXml;
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * `GET` que devolve `null` em vez de lançar quando a nota não existe: 404 (nota não encontrada)
 * OU 400 `invalid_note_id` (id que não é UUID — a API valida o formato antes de consultar).
 * Sem o segundo caso, um id malformado mostrava DOIS avisos ao operador: o toast de erro do
 * `apiRequest` E "Nota não encontrada" da tela, que já cobre o caso (Menor 13 da revisão da
 * Fase 3).
 */
async function getOrNull<T>(path: string, tenant: Tenant): Promise<T | null> {
  try {
    return await apiRequest<T>(path, { tenant });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    if (error instanceof ApiError && error.status === 400 && error.code === "invalid_note_id") return null;
    throw error;
  }
}

/**
 * NFC-e pelas rotas `/v1/nfce/*` da `easyfoodmanagerAPI` (modo LAN) — os mesmos endpoints que o
 * legado consome no modo Admin API: lista, totais, contagens de atenção, detalhe, itens,
 * pagamentos, eventos, logs, XML e as duas mutações de correção manual.
 */
export class ApiNfceRepository implements NfceRepository {
  constructor(
    private readonly tenant: Tenant,
    private readonly backend: RuntimeInfo["backend"] = "lan",
  ) {}

  async list(query: NfceListQuery): Promise<NfcePage> {
    const response = await apiRequest<{ data?: Row[]; total?: number; page?: number; limit?: number }>(
      `/nfce/notes${toQueryString({ ...listQueryParams(query), page: query.page ?? 1, limit: query.limit ?? 50 })}`,
      { tenant: this.tenant },
    );
    return {
      data: (response.data ?? []).map(toNfceNote),
      total: response.total ?? 0,
      page: response.page ?? query.page ?? 1,
      limit: response.limit ?? query.limit ?? 50,
    };
  }

  async totals(query: NfceListQuery): Promise<NfceTotals | null> {
    const response = await apiRequest<{ data?: { total?: number; porStatus?: Record<string, number>; valorAutorizado?: string } }>(
      `/nfce/totals${toQueryString(listQueryParams(query))}`,
      { tenant: this.tenant },
    );
    if (!response.data) return null;
    return {
      total: response.data.total ?? 0,
      byStatus: response.data.porStatus ?? {},
      authorizedAmount: Number(response.data.valorAutorizado ?? 0),
    };
  }

  async attentionCounts(): Promise<NfceAttentionCounts> {
    const response = await apiRequest<{ data?: NfceAttentionCounts }>("/nfce/attention-counts", {
      tenant: this.tenant,
    });
    return response.data ?? { manualReview: 0, reconcileFailed: 0, unusable: 0 };
  }

  async detail(noteId: string): Promise<NfceDetail | null> {
    const response = await getOrNull<{ data?: Row }>(`/nfce/notes/${encodeURIComponent(noteId)}`, this.tenant);
    return response?.data ? toNfceDetail(response.data) : null;
  }

  async items(noteId: string): Promise<NfceItem[]> {
    const response = await apiRequest<{ data?: Row[] }>(`/nfce/notes/${encodeURIComponent(noteId)}/items`, {
      tenant: this.tenant,
    });
    return (response.data ?? []).map(toNfceItem);
  }

  async payments(noteId: string): Promise<NfcePayment[]> {
    const response = await apiRequest<{ data?: Row[] }>(`/nfce/notes/${encodeURIComponent(noteId)}/payments`, {
      tenant: this.tenant,
    });
    return (response.data ?? []).map(toNfcePayment);
  }

  async logs(noteId: string): Promise<NfceLogEntry[]> {
    const response = await apiRequest<{ data?: Row[] }>(`/nfce/notes/${encodeURIComponent(noteId)}/logs`, {
      tenant: this.tenant,
    });
    return (response.data ?? []).map(toNfceLogEntry);
  }

  async events(noteId: string): Promise<NfceEvent[]> {
    const response = await apiRequest<{ data?: Row[] }>(`/nfce/notes/${encodeURIComponent(noteId)}/events`, {
      tenant: this.tenant,
    });
    return (response.data ?? []).map(toNfceEvent);
  }

  /**
   * O XML inline do detalhe vale primeiro (loja: a easyfoodmanagerAPI lê o PG da loja, que
   * devolve as colunas de XML junto com a nota). Na nuvem o detalhe não traz o XML: ele vem sob
   * demanda de `/nfce/notes/:id/xml/:kind` — `fetchNfceXml` do legado. Na loja, o que não veio
   * inline simplesmente não existe.
   */
  async xml(noteId: string, kind: NfceXmlKind, alreadyLoaded?: NfceDetail | null): Promise<string | null> {
    const inline = inlineXml(alreadyLoaded, kind);
    if (inline) return inline;
    if (this.backend !== "cloud") return null;
    const response = await apiRequest<{ data?: { xml?: string | null } | null }>(
      `/nfce/notes/${encodeURIComponent(noteId)}/xml/${kind}`,
      { tenant: this.tenant },
    );
    return response?.data?.xml ?? null;
  }

  async downloadXmlArchive(query: NfceListQuery): Promise<NfceXmlArchiveResult> {
    return this.backend === "cloud" ? this.downloadCloudXmlArchive(query) : this.buildLanXmlArchive(query);
  }

  /** Nuvem: o ZIP já vem pronto — a EasyFoodAPI monta e envia em streaming (`/nfce/xml-archive`). */
  private async downloadCloudXmlArchive(query: NfceListQuery): Promise<NfceXmlArchiveResult> {
    const filename = xmlArchiveFileName(query, new Date());
    const response = await request(`/nfce/xml-archive${toQueryString(listQueryParams(query))}`, { tenant: this.tenant });
    if (!response.ok) await toResult(response);
    return { blob: await response.blob(), filename };
  }

  /** Loja: a easyfoodmanagerAPI devolve os XML em lotes e o pacote é montado aqui. */
  private async buildLanXmlArchive(query: NfceListQuery): Promise<NfceXmlArchiveResult> {
    const now = new Date();
    const filename = xmlArchiveFileName(query, now);
    const { blob, stats } = await buildXmlArchiveInBrowser({
      now,
      summaryHeader: describeXmlArchiveFilters(query),
      fetchBatch: async (afterId) => {
        const response = await apiRequest<{ data?: NfceXmlRow[] }>(
          `/nfce/notes-xml${toQueryString({ ...listQueryParams(query), afterId, limit: XML_ARCHIVE_BATCH_SIZE })}`,
          { tenant: this.tenant },
        );
        return response.data ?? [];
      },
    });
    return { blob, filename, stats };
  }

  /**
   * Invariante 1 (Menor 1 da revisão da Fase 3): revalida aqui, não só no hook de tela — a
   * checagem sem rede que devolve `{ ok: false }` na hora, ANTES de gastar um `POST`, é a rede de
   * segurança para qualquer chamador que não passe pelo `use-nfce-correction-form.ts`.
   */
  async saveManualCorrection(
    noteId: string,
    context: NfceManualCorrectionContext,
    payload: NfceManualCorrectionPayload,
  ): Promise<NfceMutationResult> {
    const validation = validateNfceManualCorrection(context, payload);
    if (!validation.ok) return { ok: false, error: validation.error };
    return apiRequest<NfceMutationResult>(`/nfce/notes/${encodeURIComponent(noteId)}/manual-correction`, {
      method: "POST",
      body: payload,
      tenant: this.tenant,
    });
  }

  async saveAndReprocessManualCorrection(
    noteId: string,
    context: NfceManualCorrectionContext,
    payload: NfceManualCorrectionPayload,
  ): Promise<NfceMutationResult> {
    const saved = await this.saveManualCorrection(noteId, context, payload);
    if (!saved.ok) return saved;
    const reprocessed = await this.reprocess(noteId);
    if (!reprocessed.ok) return reprocessed;
    return { ok: true, message: "Correção salva e reprocessamento solicitado com sucesso." };
  }

  async reprocess(noteId: string): Promise<NfceMutationResult> {
    return apiRequest<NfceMutationResult>(`/nfce/notes/${encodeURIComponent(noteId)}/reprocess`, {
      method: "POST",
      body: {},
      tenant: this.tenant,
    });
  }
}
