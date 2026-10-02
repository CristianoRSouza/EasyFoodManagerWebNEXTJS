import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatAccessKey,
  formatCnpj,
  formatCpf,
  crtLabel,
  ambienteLabel,
  paymentMethodLabel,
  normalizeNfceStatus,
  statusLabel,
  prettifyXml,
  formatLogDetails,
} from "./nfce-formatters";

describe("nfce-formatters", () => {
  describe("formatCurrency", () => {
    it("devolve R$ 0,00 para null, undefined e valores inválidos", () => {
      expect(formatCurrency(null)).toBe("R$ 0,00");
      expect(formatCurrency(undefined)).toBe("R$ 0,00");
      expect(formatCurrency("abc")).toBe("R$ 0,00");
      expect(formatCurrency(NaN)).toBe("R$ 0,00");
    });

    it("formata números e strings numéricas em pt-BR", () => {
      expect(formatCurrency(10).replace(/ /g, " ")).toBe("R$ 10,00");
      expect(formatCurrency("1234.56").replace(/ /g, " ")).toBe("R$ 1.234,56");
    });
  });

  describe("formatDate / formatDateShort", () => {
    it("devolve em-dash para valores vazios", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDateShort("")).toBe("—");
    });

    it("formata ISO válido", () => {
      expect(formatDateShort("2026-05-06T15:30:00.000Z")).toMatch(/06\/05\/2026/);
      expect(formatDate("2026-05-06T15:30:00.000Z")).toMatch(/06\/05\/2026/);
    });

    it("YYYY-MM-DD usa meia-noite local (sem deslocamento de fuso)", () => {
      expect(formatDateShort("2026-05-06")).toBe("06/05/2026");
      expect(formatDate("2026-05-06")).toBe("06/05/2026 00:00");
    });
  });

  describe("formatAccessKey", () => {
    it("agrupa dígitos de 4 em 4 e ignora caracteres não numéricos", () => {
      const key = "35260612345678901234567890123456789012345678";
      expect(formatAccessKey(key)).toBe("3526 0612 3456 7890 1234 5678 9012 3456 7890 1234 5678");
      expect(formatAccessKey("3526-0612-3456")).toBe("3526 0612 3456");
    });

    it("devolve em-dash para null ou sem dígitos", () => {
      expect(formatAccessKey(null)).toBe("—");
      expect(formatAccessKey("---")).toBe("—");
    });
  });

  describe("formatCnpj / formatCpf", () => {
    it("formata apenas dígitos com tamanho correto", () => {
      expect(formatCnpj("12345678000199")).toBe("12.345.678/0001-99");
      expect(formatCnpj("12.345.678/0001-99")).toBe("12.345.678/0001-99");
      expect(formatCpf("12345678901")).toBe("123.456.789-01");
    });

    it("devolve valor original quando quantidade de dígitos é inválida", () => {
      expect(formatCnpj("123")).toBe("123");
      expect(formatCpf(null)).toBe("—");
    });
  });

  describe("crtLabel", () => {
    it("mapeia códigos conhecidos e fallback", () => {
      expect(crtLabel(1)).toBe("Simples Nacional");
      expect(crtLabel(4)).toBe("MEI");
      expect(crtLabel(99)).toBe("99");
      expect(crtLabel(null)).toBe("—");
    });
  });

  describe("ambienteLabel", () => {
    it("diferencia produção (1) e homologação (2)", () => {
      expect(ambienteLabel(1)).toBe("Produção");
      expect(ambienteLabel(2)).toBe("Homologação");
    });

    it("não assume homologação para códigos desconhecidos", () => {
      expect(ambienteLabel(0)).toBe("0");
      expect(ambienteLabel(null)).toBe("—");
    });
  });

  describe("paymentMethodLabel", () => {
    it("resolve PIX e fallback", () => {
      expect(paymentMethodLabel("17")).toBe("PIX");
      expect(paymentMethodLabel("XX")).toBe("XX");
    });
  });

  describe("normalizeNfceStatus / statusLabel", () => {
    it("normaliza alias português inutilizada", () => {
      expect(normalizeNfceStatus("Inutilizada")).toBe("inutilized");
      expect(statusLabel("inutilizada")).toBe("Inutilizada");
    });

    it("statusLabel devolve original para desconhecido", () => {
      expect(statusLabel("custom_status")).toBe("custom_status");
    });

    it("statusLabel cobre todos os status conhecidos", () => {
      expect(statusLabel("authorized")).toBe("Autorizada");
      expect(statusLabel("rejected")).toBe("Rejeitada");
      expect(statusLabel("denied")).toBe("Denegada");
      expect(statusLabel("cancelled")).toBe("Cancelada");
      expect(statusLabel("draft")).toBe("Rascunho");
      expect(statusLabel("sending")).toBe("Enviando");
      expect(statusLabel("unusable")).toBe("Contingência pendente");
      expect(statusLabel("manual_review")).toBe("Pendente de correção");
    });
  });

  describe("prettifyXml", () => {
    it("devolve string vazia para entrada vazia", () => {
      expect(prettifyXml("   ")).toBe("");
    });

    it("indenta XML válido", () => {
      const raw = "<root><child>texto</child></root>";
      const pretty = prettifyXml(raw);
      expect(pretty).toContain("<root>");
      expect(pretty).toContain("  <child>texto</child>");
    });

    it("preserva declaração XML", () => {
      const raw = '<?xml version="1.0"?><nfe><id>1</id></nfe>';
      const pretty = prettifyXml(raw);
      expect(pretty.startsWith("<?xml")).toBe(true);
    });

    it("devolve original quando parser falha", () => {
      const invalid = "<root><unclosed>";
      expect(prettifyXml(invalid)).toBe(invalid);
    });

    it("formata atributos, comentários e CDATA", () => {
      const raw = '<!-- nota --><root id="1"><item><![CDATA[x<y>]]></item></root>';
      const pretty = prettifyXml(raw);
      expect(pretty).toContain("<!-- nota -->");
      expect(pretty).toContain('id="1"');
      expect(pretty).toContain("<![CDATA[x<y>]]>");
    });
  });

  // Legado 1.3.12 (PR #29): nos modos de nuvem o details (jsonb) chega serializado numa linha só.
  describe("formatLogDetails", () => {
    it("indenta JSON serializado numa linha (modos de nuvem)", () => {
      expect(formatLogDetails('{"cStat":"100","xMotivo":"Autorizado"}')).toBe('{\n  "cStat": "100",\n  "xMotivo": "Autorizado"\n}');
    });

    it("indenta objeto (modo local)", () => {
      expect(formatLogDetails({ cStat: "100" })).toBe('{\n  "cStat": "100"\n}');
    });

    it("mantém texto que não é JSON", () => {
      expect(formatLogDetails("Falha ao conectar na SEFAZ")).toBe("Falha ao conectar na SEFAZ");
      expect(formatLogDetails("{quebrado")).toBe("{quebrado");
    });

    it("não transforma texto numérico/escalar em outra coisa", () => {
      expect(formatLogDetails("123")).toBe("123");
      expect(formatLogDetails('"abc"')).toBe('"abc"');
    });
  });
});
