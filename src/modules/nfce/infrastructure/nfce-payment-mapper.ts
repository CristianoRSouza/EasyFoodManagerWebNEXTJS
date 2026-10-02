import { asNumber, asNumberOrNull, asText } from "@/shared/infrastructure/convert";
import type { NfcePayment } from "../domain/nfce-payment";
import type { Row } from "./nfce-note-mapper";

export function toNfcePayment(row: Row): NfcePayment {
  return {
    sequence: asNumber(row.seq, 0),
    method: String(row.forma_pagamento ?? ""),
    methodDescription: String(row.forma_descricao ?? row.forma_pagamento ?? ""),
    amount: asNumber(row.valor, 0),
    amountText: String(row.valor ?? "").trim(),
    change: asNumberOrNull(row.troco),
    changeText: row.troco == null ? null : String(row.troco).trim(),
    integrationType: asNumberOrNull(row.tipo_integracao),
    integrationDescription: asText(row.integracao_descricao),
    cardBrand: asText(row.bandeira_cartao),
    cardBrandDescription: asText(row.bandeira_descricao),
    authorizationNsu: asText(row.nsu_autorizacao),
    acquirerCnpj: asText(row.cnpj_credenciadora),
  };
}
