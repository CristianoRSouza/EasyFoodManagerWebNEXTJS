import { asNumber, asNumberOrNull, asText } from "@/shared/infrastructure/convert";
import type { NfceItem, NfceItemCsosn500, NfceItemIcms, NfceItemTax } from "../domain/nfce-item";
import type { Row } from "./nfce-note-mapper";

function toIcmsCsosn500(row: Row): NfceItemCsosn500 | null {
  const hasAny =
    row.csosn500_p_st != null ||
    row.csosn500_v_bcst_ret != null ||
    row.csosn500_v_icms_substituto != null ||
    row.csosn500_v_icms_st_ret != null;
  if (!hasAny) return null;
  return {
    stRate: asNumberOrNull(row.csosn500_p_st),
    stRetainedBase: asNumberOrNull(row.csosn500_v_bcst_ret),
    substituteIcms: asNumberOrNull(row.csosn500_v_icms_substituto),
    stRetainedIcms: asNumberOrNull(row.csosn500_v_icms_st_ret),
  };
}

function toIcms(row: Row): NfceItemIcms {
  return {
    origin: asNumberOrNull(row.icms_origem),
    cstOrCsosn: asText(row.icms_cst_csosn),
    base: asNumberOrNull(row.icms_bc),
    rate: asNumberOrNull(row.icms_aliquota),
    value: asNumberOrNull(row.icms_valor),
    stValue: asNumberOrNull(row.icms_st_valor),
    fcpValue: asNumberOrNull(row.icms_fcp_valor),
    snCreditRate: asNumberOrNull(row.sn_aliq_credito),
    snCreditValue: asNumberOrNull(row.sn_valor_credito),
    csosn500: toIcmsCsosn500(row),
  };
}

function toTax(row: Row, prefix: "pis" | "cofins"): NfceItemTax {
  return {
    cst: asText(row[`${prefix}_cst`]),
    base: asNumberOrNull(row[`${prefix}_bc`]),
    rate: asNumberOrNull(row[`${prefix}_aliquota`]),
    value: asNumberOrNull(row[`${prefix}_valor`]),
    quantityBase: asNumberOrNull(row[`${prefix}_bc_quantity`]),
    rateInReais: asNumberOrNull(row[`${prefix}_rate_reais`]),
  };
}

export function toNfceItem(row: Row): NfceItem {
  return {
    sequence: asNumber(row.item, 0),
    productCode: String(row.codigo_produto ?? ""),
    ean: asText(row.ean),
    description: String(row.descricao ?? ""),
    ncm: String(row.ncm ?? ""),
    cest: asText(row.cest),
    cfop: String(row.cfop ?? ""),
    unit: String(row.unidade ?? ""),
    quantity: asNumber(row.quantidade, 0),
    unitPrice: asNumber(row.preco_unitario, 0),
    grossValue: asNumber(row.valor_bruto, 0),
    discount: asNumberOrNull(row.desconto),
    freight: asNumberOrNull(row.frete),
    insurance: asNumberOrNull(row.seguro),
    otherExpenses: asNumberOrNull(row.outras_despesas),
    additionalInfo: asText(row.info_adicional),
    icms: toIcms(row),
    pis: toTax(row, "pis"),
    cofins: toTax(row, "cofins"),
    totalTaxes: asNumberOrNull(row.total_tributos),
    scaleIndicator: asText(row.scale_indicator),
    reformItemTotal: asNumberOrNull(row.rtrib_v_item),
  };
}
