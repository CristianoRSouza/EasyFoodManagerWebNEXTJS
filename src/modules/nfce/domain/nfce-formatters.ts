import { format } from "date-fns";
import { fromYmdLocal } from "@/shared/date-period/date-period-presets";
import { formatBrl } from "@/shared/format/money";
import { NFCE_STATUS_ALIASES } from "./nfce-note";

/**
 * Formatadores de exibição fiscal da NFC-e — porta de `LEGACY/src/lib/nfce-formatters.ts`.
 *
 * O valor em reais é o mesmo `Intl.NumberFormat("pt-BR")` completo de `formatBrl`
 * (`@/shared/format/money.ts`) — `formatCurrency` só acrescenta o parse tolerante a
 * `string|number|null|undefined` (o legado sempre chamava isto com o campo cru vindo da API,
 * nunca com um `number` já validado). A data é a única formatação realmente distinta daqui:
 * `YYYY-MM-DD` é lida à meia-noite LOCAL (não UTC) — já foi bug real deste módulo, e
 * `@/shared/format/date-time.ts` não faz esse ajuste (não precisa: recebe timestamp ISO completo).
 *
 * As classes Tailwind de cor (status/forma de pagamento) NÃO ficam aqui — domínio não deveria
 * conhecer apresentação. Ver `ui/nfce-badge-colors.ts` (Menor 5 da revisão da Fase 3).
 */

/** `YYYY-MM-DD` usa meia-noite local; demais strings seguem o parser nativo. */
function parseDateInput(d: string): Date {
  return fromYmdLocal(d) ?? new Date(d);
}

export const formatCurrency = (v: string | number | null | undefined): string => {
  if (v == null) return "R$ 0,00";
  const n = Number(v);
  if (!Number.isFinite(n)) return "R$ 0,00";
  return formatBrl(n);
};

export const formatDate = (d: string | null | undefined): string => {
  if (!d) return "—";
  try {
    return format(parseDateInput(d), "dd/MM/yyyy HH:mm");
  } catch {
    return String(d);
  }
};

export const formatDateShort = (d: string | null | undefined): string => {
  if (!d) return "—";
  try {
    return format(parseDateInput(d), "dd/MM/yyyy");
  } catch {
    return String(d);
  }
};

