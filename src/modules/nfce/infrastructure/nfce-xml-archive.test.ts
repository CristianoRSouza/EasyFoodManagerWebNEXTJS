import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import {
  buildXmlArchiveInBrowser,
  describeXmlArchiveFilters,
  xmlArchiveFileName,
  xmlEntriesForNote,
  type NfceXmlRow,
} from "./nfce-xml-archive";

/**
 * O ZIP de XML montado no navegador (modo LAN, Admin API/`easyfoodmanagerAPI`).
 *
 * O que se testa aqui não é "gerou um arquivo": é que o pacote entregue ao CONTADOR está certo —
 * XML íntegro, nota cancelada com os dois documentos, rejeitada separada do que é escriturável, e
 * ausência de teto silencioso de notas.
 */

const NOW = new Date("2026-08-06T12:00:00.000Z");
const ACCESS_KEY = "35260413971933000178650020000011641837486150";

function note(over: Partial<NfceXmlRow> = {}): NfceXmlRow {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    number: 1164,
    serie: 2,
    access_key: ACCESS_KEY,
    status: "authorized",
    issued_at: "2026-07-31T18:21:00.000Z",
    authorized_xml: "<nfeProc>autorizada</nfeProc>",
    cancellation_xml: null,
    signed_xml: null,
    generated_xml: null,
    ...over,
  };
}

/** O Blob do jsdom não tem `arrayBuffer()`; o FileReader dele, sim. */
function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(new Uint8Array(r.result as ArrayBuffer));
    r.readAsArrayBuffer(blob);
  });
}

async function buildZip(batches: NfceXmlRow[][]) {
  const { blob, stats } = await buildXmlArchiveInBrowser({
    fetchBatch: async (afterId) => {
      if (afterId === null) return batches[0] ?? [];
      const i = batches.findIndex((b) => b.length > 0 && String(b[b.length - 1]!.id) === afterId);
      return batches[i + 1] ?? [];
    },
    summaryHeader: ["Periodo: 01/07/2026 ate 31/07/2026"],
    now: NOW,
  });
  const bytes = await blobBytes(blob);
  const entries = unzipSync(bytes);
  return { blob, stats, bytes, entries, summary: strFromU8(entries["_RESUMO.txt"]!) };
}

describe("ZIP de XML da NFC-e (montado no navegador)", () => {
  it("é um .zip de verdade e o XML volta idêntico ao que estava no banco", async () => {
    const { blob, bytes, entries, stats } = await buildZip([[note()]]);

    expect(blob.type).toBe("application/zip");
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(Object.keys(entries).sort()).toEqual(["_RESUMO.txt", `autorizadas/${ACCESS_KEY}.xml`]);
    expect(strFromU8(entries[`autorizadas/${ACCESS_KEY}.xml`]!)).toBe("<nfeProc>autorizada</nfeProc>");
    expect(stats).toMatchObject({ notes: 1, files: 1, authorized: 1 });
  });

  it("cancelada leva o procNFe E o evento de cancelamento", async () => {
    const { entries, stats } = await buildZip([
      [note({ status: "cancelled", cancellation_xml: "<procEventoNFe>cancel</procEventoNFe>" })],
    ]);
    expect(Object.keys(entries).sort()).toEqual([
      "_RESUMO.txt",
      `canceladas/${ACCESS_KEY}-cancelamento.xml`,
      `canceladas/${ACCESS_KEY}.xml`,
    ]);
    expect(stats.cancelled).toBe(2);
    expect(stats.authorized).toBe(0);
  });

  it("rejeitada/rascunho ficam em pasta SEPARADA — não podem ser escrituradas", async () => {
    const { entries } = await buildZip([
      [
        note({
          id: "00000000-0000-4000-8000-000000000002",
          status: "rejected",
          access_key: null,
          number: 7,
          authorized_xml: null,
          signed_xml: "<NFe>assinada</NFe>",
        }),
        note({
          id: "00000000-0000-4000-8000-000000000003",
          status: "draft",
          access_key: null,
          number: 8,
          authorized_xml: null,
          generated_xml: "<NFe>gerada</NFe>",
        }),
      ],
    ]);
    expect(Object.keys(entries).sort()).toEqual([
      "_RESUMO.txt",
      "nao-autorizadas/sem-chave-000000007-002-00000000-assinada.xml",
      "nao-autorizadas/sem-chave-000000008-002-00000000-gerada.xml",
    ]);
  });

  it("nota sem XML nenhum não vira arquivo, mas é NOMEADA no resumo", async () => {
    const { entries, summary, stats } = await buildZip([
      [
        note({
          status: "draft",
          number: 42,
          access_key: null,
          authorized_xml: null,
          signed_xml: null,
          generated_xml: null,
        }),
      ],
    ]);
    expect(Object.keys(entries)).toEqual(["_RESUMO.txt"]);
    expect(stats).toMatchObject({ notes: 1, files: 0, withoutXml: 1 });
    expect(summary).toContain("Notas sem XML ..........: 1");
    expect(summary).toContain("000000042/002");
  });

  it("duas notas com a MESMA chave não se sobrescrevem dentro do ZIP", async () => {
    const { entries } = await buildZip([
      [
        note({ id: "00000000-0000-4000-8000-00000000000a", authorized_xml: "<a/>" }),
        note({ id: "00000000-0000-4000-8000-00000000000b", authorized_xml: "<b/>" }),
      ],
    ]);
    expect(strFromU8(entries[`autorizadas/${ACCESS_KEY}.xml`]!)).toBe("<a/>");
    expect(strFromU8(entries[`autorizadas/${ACCESS_KEY}-2.xml`]!)).toBe("<b/>");
  });

  it("varre TODOS os lotes — o download não para na primeira página", async () => {
    const n = (i: number) => note({ id: `00000000-0000-4000-8000-00000000000${i}`, access_key: String(i).repeat(44) });
    const { stats } = await buildZip([[n(1), n(2)], [n(3)]]);
    expect(stats.notes).toBe(3);
    expect(stats.files).toBe(3);
  });

  it("NÃO existe teto de notas — quem recorta é o filtro, e só ele", async () => {
    const uid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    const batches = Array.from({ length: 6 }, (_, l) =>
      Array.from({ length: 250 }, (_, k) => {
        const i = l * 250 + k + 1;
        return note({ id: uid(i), number: i, access_key: String(i).padStart(44, "0") });
      }),
    );

    const { stats, entries, summary } = await buildZip(batches);

    expect(stats.notes).toBe(1500);
    expect(stats.files).toBe(1500);
    expect(Object.keys(entries)).toHaveLength(1501);
    expect(summary).not.toMatch(/limite|INCOMPLETA/i);
  });

  it("o resumo registra os filtros que geraram o pacote", async () => {
    const { summary } = await buildZip([[note()]]);
    expect(summary).toContain("Filtros aplicados:");
    expect(summary).toContain("Periodo: 01/07/2026 ate 31/07/2026");
  });
});

