import { formatCurrency } from "./nfce-formatters";
import { NFCE_EDITABLE_STATUS, type NfceStatus } from "./nfce-note";

/**
 * Correção manual de uma NFC-e em `manual_review` — fonte única de verdade que funde DOIS
 * validadores do legado, na mesma ordem em que o legado os executa:
 *
 * 1. `validateManualCorrectionBeforeSave` (`LEGACY/src/pages/NfceDetailPage.tsx`) — validação
 *    por campo, rodada NA TELA antes de qualquer chamada de rede. Suas mensagens (NCM/CFOP/CST
 *    por item, forma/valor/troco por pagamento) são as que o operador vê primeiro — são as
 *    usadas abaixo para cada checagem de campo.
 * 2. `saveNfceManualCorrection` (`LEGACY/src/lib/data-service.ts`) — o gate que a API refaz
 *    dentro da transação que grava a correção (`nfce-mutation-logic.ts`); é a autoridade. O
 *    inline do item 1 não tem como violar a invariante 1a (não edita quantidade/preço), então
 *    só o gate a checa — mantida aqui como rede de segurança contra um bug futuro que altere
 *    isso. A invariante 1b (pagamentos − troco ≥ total) é checada nos dois lugares do legado,
 *    com textos diferentes; aqui vale o texto do inline (nº 1), por ser o que roda primeiro.
 *
 * O painel corrige só a CLASSIFICAÇÃO FISCAL (NCM/CFOP/CST-CSOSN dos itens, dados do
 * destinatário e a forma/valor dos pagamentos) — nunca a quantidade ou o preço de um item. É por
 * isso que a invariante crítica do módulo (CLAUDE.md: "correção manual não pode alterar o valor
 * total") é garantida ESTRUTURALMENTE, não por uma conferência em tempo de execução:
 * `NfceManualCorrectionItem` (abaixo) não tem `quantity`/`unitPrice`/`grossValue` — nenhum campo
 * que entre no cálculo do total do item. Não existe um "total dos itens depois da edição" para
 * comparar, porque a edição não tem como produzir um total diferente: o tipo do payload é a prova.
 * (Menor 1 da revisão da Fase 3: a versão anterior comparava `originalItemsTotal` com
 * `updatedItemsTotal`, mas as duas vinham da MESMA variável no chamador — uma checagem que nunca
 * podia falhar. Removida em favor deste comentário + do tipo, que são a garantia real.)
 */

export interface NfceManualCorrectionRecipient {
  cpf: string;
  cnpj: string;
  name: string;
  email: string;
}

export interface NfceManualCorrectionItem {
  item: number;
  ncm: string;
  cfop: string;
  cest: string;
  icmsCstCsosn: string;
}

export interface NfceManualCorrectionPayment {
  seq: number;
  paymentMethod: string;
  /** Valor do pagamento (vPag), decimal como texto — ex. `"10.50"` ou `"10,50"`. */
  paymentValue: string;
  /** Troco (vTroco); em geral só se aplica a dinheiro (`01`). */
  changeValue?: string;
}

export interface NfceManualCorrectionPayload {
  recipient: NfceManualCorrectionRecipient;
  infoComplementar: string;
  items: NfceManualCorrectionItem[];
  payments: NfceManualCorrectionPayment[];
  /** UF do destinatário informada no formulário; se ausente, usa a UF já cadastrada na nota. */
  recipientUf?: string;
}

/** Resultado de uma mutação de NFC-e — mesma forma que a API devolve (sempre HTTP 200). */
export type NfceMutationResult = { ok: true; message?: string } | { ok: false; error?: string };

export interface NfceManualCorrectionContext {
  status: NfceStatus;
  /** CRT do emitente — define se o item deve levar CSOSN (Simples) ou CST (Regime Normal). */
  taxRegimeCode: number | null;
  issuerUf: string | null;
  /** UF do destinatário já cadastrada na nota; usada quando o payload não informa `recipientUf`. */
  recipientUf: string | null;
  /** `total_value` atual da nota — os pagamentos (menos troco) não podem somar menos que isso. */
  noteTotal: number;
}

const ALLOWED_CSOSN = new Set(["101", "102", "103", "201", "202", "203", "300", "400", "500", "900"]);
const ALLOWED_CST = new Set(["00", "10", "20", "30", "40", "41", "50", "51", "60", "70", "90"]);
const EPSILON = 0.0001;

