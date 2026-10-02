import { Zip, ZipDeflate, strToU8 } from "fflate";
import type { NfceXmlArchiveStats } from "../application/nfce-repository";
import type { NfceListQuery } from "../domain/nfce-note";

/**
 * ZIP com os XML das NFC-e, montado NO NAVEGADOR — porta de
 * `LEGACY/src/lib/nfce-xml-archive.ts`, sem os ramos Electron/Supabase do chamador original (que
 * viviam em `data-service.ts`, não neste arquivo): aqui sobra só a montagem em si, que já era
 * agnóstica de modo — o modo LAN chama isto com `fetchBatch` batendo em `GET /nfce/notes-xml`.
 *
 * No modo nuvem (fora do escopo deste módulo) quem monta o pacote é a EasyFoodAPI, em streaming.
 * Nos modos locais (Electron, Admin API na LAN) não há servidor nosso no caminho — o dado vem em
 * lotes de JSON/SQL e o ZIP é montado aqui, com o mesmo layout de pastas e o mesmo `_RESUMO.txt`
 * dos dois lados.
 */

export interface NfceXmlRow {
  id: string;
  number: number | string | null;
  serie: number | string | null;
  access_key: string | null;
  status: string | null;
  issued_at: string | Date | null;
  authorized_xml: string | null;
  cancellation_xml: string | null;
  signed_xml: string | null;
  generated_xml: string | null;
}

const AUTHORIZED_FOLDER = "autorizadas";
const CANCELLED_FOLDER = "canceladas";
const OTHER_FOLDER = "nao-autorizadas";
const MAX_LINES_WITHOUT_XML = 500;

const STATUS_LABEL: Record<string, string> = {
  authorized: "Autorizada",
  rejected: "Rejeitada",
  denied: "Denegada",
  cancelled: "Cancelada",
  unusable: "Contingencia pendente",
  inutilized: "Inutilizada",
  sending: "Enviando",
  manual_review: "Pendente de correcao",
  draft: "Rascunho",
};

/**
 * Nome do `.zip`. Calculado aqui (não lido de `Content-Disposition`) para todos os modos
 * baixarem com o mesmo nome — nos modos locais não existe esse cabeçalho.
 */
export function xmlArchiveFileName(query: NfceListQuery, now: Date): string {
  const today = now.toISOString().slice(0, 10);
  if (query.from && query.to) return `nfce-xml-${query.from}-a-${query.to}.zip`;
  if (query.from) return `nfce-xml-desde-${query.from}.zip`;
  if (query.to) return `nfce-xml-ate-${query.to}.zip`;
  return `nfce-xml-completo-${today}.zip`;
}

/** As linhas de "Filtros aplicados" do `_RESUMO.txt`. */
export function describeXmlArchiveFilters(query: NfceListQuery): string[] {
  const lines: string[] = [];
  if (query.from && query.to) lines.push(`Periodo: ${toBrDate(query.from)} ate ${toBrDate(query.to)}`);
  else if (query.from) lines.push(`Periodo: a partir de ${toBrDate(query.from)}`);
  else if (query.to) lines.push(`Periodo: ate ${toBrDate(query.to)}`);
  else lines.push("Periodo: todo o historico disponivel");

  lines.push(`Status: ${query.status && query.status !== "all" ? (STATUS_LABEL[query.status] ?? query.status) : "Todos"}`);
  if (query.reconcileStatus) lines.push(`Reconciliacao: ${query.reconcileStatus}`);
  if (query.search) lines.push(`Busca: ${query.search}`);
  return lines;
}

/** `2026-07-31` → `31/07/2026`. Sem `new Date()`: o fuso viraria o dia. */
function toBrDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd;
}

interface XmlEntry {
  name: string;
  xml: string;
}

/**
 * Qual XML sai para cada nota, e com que nome — mesma regra da tela de detalhe.
 *
 * Autorizada e cancelada levam o `authorized_xml` (o procNFe, único documento que vale para
 * escrituração); a cancelada leva também o evento de cancelamento. Rejeitada e rascunho não têm
 * procNFe: vai o assinado ou o gerado, numa pasta à parte, porque misturar isso com o que é
 * escriturável faria o contador importar nota rejeitada.
 */
export function xmlEntriesForNote(row: NfceXmlRow): XmlEntry[] {
  const base = baseFileName(row);
  const status = String(row.status ?? "").toLowerCase();
  const cancelled = status === "cancelled" || row.cancellation_xml != null;
  const entries: XmlEntry[] = [];

  if (row.authorized_xml) {
    const folder = cancelled ? CANCELLED_FOLDER : AUTHORIZED_FOLDER;
    entries.push({ name: `${folder}/${base}.xml`, xml: row.authorized_xml });
  }
  if (row.cancellation_xml) {
    entries.push({ name: `${CANCELLED_FOLDER}/${base}-cancelamento.xml`, xml: row.cancellation_xml });
  }
  if (entries.length === 0) {
    if (row.signed_xml) {
      entries.push({ name: `${OTHER_FOLDER}/${base}-assinada.xml`, xml: row.signed_xml });
    } else if (row.generated_xml) {
      entries.push({ name: `${OTHER_FOLDER}/${base}-gerada.xml`, xml: row.generated_xml });
    }
  }
  return entries;
}

function baseFileName(row: NfceXmlRow): string {
  const key = String(row.access_key ?? "").replace(/\D/g, "");
  if (key.length >= 20) return key;
  const number = String(row.number ?? "0").replace(/\D/g, "").padStart(9, "0");
  const serie = String(row.serie ?? "0").replace(/\D/g, "").padStart(3, "0");
  const suffix = String(row.id ?? "").replace(/[^0-9a-f]/gi, "").slice(0, 8) || "semid";
  return `sem-chave-${number}-${serie}-${suffix}`;
}

