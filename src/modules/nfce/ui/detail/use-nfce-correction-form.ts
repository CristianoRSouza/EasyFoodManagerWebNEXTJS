"use client";

import { useState } from "react";
import { useToast } from "@/shared/ui/use-toast";
import { validateNfceManualCorrection, type NfceManualCorrectionContext } from "../../domain/nfce-correction";
import type { NfceItem } from "../../domain/nfce-item";
import type { NfcePayment } from "../../domain/nfce-payment";
import type { NfceRepository } from "../../application/nfce-repository";
import type { NfceDetailBundle } from "./use-nfce-detail-query";

export interface EditableCorrectionItem {
  item: number;
  ncm: string;
  cfop: string;
  cest: string;
  icmsCstCsosn: string;
}

export interface EditableCorrectionPayment {
  seq: number;
  paymentMethod: string;
  paymentValue: string;
  changeValue: string;
}

function toEditableItems(items: NfceItem[]): EditableCorrectionItem[] {
  return items.map((row) => ({
    item: row.sequence,
    ncm: row.ncm ?? "",
    cfop: row.cfop ?? "",
    cest: row.cest ?? "",
    icmsCstCsosn: row.icms.cstOrCsosn ?? "",
  }));
}

/**
 * Igual ao legado (`NfceDetailPage.tsx#loadNote`): o campo edita o TEXTO cru da API
 * (`String(row.valor ?? "").trim() || "0"`; troco idem, só em dinheiro) — "136.60" continua "136.60",
 * na tela e no corpo do POST. Sem o texto cru (fixtures), cai no número.
 */
function toEditablePayments(payments: NfcePayment[]): EditableCorrectionPayment[] {
  return payments.map((row) => ({
    seq: row.sequence,
    paymentMethod: row.method,
    paymentValue: (row.amountText ?? String(row.amount ?? "")).trim() || "0",
    changeValue:
      row.method === "01" ? ((row.changeText !== undefined ? row.changeText : row.change)?.toString() ?? "0").trim() || "0" : "0",
  }));
}

/** Alvo de um erro de validação — a mesma mensagem que vira toast também destaca a linha culpada. */
function parseErrorTarget(error: string, firstPaymentSeq: number | null): { itemNumber?: number; paymentSeq?: number } {
  const itemMatch = error.match(/^Item (\d+):/);
  if (itemMatch?.[1]) return { itemNumber: Number(itemMatch[1]) };
  const paymentMatch = error.match(/^Pagamento (\d+):/);
  if (paymentMatch?.[1]) return { paymentSeq: Number(paymentMatch[1]) };
  if (error.startsWith("Pagamentos:") && firstPaymentSeq != null) return { paymentSeq: firstPaymentSeq };
  return {};
}

/**
 * Rola até a linha com erro e foca o primeiro campo editável dela — mesmo comportamento do
 * legado (`focusFirstInvalidField`, `NfceDetailPage.tsx:328-333`), na granularidade que o Next
 * já rastreia (linha do item/pagamento; o legado vai até o campo exato — ver Menor 11 da revisão
 * da Fase 3). `id` combina com o `id={"manual-correction-item-" + row.item}` /
 * `"manual-correction-payment-" + row.seq` postos em `NfceCorrectionItemsSection`/
 * `NfceCorrectionPaymentsSection`.
 */
function focusInvalidRow(target: { itemNumber?: number; paymentSeq?: number }) {
  if (typeof document === "undefined") return;
  const id =
    target.itemNumber != null
      ? `manual-correction-item-${target.itemNumber}`
      : target.paymentSeq != null
        ? `manual-correction-payment-${target.paymentSeq}`
        : null;
  if (!id) return;
  const row = document.getElementById(id);
  if (!row) return;
  row.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = row.querySelector<HTMLElement>("input, select, textarea, button");
  window.setTimeout(() => focusable?.focus(), 120);
}

/**
 * Estado e regras da aba "Correção" — invariante 1 do CLAUDE.md (correção manual de NFC-e não
 * pode alterar o valor total; só permitida em `manual_review`). Antes de qualquer chamada de
 * rede, `validateNfceManualCorrection` (núcleo do módulo, Onda 0) confere a mesma regra que a
 * `easyfoodmanagerAPI` refaz na transação — aqui só para dar feedback imediato.
 */
