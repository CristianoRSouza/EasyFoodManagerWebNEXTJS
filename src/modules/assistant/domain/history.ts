import type { ChatHistoryEntry } from "./chat";

/** Funções puras do painel de histórico — cópia de `LEGACY/src/components/ai-chat/AIChatPanel.tsx`. */

const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  "/": ["Como leio o Dashboard?", "Onde vejo o faturamento de hoje?", "O que é a Reforma Tributária aqui?"],
  "/sync": ["Como sei se a sincronização está OK?", "O que significa cada status?", "Como reprocesso um evento?"],
  "/products": ["Como vejo detalhes fiscais de um produto?", "O que é IBS/CBS?", "Onde edito a unidade?"],
  "/orders": ["Como filtro comandas por totem?", "O que significa cancelado em vermelho?", "Onde vejo o ID Firebird?"],
  "/transactions": ["Como filtro por bandeira?", "Onde vejo o total de PIX?", "Como exporto transações?"],
  "/nfce": ["Como consulto uma NFC-e?", "O que significa Inutilizada?", "Onde vejo o XML?"],
  "/nfce-issuer": ["Como configuro o emitente?", "Onde edito CSC e CSC ID?", "O que é multitenant?"],
  "/totems": ["Como ativo/desativo um totem?", "Onde configuro o TEF Aditum?", "O que é heartbeat?"],
  "/agents": ["Como instalo o agente de serviço?", "Como gero uma nova API key?", "Onde vejo os logs?"],
};
const DEFAULT_SUGGESTIONS = ["Como começo a usar o sistema?", "Onde acompanho meus pedidos?", "Como configuro a NFC-e?"];

export function suggestionsFor(pathname: string): string[] {
  return CONTEXT_SUGGESTIONS[pathname] ?? DEFAULT_SUGGESTIONS;
}

export function formatDateLabel(date: string, now: Date = new Date()): string {
  const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dt.getTime() === yesterday.getTime()) return "Ontem";
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

const APP_LABELS: Record<string, string> = {
  easycommandpay: "EasyFoodManager",
  easyml: "EasyML",
};

export function appLabel(app?: string | null): string {
  if (!app) return "Outro";
  return APP_LABELS[app] ?? app;
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export interface SearchTerm {
  raw: string;
  regex: RegExp;
}

/** `"frase exata"`, palavra, ou prefixo com `*` — sem acento e sem caixa. */
export function parseSearch(query: string): SearchTerm[] {
  const terms: SearchTerm[] = [];
  const re = /"([^"]+)"|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(query)) !== null) {
    const raw = (m[1] ?? m[2] ?? "").trim();
    if (!raw) continue;
    const escaped = fold(raw).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    terms.push({ raw, regex: new RegExp(escaped) });
  }
  return terms;
}

export function matchesAll(text: string, terms: SearchTerm[]): boolean {
  if (terms.length === 0) return true;
  const folded = fold(text);
  return terms.every((t) => t.regex.test(folded));
}

export function findFirstMatch(text: string, terms: SearchTerm[]): { start: number; end: number } | null {
  if (terms.length === 0) return null;
  const folded = fold(text);
  let best: { start: number; end: number } | null = null;
  for (const t of terms) {
    const m = t.regex.exec(folded);
    if (!m) return null;
    if (!best || m.index < best.start) best = { start: m.index, end: m.index + m[0].length };
  }
  return best;
}

export function groupHistoryByDate(entries: ChatHistoryEntry[]): [string, ChatHistoryEntry[]][] {
  const groups: Record<string, ChatHistoryEntry[]> = {};
  for (const entry of entries) (groups[entry.date] ??= []).push(entry);
  return Object.entries(groups).sort(([a], [b]) => (a < b ? 1 : -1));
}