export interface BuildXmlArchiveOptions {
  /** Lê o próximo lote de notas, em ordem de `id`. `null` = primeiro lote. */
  fetchBatch: (afterId: string | null) => Promise<NfceXmlRow[]>;
  summaryHeader: string[];
  now: Date;
}

export interface XmlArchiveReady {
  blob: Blob;
  stats: NfceXmlArchiveStats;
}

export async function buildXmlArchiveInBrowser(options: BuildXmlArchiveOptions): Promise<XmlArchiveReady> {
  const stats: NfceXmlArchiveStats = {
    notes: 0,
    files: 0,
    authorized: 0,
    cancelled: 0,
    notAuthorized: 0,
    withoutXml: 0,
  };
  const withoutXmlLines: string[] = [];
  const usedNames = new Set<string>();
  const chunks: Uint8Array[] = [];
  let zipError: Error | null = null;

  const zip = new Zip((err, chunk) => {
    if (err) {
      zipError = err;
      return;
    }
    // Cópia: o fflate reaproveita os buffers que entrega no callback.
    if (chunk && chunk.length > 0) chunks.push(chunk.slice());
  });

  const write = (name: string, content: string, mtime?: Date) => {
    const file = new ZipDeflate(uniqueName(usedNames, name), { level: 6 });
    // `mtime` é propriedade da instância e tem de estar posta ANTES do `add` — é no `add` que o
    // cabeçalho local do arquivo é escrito.
    if (mtime) file.mtime = mtime;
    zip.add(file);
    file.push(strToU8(content), true);
    if (zipError) throw zipError as Error;
  };

  let afterId: string | null = null;
  for (;;) {
    const batch = await options.fetchBatch(afterId);
    if (batch.length === 0) break;

    for (const row of batch) {
      stats.notes += 1;
      const entries = xmlEntriesForNote(row);
      if (entries.length === 0) {
        stats.withoutXml += 1;
        if (withoutXmlLines.length < MAX_LINES_WITHOUT_XML) withoutXmlLines.push(describeNote(row));
        continue;
      }
      const mtime = validDate(row.issued_at);
      for (const entry of entries) {
        write(entry.name, entry.xml, mtime);
        stats.files += 1;
        if (entry.name.startsWith(`${AUTHORIZED_FOLDER}/`)) stats.authorized += 1;
        else if (entry.name.startsWith(`${CANCELLED_FOLDER}/`)) stats.cancelled += 1;
        else stats.notAuthorized += 1;
      }
    }

    afterId = String(batch[batch.length - 1]!.id);
  }

  write("_RESUMO.txt", buildSummary(options, stats, withoutXmlLines), options.now);
  zip.end();
  if (zipError) throw zipError as Error;

  return {
    // `as BlobPart[]` porque o lib.dom tipa BlobPart com ArrayBuffer, não ArrayBufferLike.
    blob: new Blob(chunks as unknown as BlobPart[], { type: "application/zip" }),
    stats,
  };
}

/** Segunda nota com o mesmo nome não pode sobrescrever a primeira dentro do ZIP. */
function uniqueName(used: Set<string>, name: string): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const root = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let i = 2; ; i += 1) {
    const attempt = `${root}-${i}${ext}`;
    if (!used.has(attempt)) {
      used.add(attempt);
      return attempt;
    }
  }
}

function describeNote(row: NfceXmlRow): string {
  const number = String(row.number ?? "0").padStart(9, "0");
  const serie = String(row.serie ?? "0").padStart(3, "0");
  const issued = validDate(row.issued_at);
  const when = issued ? issued.toISOString().slice(0, 10) : "sem data";
  return `  ${number}/${serie}  ${when}  status=${row.status ?? "-"}`;
}

function validDate(v: string | Date | null): Date | undefined {
  if (v == null) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function buildSummary(options: BuildXmlArchiveOptions, stats: NfceXmlArchiveStats, withoutXmlLines: string[]): string {
  const lines: string[] = [
    "EasyFood - Exportacao de XML de NFC-e",
    `Gerado em: ${options.now.toISOString()}`,
    "",
    "Filtros aplicados:",
    ...options.summaryHeader.map((l) => `  ${l}`),
    "",
    `Notas exportadas .......: ${stats.notes}`,
    `Arquivos XML no pacote .: ${stats.files}`,
    `  autorizadas/ .........: ${stats.authorized}`,
    `  canceladas/ ..........: ${stats.cancelled}`,
    `  nao-autorizadas/ .....: ${stats.notAuthorized}`,
    `Notas sem XML ..........: ${stats.withoutXml}`,
  ];

  if (withoutXmlLines.length > 0) {
    lines.push("", "Notas sem nenhum XML (nao chegaram a ser assinadas):", ...withoutXmlLines);
    if (stats.withoutXml > withoutXmlLines.length) {
      lines.push(`  ... e mais ${stats.withoutXml - withoutXmlLines.length} nota(s).`);
    }
  }

  lines.push(
    "",
    "Pastas: autorizadas/ e canceladas/ contem o XML de autorizacao (procNFe), que e o",
    "documento valido para escrituracao. canceladas/ traz tambem o evento de cancelamento.",
    "nao-autorizadas/ contem XML gerado ou assinado de notas que NAO foram autorizadas -",
    "servem para diagnostico e NAO devem ser escriturados.",
    "",
  );
  return lines.join("\r\n");
}
