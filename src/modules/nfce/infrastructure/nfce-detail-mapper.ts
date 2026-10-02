import { asNumber, asNumberOrNull, asText } from "@/shared/infrastructure/convert";
import type {
  NfceDetail,
  NfceDocuments,
  NfceFiscalTotals,
  NfceIdentification,
  NfceIssuerDetail,
  NfceRecipientDetail,
  NfceRecovery,
  NfceTaxReformTotals,
} from "../domain/nfce-detail";
import type { NfceNote } from "../domain/nfce-note";
import { toNfceNote, type Row } from "./nfce-note-mapper";

/**
 * A nota-resumo embutida no detalhe.
 *
 * ⚠️ A rota de detalhe (`GET /nfce/notes/:id`) NÃO devolve `valor_total`/`valor_desconto` —
 * a mesma coluna (`nfce_notes.total_value`/`discount_value`) sai com outro alias
 * (`total_nota`/`total_desconto`), porque o detalhe também carrega os demais totais fiscais.
 * Todos os demais campos usam os MESMOS alias que `toNfceNote` (listagem) já lê — por isso
 * reaproveita `toNfceNote` e só sobrescreve os dois campos com alias diferente (Menor 3 da
 * revisão da Fase 3: antes este mapeador repetia o corpo inteiro de `toNfceNote`).
 */
function toEmbeddedNote(row: Row): NfceNote {
  return {
    ...toNfceNote(row),
    totalValue: asNumber(row.total_nota, 0),
    discountValue: asNumber(row.total_desconto, 0),
  };
}

function toIdentification(row: Row): NfceIdentification | null {
  const hasAny =
    row.ambiente != null ||
    row.finalidade != null ||
    row.natureza_operacao != null ||
    row.consumidor_final != null ||
    row.indicador_presenca != null;
  if (!hasAny) return null;
  return {
    environment: asNumberOrNull(row.ambiente),
    emissionType: asNumberOrNull(row.tipo_emissao),
    emissionPurpose: asNumberOrNull(row.finalidade),
    finalConsumer: asNumberOrNull(row.consumidor_final),
    presence: asNumberOrNull(row.indicador_presenca),
    intermediary: asNumberOrNull(row.intermediary_indicator),
    emissionProcess: asNumberOrNull(row.processo_emissao),
    processVersion: asText(row.versao_processo),
    operationNature: asText(row.natureza_operacao),
  };
}

function toIssuer(row: Row): NfceIssuerDetail {
  return {
    cnpj: String(row.emitente_cnpj ?? ""),
    companyName: String(row.emitente_razao ?? ""),
    tradeName: asText(row.emitente_fantasia),
    stateRegistration: asText(row.emitente_ie),
    municipalRegistration: asText(row.emitente_im),
    cnae: asText(row.emitente_cnae),
    taxRegimeCode: asNumberOrNull(row.emitente_crt),
    street: asText(row.emitente_logradouro),
    number: asText(row.emitente_numero),
    complement: asText(row.emitente_complemento),
    neighborhood: asText(row.emitente_bairro),
    municipality: asText(row.emitente_municipio),
    uf: String(row.emitente_uf ?? ""),
    zipCode: asText(row.emitente_cep),
    phone: asText(row.emitente_fone),
  };
}

function toRecipient(row: Row): NfceRecipientDetail | null {
  const hasAny =
    row.destinatario_cpf != null ||
    row.destinatario_cnpj != null ||
    row.destinatario_nome != null ||
    row.destinatario_email != null;
  if (!hasAny) return null;
  return {
    cpf: asText(row.destinatario_cpf),
    cnpj: asText(row.destinatario_cnpj),
    name: asText(row.destinatario_nome),
    email: asText(row.destinatario_email),
    street: asText(row.destinatario_logradouro),
    number: asText(row.destinatario_numero),
    complement: asText(row.destinatario_complemento),
    neighborhood: asText(row.destinatario_bairro),
    municipality: asText(row.destinatario_municipio),
    uf: asText(row.destinatario_uf),
    zipCode: asText(row.destinatario_cep),
    phone: asText(row.destinatario_fone),
    ieIndicator: asNumberOrNull(row.destinatario_ie_indicador),
  };
}