function parseMoneyInput(raw: string): number {
  const t = String(raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/**
 * Valida uma correção manual ANTES de enviá-la à API. Devolve o primeiro problema encontrado,
 * na mesma ordem do legado: estado da nota, item por item (mensagens de
 * `validateManualCorrectionBeforeSave`, a validação de tela), pagamento por pagamento (idem), e
 * por último a invariante 1b (pagamentos − troco ≥ total, mensagem do inline de tela). A
 * invariante 1a (total dos itens não pode mudar) não precisa de checagem aqui — é garantida pelo
 * tipo do payload, ver comentário no topo do arquivo.
 *
 * Chamada em DOIS lugares por design, não um só: `use-nfce-correction-form.ts` chama para dar
 * feedback imediato de tela (destaca o campo, mostra o erro sem gastar uma ida à rede); a
 * implementação de `NfceRepository#saveManualCorrection`/`saveAndReprocessManualCorrection`
 * chama de novo antes de montar o `POST` — a rede de segurança que vale mesmo se um chamador
 * futuro pular a validação da tela (Menor 1 da revisão da Fase 3).
 */
export function validateNfceManualCorrection(
  context: NfceManualCorrectionContext,
  payload: NfceManualCorrectionPayload,
): { ok: true } | { ok: false; error: string } {
  if (context.status !== NFCE_EDITABLE_STATUS) {
    return fail("A edição é permitida somente para NFC-e pendente de correção.");
  }

  const crt = context.taxRegimeCode ?? 0;
  const emitUf = (context.issuerUf ?? "").toUpperCase();
  const effectiveDestUf = (payload.recipientUf || context.recipientUf || "").toUpperCase();
  const expectedCfopPrefix = emitUf && effectiveDestUf ? (emitUf === effectiveDestUf ? "5" : "6") : null;

  for (const item of payload.items ?? []) {
    const itemNumber = item.item;
    const ncm = String(item.ncm || "").replace(/\D/g, "");
    const cfop = String(item.cfop || "").replace(/\D/g, "");
    const icms = String(item.icmsCstCsosn || "").replace(/\D/g, "");

    if (ncm.length !== 8) {
      return fail(`Item ${itemNumber}: NCM deve ter 8 dígitos.`);
    }
    if (cfop.length !== 4) {
      return fail(`Item ${itemNumber}: CFOP deve ter 4 dígitos.`);
    }
    if (!["5", "6"].includes(cfop.charAt(0))) {
      return fail(`Item ${itemNumber}: CFOP deve iniciar com 5 ou 6 para NFC-e de saída.`);
    }
    if (expectedCfopPrefix && cfop.charAt(0) !== expectedCfopPrefix) {
      const expectedLabel =
        expectedCfopPrefix === "5" ? "5xxx (operação interna)" : "6xxx (operação interestadual)";
      return fail(`Item ${itemNumber}: CFOP inválido para ${emitUf}->${effectiveDestUf}. Esperado: ${expectedLabel}.`);
    }
    if ((crt === 1 || crt === 2) && !ALLOWED_CSOSN.has(icms)) {
      return fail(
        `Item ${itemNumber}: CSOSN inválido para CRT ${crt}. Use 101, 102, 103, 201, 202, 203, 300, 400, 500 ou 900.`,
      );
    }
    if (crt === 3 && !ALLOWED_CST.has(icms)) {
      return fail(`Item ${itemNumber}: CST inválido para CRT 3. Use 00, 10, 20, 30, 40, 41, 50, 51, 60, 70 ou 90.`);
    }
  }

  let sumPay = 0;
  let sumChange = 0;
  for (const payment of payload.payments ?? []) {
    const seq = payment.seq;
    const method = String(payment.paymentMethod || "").replace(/\D/g, "");
    const value = round2(parseMoneyInput(payment.paymentValue));
    const change = round2(parseMoneyInput(payment.changeValue ?? "0"));

    if (!seq || method.length !== 2) {
      return fail(`Pagamento ${seq}: forma de pagamento inválida.`);
    }
    if (!Number.isFinite(value) || value < 0) {
      return fail(`Pagamento ${seq}: valor inválido.`);
    }
    if (!Number.isFinite(change) || change < 0) {
      return fail(`Pagamento ${seq}: troco inválido.`);
    }
    if (change > value + EPSILON) {
      return fail(`Pagamento ${seq}: troco não pode ser maior que o valor.`);
    }
    if (method !== "01" && change > EPSILON) {
      return fail(`Pagamento ${seq}: troco só se aplica a dinheiro (01).`);
    }
    sumPay += value;
    sumChange += change;
  }

  // Invariante 1b — pagamentos menos troco não podem somar menos que o total da nota. Mensagem
  // do inline de tela (`validateManualCorrectionBeforeSave`), com o total formatado, por ser o
  // que roda primeiro no legado.
  if (sumPay - sumChange + EPSILON < context.noteTotal) {
    return fail(`Pagamentos: soma menos troco não pode ser menor que o total da nota (${formatCurrency(context.noteTotal)}).`);
  }

  return { ok: true };
}