describe("nome do arquivo e descrição dos filtros", () => {
  it("leva o período no nome — três `nfce.zip` na pasta Downloads seriam indistinguíveis", () => {
    expect(xmlArchiveFileName({ from: "2026-07-01", to: "2026-07-31" }, NOW)).toBe(
      "nfce-xml-2026-07-01-a-2026-07-31.zip",
    );
    expect(xmlArchiveFileName({ from: "2026-07-01" }, NOW)).toBe("nfce-xml-desde-2026-07-01.zip");
    expect(xmlArchiveFileName({ to: "2026-07-31" }, NOW)).toBe("nfce-xml-ate-2026-07-31.zip");
    expect(xmlArchiveFileName({}, NOW)).toBe("nfce-xml-completo-2026-08-06.zip");
  });

  it("formata a data sem passar por Date — o fuso viraria o dia", () => {
    expect(describeXmlArchiveFilters({ from: "2026-07-01", to: "2026-07-31" })[0]).toBe(
      "Periodo: 01/07/2026 ate 31/07/2026",
    );
  });

  it("traduz o status para o rótulo da tela", () => {
    expect(describeXmlArchiveFilters({ status: "authorized" })).toContain("Status: Autorizada");
    expect(describeXmlArchiveFilters({})).toContain("Status: Todos");
    expect(describeXmlArchiveFilters({ status: "all" })).toContain("Status: Todos");
  });
});

describe("mesma regra da tela de detalhe para escolher o XML", () => {
  it("autorizada → só o procNFe", () => {
    expect(xmlEntriesForNote(note()).map((e) => e.name)).toEqual([`autorizadas/${ACCESS_KEY}.xml`]);
  });

  it("cancelada sem procNFe ainda entrega o evento de cancelamento", () => {
    const e = xmlEntriesForNote(note({ status: "cancelled", authorized_xml: null, cancellation_xml: "<c/>" }));
    expect(e.map((x) => x.name)).toEqual([`canceladas/${ACCESS_KEY}-cancelamento.xml`]);
  });

  it("assinada tem precedência sobre gerada — é a que foi enviada à SEFAZ", () => {
    const e = xmlEntriesForNote(
      note({ status: "rejected", authorized_xml: null, signed_xml: "<assinada/>", generated_xml: "<gerada/>" }),
    );
    expect(e).toHaveLength(1);
    expect(e[0]!.xml).toBe("<assinada/>");
  });
});