function toTotals(row: Row): NfceFiscalTotals {
  return {
    products: asNumber(row.total_produtos, 0),
    discount: asNumber(row.total_desconto, 0),
    freight: asNumber(row.total_frete, 0),
    insurance: asNumber(row.total_seguro, 0),
    otherExpenses: asNumber(row.outras_despesas, 0),
    note: asNumber(row.total_nota, 0),
    icms: asNumber(row.total_icms, 0),
    icmsSt: asNumber(row.total_icms_st, 0),
    ipi: asNumber(row.total_ipi, 0),
    pis: asNumber(row.total_pis, 0),
    cofins: asNumber(row.total_cofins, 0),
    fcp: asNumber(row.total_fcp, 0),
  };
}

function toTaxReform(row: Row): NfceTaxReformTotals {
  return {
    approximateTaxes: asNumberOrNull(row.icms_tot_v_tot_trib),
    noteTotal: asNumberOrNull(row.tot_v_nf_tot),
    base: asNumberOrNull(row.ibscbs_tot_v_bc),
    ibs: asNumberOrNull(row.ibscbs_tot_v_ibs),
    ibsState: asNumberOrNull(row.ibscbs_tot_v_ibs_uf),
    ibsStateDiff: asNumberOrNull(row.ibscbs_tot_v_dif_ibs_uf),
    ibsStateReturn: asNumberOrNull(row.ibscbs_tot_v_dev_trib_ibs_uf),
    ibsCity: asNumberOrNull(row.ibscbs_tot_v_ibs_mun),
    ibsCityDiff: asNumberOrNull(row.ibscbs_tot_v_dif_ibs_mun),
    ibsCityReturn: asNumberOrNull(row.ibscbs_tot_v_dev_trib_ibs_mun),
    cbs: asNumberOrNull(row.ibscbs_tot_v_cbs),
    cbsDiff: asNumberOrNull(row.ibscbs_tot_v_dif_cbs),
    cbsReturn: asNumberOrNull(row.ibscbs_tot_v_dev_trib_cbs),
  };
}

/** As flags `tem_xml_*` da EasyFoodAPI; só entram as que vieram como booleano. */
function toXmlAvailability(row: Row): NfceDocuments["xmlAvailability"] {
  const flags = {
    authorized: row.tem_xml_autorizado,
    cancellation: row.tem_xml_cancelamento,
    signed: row.tem_xml_assinado,
    generated: row.tem_xml_gerado,
  };
  return Object.fromEntries(Object.entries(flags).filter(([, value]) => typeof value === "boolean"));
}

function toDocuments(row: Row): NfceDocuments {
  return {
    authorizedXml: asText(row.authorized_xml),
    cancellationXml: asText(row.cancellation_xml),
    signedXml: asText(row.signed_xml),
    generatedXml: asText(row.generated_xml),
    xmlAvailability: toXmlAvailability(row),
    qrCode: asText(row.qrcode),
    cancellationProtocol: asText(row.cancellation_protocol),
    cancelledAt: asText(row.cancelled_at),
  };
}

function toRecovery(row: Row): NfceRecovery {
  return {
    reconcileStatus: asText(row.reconcile_status),
    retryCount: asNumberOrNull(row.retry_count),
    lastRetryAt: asText(row.last_retry_at),
    nextRetryAt: asText(row.next_retry_at),
    lastErrorCode: asText(row.last_error_code),
    lastErrorMessage: asText(row.last_error_message),
    manualFixRequiredAt: asText(row.manual_fix_required_at),
    manualFixNote: asText(row.manual_fix_note),
    originNoteId: asText(row.origin_note_id),
    replacementNoteId: asText(row.replacement_note_id),
    emissionPath: asText(row.emission_path),
  };
}

export function toNfceDetail(row: Row): NfceDetail {
  return {
    note: toEmbeddedNote(row),
    model: asText(row.modelo),
    emissionPurpose: asNumberOrNull(row.finalidade),
    queryUrl: asText(row.url_consulta),
    transactionId: asText(row.transaction_id),
    identification: toIdentification(row),
    issuer: toIssuer(row),
    recipient: toRecipient(row),
    totals: toTotals(row),
    taxReform: toTaxReform(row),
    documents: toDocuments(row),
    recovery: toRecovery(row),
    additionalInfo: asText(row.info_complementar),
    taxInfo: asText(row.info_fiscal),
  };
}
