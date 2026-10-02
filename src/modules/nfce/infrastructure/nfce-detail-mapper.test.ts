import { describe, expect, it } from "vitest";
import { toNfceDetail } from "./nfce-detail-mapper";

const BASE_ROW = {
  id: "n1",
  numero: 100,
  serie: 1,
  modelo: "65",
  chave_acesso: "352604...",
  status: "manual_review",
  tipo_emissao: 1,
  finalidade: 1,
  emissao_em: "2026-04-06T12:17:27.000Z",
  autorizada_em: null,
  protocolo: null,
  codigo_retorno: null,
  motivo_retorno: null,
  qrcode: null,
  url_consulta: null,
  authorized_xml: null,
  cancellation_xml: null,
  signed_xml: null,
  generated_xml: null,
  cancellation_protocol: null,
  cancelled_at: null,
  order_id: null,
  transaction_id: null,
  total_nota: "228.99",
  total_produtos: "228.99",
  total_desconto: "0",
  total_frete: "0",
  total_seguro: "0",
  outras_despesas: "0",
  total_icms: "0",
  total_icms_st: "0",
  total_ipi: "0",
  total_pis: "0",
  total_cofins: "0",
  total_fcp: "0",
  origin_note_id: null,
  replacement_note_id: null,
  emission_path: null,
  reconcile_status: null,
  retry_count: 0,
  last_retry_at: null,
  next_retry_at: null,
  last_error_code: null,
  last_error_message: null,
  manual_fix_required_at: null,
  manual_fix_note: null,
  icms_tot_v_tot_trib: null,
  tot_v_nf_tot: null,
  ibscbs_tot_v_bc: null,
  ibscbs_tot_v_ibs: null,
  ibscbs_tot_v_ibs_uf: null,
  ibscbs_tot_v_dif_ibs_uf: null,
  ibscbs_tot_v_dev_trib_ibs_uf: null,
  ibscbs_tot_v_ibs_mun: null,
  ibscbs_tot_v_dif_ibs_mun: null,
  ibscbs_tot_v_dev_trib_ibs_mun: null,
  ibscbs_tot_v_cbs: null,
  ibscbs_tot_v_dif_cbs: null,
  ibscbs_tot_v_dev_trib_cbs: null,
  natureza_operacao: "Venda",
  ambiente: 1,
  consumidor_final: 1,
  indicador_presenca: 1,
  intermediary_indicator: null,
  processo_emissao: 0,
  versao_processo: "1.0",
  emitente_cnpj: "13971933000178",
  emitente_razao: "EASY SOFT",
  emitente_fantasia: null,
  emitente_ie: null,
  emitente_im: null,
  emitente_cnae: null,
  emitente_crt: 3,
  emitente_logradouro: null,
  emitente_numero: null,
  emitente_complemento: null,
  emitente_bairro: null,
  emitente_municipio: null,
  emitente_uf: "SP",
  emitente_cep: null,
  emitente_fone: null,
  destinatario_cpf: null,
  destinatario_cnpj: null,
  destinatario_nome: null,
  destinatario_email: null,
  destinatario_logradouro: null,
  destinatario_numero: null,
  destinatario_complemento: null,
  destinatario_bairro: null,
  destinatario_municipio: null,
  destinatario_uf: null,
  destinatario_cep: null,
  destinatario_fone: null,
  destinatario_ie_indicador: null,
  info_fiscal: null,
  info_complementar: null,
  qtd_itens: 6,
  formas_pagamento: "17",
};

describe("toNfceDetail", () => {
  it("lê as flags `tem_xml_*` da nuvem (o detalhe da EasyFoodAPI não traz o XML — homologação, 2026-10-01)", () => {
    const detail = toNfceDetail({
      ...BASE_ROW,
      tem_xml_autorizado: true,
      tem_xml_cancelamento: false,
      tem_xml_assinado: true,
      tem_xml_gerado: true,
    });
    expect(detail.documents.xmlAvailability).toEqual({ authorized: true, cancellation: false, signed: true, generated: true });
  });

  it("sem as flags (loja), `xmlAvailability` fica vazio e a existência vem do XML inline", () => {
    expect(toNfceDetail(BASE_ROW).documents.xmlAvailability).toEqual({});
  });

  it("lê o total da nota embutida de `total_nota`/`total_desconto` — o detalhe NÃO devolve `valor_total`", () => {
    const detail = toNfceDetail(BASE_ROW);
    expect(detail.note.totalValue).toBe(228.99);
    expect(detail.note.discountValue).toBe(0);
    expect(detail.note.status).toBe("manual_review");
  });

  it("recipient é null quando nenhum campo de destinatário veio preenchido", () => {
    const detail = toNfceDetail(BASE_ROW);
    expect(detail.recipient).toBeNull();
  });

  it("recipient aparece quando ao menos um campo do destinatário existe", () => {
    const detail = toNfceDetail({ ...BASE_ROW, destinatario_cpf: "12345678901" });
    expect(detail.recipient).toMatchObject({ cpf: "12345678901" });
  });

  it("mapeia o emitente completo, incluindo o CRT usado pela validação de correção", () => {
    const detail = toNfceDetail(BASE_ROW);
    expect(detail.issuer).toMatchObject({ cnpj: "13971933000178", uf: "SP", taxRegimeCode: 3 });
  });

  it("taxReform vem com os campos ausentes como null, não zero (nota sem reforma)", () => {
    const detail = toNfceDetail(BASE_ROW);
    expect(detail.taxReform.ibs).toBeNull();
    expect(detail.taxReform.noteTotal).toBeNull();
  });
});