export function useNfceCorrectionForm(
  repository: NfceRepository,
  noteId: string,
  bundle: NfceDetailBundle,
  onSaved: () => void,
) {
  const { toast } = useToast();
  const { detail, items, payments } = bundle;

  const [recipientCpf, setRecipientCpf] = useState(() => detail.recipient?.cpf ?? "");
  const [recipientCnpj, setRecipientCnpj] = useState(() => detail.recipient?.cnpj ?? "");
  const [recipientName, setRecipientName] = useState(() => detail.recipient?.name ?? "");
  const [recipientEmail, setRecipientEmail] = useState(() => detail.recipient?.email ?? "");
  const [infoComplementar, setInfoComplementar] = useState(() => detail.additionalInfo ?? "");
  const [editableItems, setEditableItems] = useState<EditableCorrectionItem[]>(() => toEditableItems(items));
  const [editablePayments, setEditablePayments] = useState<EditableCorrectionPayment[]>(() => toEditablePayments(payments));
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [savingAndReprocessing, setSavingAndReprocessing] = useState(false);
  const [errorItemNumbers, setErrorItemNumbers] = useState<Set<number>>(new Set());
  const [errorPaymentSeqs, setErrorPaymentSeqs] = useState<Set<number>>(new Set());

  // A cada carga (inicial ou depois de salvar) os campos editáveis voltam a refletir o que está
  // no servidor — igual ao `loadNote()` do legado, que também reseta o formulário ao recarregar.
  // Ajuste feito durante a renderização (não em efeito): mesmo padrão de `OrdersPage.tsx` para
  // "reagir a uma mudança de props resetando outro estado", sem o round-trip extra de um efeito.
  const [trackedBundle, setTrackedBundle] = useState(bundle);
  if (trackedBundle !== bundle) {
    setTrackedBundle(bundle);
    setRecipientCpf(detail.recipient?.cpf ?? "");
    setRecipientCnpj(detail.recipient?.cnpj ?? "");
    setRecipientName(detail.recipient?.name ?? "");
    setRecipientEmail(detail.recipient?.email ?? "");
    setInfoComplementar(detail.additionalInfo ?? "");
    setEditableItems(toEditableItems(items));
    setEditablePayments(toEditablePayments(payments));
    setErrorItemNumbers(new Set());
    setErrorPaymentSeqs(new Set());
  }

  function updateItem(index: number, patch: Partial<EditableCorrectionItem>) {
    setEditableItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setErrorItemNumbers(new Set());
  }

  function updatePayment(index: number, patch: Partial<EditableCorrectionPayment>) {
    setEditablePayments((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setErrorPaymentSeqs(new Set());
  }

  function buildPayload() {
    return {
      recipient: { cpf: recipientCpf, cnpj: recipientCnpj, name: recipientName, email: recipientEmail },
      infoComplementar,
      items: editableItems,
      payments: editablePayments.map((p) => ({
        seq: p.seq,
        paymentMethod: p.paymentMethod,
        paymentValue: p.paymentValue,
        changeValue: p.changeValue,
      })),
    };
  }

  /** Contexto para `validateNfceManualCorrection` — o mesmo é passado ao repositório, que revalida (ver Menor 1). */
  function buildContext(): NfceManualCorrectionContext {
    return {
      status: detail.note.status,
      taxRegimeCode: detail.issuer.taxRegimeCode,
      issuerUf: detail.issuer.uf,
      recipientUf: detail.recipient?.uf ?? null,
      noteTotal: detail.note.totalValue,
    };
  }

  /** Invariante 1: valida ANTES de gastar uma ida à rede, para destacar o campo errado na hora. */
  function validate(): { ok: true } | { ok: false; error: string } {
    const result = validateNfceManualCorrection(buildContext(), buildPayload());
    if (!result.ok) {
      const firstPaymentSeq = editablePayments[0]?.seq ?? null;
      const target = parseErrorTarget(result.error, firstPaymentSeq);
      setErrorItemNumbers(target.itemNumber != null ? new Set([target.itemNumber]) : new Set());
      setErrorPaymentSeqs(target.paymentSeq != null ? new Set([target.paymentSeq]) : new Set());
      toast({ title: "Validação da correção", description: result.error, variant: "destructive" });
      focusInvalidRow(target);
      return result;
    }
    setErrorItemNumbers(new Set());
    setErrorPaymentSeqs(new Set());
    return result;
  }

  async function saveCorrection() {
    if (validate().ok === false) return;
    try {
      setSavingCorrection(true);
      const result = await repository.saveManualCorrection(noteId, buildContext(), buildPayload());
      if (!result.ok) {
        toast({ title: "Falha ao salvar correção", description: result.error || "Não foi possível salvar.", variant: "destructive" });
        return;
      }
      toast({ title: "Correção salva", description: result.message || "Campos elegíveis atualizados com sucesso." });
      onSaved();
    } catch (error) {
      toast({ title: "Erro ao salvar", description: error instanceof Error ? error.message : "Falha ao salvar a correção manual.", variant: "destructive" });
    } finally {
      setSavingCorrection(false);
    }
  }

  async function saveAndReprocessCorrection() {
    if (validate().ok === false) return;
    try {
      setSavingAndReprocessing(true);
      const result = await repository.saveAndReprocessManualCorrection(noteId, buildContext(), buildPayload());
      if (!result.ok) {
        toast({ title: "Falha no fluxo", description: result.error || "Não foi possível salvar e reprocessar.", variant: "destructive" });
        return;
      }
      toast({ title: "Sucesso", description: result.message || "Correção salva e nota enviada para reprocessamento." });
      onSaved();
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Falha ao salvar e reprocessar.", variant: "destructive" });
    } finally {
      setSavingAndReprocessing(false);
    }
  }

  return {
    recipientCpf,
    setRecipientCpf,
    recipientCnpj,
    setRecipientCnpj,
    recipientName,
    setRecipientName,
    recipientEmail,
    setRecipientEmail,
    infoComplementar,
    setInfoComplementar,
    editableItems,
    updateItem,
    editablePayments,
    updatePayment,
    savingCorrection,
    savingAndReprocessing,
    errorItemNumbers,
    errorPaymentSeqs,
    noteTotal: detail.note.totalValue,
    saveCorrection,
    saveAndReprocessCorrection,
  };
}

export type NfceCorrectionForm = ReturnType<typeof useNfceCorrectionForm>;
