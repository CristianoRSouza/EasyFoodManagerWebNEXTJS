import { describe, expect, it } from "vitest";
import type { NfceDocuments } from "../../domain/nfce-detail";
import type { NfceItem } from "../../domain/nfce-item";
import {
  buildXmlOptions,
  formatCnpjMask,
  formatCpfMask,
  hasCsosn500Data,
  hasXml,
} from "./nfce-detail-labels";

const EMPTY_DOCUMENTS: NfceDocuments = {
  authorizedXml: null,
  cancellationXml: null,
  signedXml: null,
  generatedXml: null,
  qrCode: null,
  cancellationProtocol: null,
  cancelledAt: null,
};

function itemWithCsosn500(overrides: Partial<NonNullable<NfceItem["icms"]["csosn500"]>> | null): NfceItem {
  return {
    sequence: 1,
    productCode: "1",
    ean: null,
    description: "x",
    ncm: "12345678",
    cest: null,
    cfop: "5102",
    unit: "UN",
    quantity: 1,
    unitPrice: 1,
    grossValue: 1,
    discount: null,
    freight: null,
    insurance: null,
    otherExpenses: null,
    additionalInfo: null,
    icms: {
      origin: 0,
      cstOrCsosn: "500",
      base: null,
      rate: null,
      value: null,
      stValue: null,
      fcpValue: null,
      snCreditRate: null,
      snCreditValue: null,
      csosn500: overrides ? { stRate: null, stRetainedBase: null, substituteIcms: null, stRetainedIcms: null, ...overrides } : null,
    },
    pis: { cst: null, base: null, rate: null, value: null, quantityBase: null, rateInReais: null },
    cofins: { cst: null, base: null, rate: null, value: null, quantityBase: null, rateInReais: null },
    totalTaxes: null,
    scaleIndicator: null,
    reformItemTotal: null,
  };
}

describe("hasXml", () => {
  it("é falso quando o XML pedido não veio inline", () => {
    expect(hasXml(EMPTY_DOCUMENTS, "authorized")).toBe(false);
  });

  it("é verdadeiro quando o XML pedido veio inline e não é vazio", () => {
    expect(hasXml({ ...EMPTY_DOCUMENTS, authorizedXml: "<a/>" }, "authorized")).toBe(true);
  });

  it("trata string em branco como ausente", () => {
    expect(hasXml({ ...EMPTY_DOCUMENTS, signedXml: "   " }, "signed")).toBe(false);
  });

  // Nuvem (homologação, 2026-10-01): o detalhe da EasyFoodAPI não traz o XML, só `tem_xml_*`.
  it("a flag da API decide quando vem (nuvem): verdadeira sem o XML inline", () => {
    expect(hasXml({ ...EMPTY_DOCUMENTS, xmlAvailability: { authorized: true } }, "authorized")).toBe(true);
  });

  it("a flag falsa vence o XML inline, como no legado (`temXml`)", () => {
    expect(hasXml({ ...EMPTY_DOCUMENTS, authorizedXml: "<a/>", xmlAvailability: { authorized: false } }, "authorized")).toBe(false);
  });

  it("sem flag para o tipo pedido, cai no XML inline", () => {
    expect(hasXml({ ...EMPTY_DOCUMENTS, signedXml: "<s/>", xmlAvailability: { authorized: true } }, "signed")).toBe(true);
  });
});

describe("buildXmlOptions", () => {
  it("autorizada só mostra o XML autorizado", () => {
    const options = buildXmlOptions("authorized", EMPTY_DOCUMENTS, 100);
    expect(options).toEqual([{ key: "authorized", label: "XML Autorizado", kind: "authorized", file: "nfce-100-authorized.xml" }]);
  });

  it("cancelada mostra autorizado e cancelamento", () => {
    const options = buildXmlOptions("cancelled", EMPTY_DOCUMENTS, 100);
    expect(options.map((o) => o.key)).toEqual(["authorized", "cancellation"]);
  });

  it("status técnico com XML assinado prefere o assinado", () => {
    const options = buildXmlOptions("rejected", { ...EMPTY_DOCUMENTS, signedXml: "<a/>" }, 100);
    expect(options).toEqual([{ key: "technical-signed", label: "XML Técnico (Assinado)", kind: "signed", file: "nfce-100-signed.xml" }]);
  });

  it("status técnico sem XML assinado cai para o gerado", () => {
    const options = buildXmlOptions("draft", EMPTY_DOCUMENTS, 100);
    expect(options).toEqual([{ key: "technical-generated", label: "XML Técnico (Gerado)", kind: "generated", file: "nfce-100-generated.xml" }]);
  });

  it("qualquer outro status cai no primeiro XML disponível, ou autorizado por padrão", () => {
    const options = buildXmlOptions("manual_review", { ...EMPTY_DOCUMENTS, generatedXml: "<a/>" }, 100);
    expect(options).toEqual([{ key: "default", label: "XML", kind: "generated", file: "nfce-100.xml" }]);

    const fallback = buildXmlOptions("manual_review", EMPTY_DOCUMENTS, 100);
    expect(fallback[0]?.kind).toBe("authorized");
  });
});

describe("hasCsosn500Data", () => {
  it("é falso sem bloco csosn500", () => {
    expect(hasCsosn500Data(itemWithCsosn500(null))).toBe(false);
  });

  it("é falso quando o bloco existe mas todos os valores são zero", () => {
    expect(hasCsosn500Data(itemWithCsosn500({}))).toBe(false);
  });

  it("é verdadeiro quando algum valor do bloco é positivo", () => {
    expect(hasCsosn500Data(itemWithCsosn500({ stRetainedIcms: 12.5 }))).toBe(true);
  });
});

describe("máscaras de documento", () => {
  it("formatCpfMask aplica pontuação progressivamente", () => {
    expect(formatCpfMask("12345678901")).toBe("123.456.789-01");
  });

  it("formatCnpjMask aplica pontuação progressivamente", () => {
    expect(formatCnpjMask("12345678000199")).toBe("12.345.678/0001-99");
  });
});