export const formatAccessKey = (key: string | null): string => {
  if (!key) return "—";
  const digits = key.replace(/\D/g, "");
  if (!digits) return "—";
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

/**
 * Menor 6 da revisão da Fase 3: `formatCnpj`/`crtLabel`/`ambienteLabel` têm equivalentes em
 * `src/shared/ui/issuer-sections/helpers.ts` (`formatCnpj`/`taxRegimeLabel`/`envLabel`) — os
 * textos divergem de propósito ("Excesso de sublimite" aqui × "Excesso Receita" lá, copiando dois
 * legados diferentes) e as assinaturas também (`string | null` aqui vs. `string` não-nulo lá).
 * Aceitável pela paridade visual; não unifique sem confirmar com o usuário.
 */
export const formatCnpj = (v: string | null): string => {
  if (!v) return "—";
  const digits = v.replace(/\D/g, "");
  if (digits.length !== 14) return v;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
};

export const formatCpf = (v: string | null): string => {
  if (!v) return "—";
  const digits = v.replace(/\D/g, "");
  if (digits.length !== 11) return v;
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
};

export const crtLabel = (c: number | null): string => {
  if (c == null) return "—";
  return (
    {
      1: "Simples Nacional",
      2: "Simples Nacional – Excesso de sublimite",
      3: "Regime Normal",
      4: "MEI",
    }[c] ?? String(c)
  );
};

export const ambienteLabel = (e: number | null): string => {
  if (e == null) return "—";
  if (e === 1) return "Produção";
  if (e === 2) return "Homologação";
  return String(e);
};

export const paymentMethodLabel = (code: string): string => {
  const map: Record<string, string> = {
    "01": "Dinheiro",
    "02": "Cheque",
    "03": "Crédito",
    "04": "Débito",
    "05": "Crédito Loja",
    "10": "Vale Alim.",
    "11": "Vale Ref.",
    "12": "Vale Presente",
    "13": "Vale Comb.",
    "15": "Boleto",
    "16": "Depósito",
    "17": "PIX",
    "18": "TED/DOC",
    "19": "Fidelidade",
    "90": "Sem Pgto",
    "99": "Outros",
  };
  return map[code] ?? code;
};

export const normalizeNfceStatus = (status: string | null | undefined): string => {
  const normalized = String(status ?? "").trim().toLowerCase();
  return NFCE_STATUS_ALIASES[normalized] ?? normalized;
};

export const statusLabel = (s: string): string => {
  const normalized = normalizeNfceStatus(s);
  return (
    {
      authorized: "Autorizada",
      rejected: "Rejeitada",
      denied: "Denegada",
      cancelled: "Cancelada",
      draft: "Rascunho",
      sending: "Enviando",
      unusable: "Contingência pendente",
      inutilized: "Inutilizada",
      manual_review: "Pendente de correção",
    }[normalized] ?? s
  );
};

/** Indentação legível para exibição na UI; se o XML for inválido, devolve o texto original. */
export const prettifyXml = (xml: string): string => {
  const trimmed = xml.trim();
  if (!trimmed) return "";

  const declMatch = trimmed.match(/^<\?xml[\s\S]*?\?>\s*/);
  const declaration = declMatch ? `${declMatch[0].trim()}\n` : "";
  const body = declMatch ? trimmed.slice(declMatch[0].length).trim() : trimmed;

  try {
    const doc = new DOMParser().parseFromString(body, "application/xml");
    if (doc.querySelector("parsererror")) return trimmed;

    const escText = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const formatNode = (node: Node, depth: number): string => {
      const pad = "  ".repeat(depth);
      if (node.nodeType === Node.COMMENT_NODE) {
        return `${pad}<!--${(node as Comment).data}-->\n`;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent ?? "";
        if (!t.trim()) return "";
        return `${pad}${escText(t.trim())}\n`;
      }
      if (node.nodeType === Node.CDATA_SECTION_NODE) {
        return `${pad}<![CDATA[${(node as CDATASection).data}]]>\n`;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const el = node as Element;
      const name = el.tagName;
      let attrStr = "";
      for (let i = 0; i < el.attributes.length; i++) {
        const a = el.attributes[i]!;
        const val = a.value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
        attrStr += ` ${a.name}="${val}"`;
      }
      const kids = [...el.childNodes];
      const meaningful = kids.filter(
        (k) =>
          k.nodeType === Node.ELEMENT_NODE ||
          k.nodeType === Node.CDATA_SECTION_NODE ||
          k.nodeType === Node.COMMENT_NODE ||
          (k.nodeType === Node.TEXT_NODE && (k.textContent?.trim() ?? "").length > 0),
      );
      if (meaningful.length === 0) return `${pad}<${name}${attrStr}/>\n`;
      if (meaningful.length === 1 && meaningful[0]!.nodeType === Node.TEXT_NODE) {
        const inner = escText((meaningful[0]!.textContent ?? "").trim());
        return `${pad}<${name}${attrStr}>${inner}</${name}>\n`;
      }
      if (meaningful.length === 1 && meaningful[0]!.nodeType === Node.CDATA_SECTION_NODE) {
        const cd = meaningful[0] as CDATASection;
        return `${pad}<${name}${attrStr}><![CDATA[${cd.data}]]></${name}>\n`;
      }
      let out = `${pad}<${name}${attrStr}>\n`;
      for (const k of el.childNodes) {
        out += formatNode(k, depth + 1);
      }
      out += `${pad}</${name}>\n`;
      return out;
    };

    let result = "";
    for (const child of doc.childNodes) {
      result += formatNode(child, 0);
    }
    return (declaration + result.trimEnd()).trimEnd();
  } catch {
    return trimmed;
  }
};

/**
 * Detalhes de log NFC-e para exibição — legado 1.3.12 (`formatLogDetails`, PR #29). Na nuvem o
 * `details` (jsonb) chega serializado numa linha só; aqui volta a ser indentado. Texto que não é
 * JSON sai como veio.
 */
export const formatLogDetails = (details: unknown): string => {
  if (typeof details !== "string") return JSON.stringify(details, null, 2);
  try {
    const parsed: unknown = JSON.parse(details);
    return parsed !== null && typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : details;
  } catch {
    return details;
  }
};
