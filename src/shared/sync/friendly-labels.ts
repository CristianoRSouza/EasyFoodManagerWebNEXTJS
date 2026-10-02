/**
 * Shared friendly label maps and description formatter for consistent UI text.
 *
 * Cópia fiel de `LEGACY/src/lib/friendly-labels.ts`.
 */

export const FUNCTION_LABELS: Record<string, string> = {
  "ai-chat": "Assistente IA",
  "ml-ai-suggest-attr": "Sugestão de Atributos",
  "ml-ai-suggest-answer": "Sugestão de Resposta",
  "ml-product-image": "Imagem do Produto",
  "ml-product-image-search": "Busca de Imagem",
  "ml-category-predict": "Predição de Categoria",
  "ml-validate-listing": "Validação de Anúncio",
  "ml-fiscal-document": "Documento Fiscal",
  "ml-kit-image": "Imagem do Kit",
};

export const ACTION_LABELS: Record<string, string> = {
  suggest: "Sugestão IA",
  optimize_ad: "Otimizar Anúncio",
  fill_attributes: "Preencher Atributos",
  predict: "Predição",
  generate: "Gerar Imagem",
  remove_bg: "Remover Fundo",
  search: "Busca de Imagem",
  support: "Falar com o suporte",
  operation: "Operação",
};

/** Billing / license action labels */
export const BILLING_ACTION_LABELS: Record<string, string> = {
  ativated: "Ativação",
  upgraded: "Upgrade",
  downgraded: "Downgrade",
  renewed: "Renovação",
  canceled: "Cancelamento",
  reativated: "Reativação",
  trial_started: "Início Trial",
  trial_ended: "Fim Trial",
  payment: "Pagamento",
  refund: "Reembolso",
};

/** Maps raw module/action slugs to friendly PT labels in descriptions */
export function friendlyDescription(raw: string | null): string {
  if (!raw) return "—";
  // Remove "(Stripe cs_test_...)" or "(Stripe cs_live_...)" suffixes
  let cleaned = raw.replace(/\s*\(Stripe\s+cs_(?:test|live)_[A-Za-z0-9]+\)/g, "");
  // Remove generic "(Stripe ...)" with long IDs
  cleaned = cleaned.replace(/\s*\(Stripe\s+[A-Za-z0-9_]{20,}\)/g, "");
  // Replace raw "module/action" patterns with friendly labels
  cleaned = cleaned.replace(/([a-z0-9-]+)\/([a-z0-9_]+)/g, (_match, mod: string, act: string) => {
    const modLabel = FUNCTION_LABELS[mod] || mod;
    const actLabel = ACTION_LABELS[act] || act.replace(/_/g, " ");
    return `${modLabel} — ${actLabel}`;
  });
  cleaned = cleaned.trim();
  return cleaned || "—";
}

/** Resolves a function_name to a friendly label, with raw fallback */
export function friendlyFunction(raw: string | null): string {
  if (!raw) return "—";
  return FUNCTION_LABELS[raw] || raw;
}

/** Resolves an action slug to a friendly label, with raw fallback */
export function friendlyAction(raw: string | null): string {
  if (!raw) return "—";
  return ACTION_LABELS[raw] || raw.replace(/_/g, " ");
}

/** Resolves a billing action to a friendly label */
export function friendlyBillingAction(raw: string | null): string {
  if (!raw) return "—";
  return BILLING_ACTION_LABELS[raw] || raw.replace(/_/g, " ");
}
