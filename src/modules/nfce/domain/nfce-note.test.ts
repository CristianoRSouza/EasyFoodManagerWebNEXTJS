import { describe, expect, it } from "vitest";
import { canReprocessNfce } from "./nfce-note";
import type { NfceNote } from "./nfce-note";

function note(overrides: Partial<NfceNote>): NfceNote {
  return {
    id: "n1",
    number: 1,
    serie: 1,
    accessKey: null,
    status: "authorized",
    totalValue: 10,
    discountValue: 0,
    issuedAt: "2026-01-01T00:00:00Z",
    authorizedAt: null,
    protocol: null,
    returnCode: null,
    returnReason: null,
    orderId: null,
    qrCode: null,
    issuerCnpj: "12345678000199",
    issuerCompanyName: "Empresa",
    issuerTradeName: null,
    issuerUf: "SP",
    recipientDocument: null,
    recipientName: null,
    itemCount: 1,
    paymentMethods: [],
    emissionType: null,
    reconcileStatus: null,
    retryCount: null,
    ...overrides,
  };
}

describe("canReprocessNfce", () => {
  it("nota em manual_review com contingência (emissionType 9) pode reprocessar", () => {
    expect(canReprocessNfce(note({ status: "manual_review", emissionType: 9 }))).toBe(true);
  });

  it("nota unusable com contingência (emissionType 9) pode reprocessar", () => {
    expect(canReprocessNfce(note({ status: "unusable", emissionType: 9 }))).toBe(true);
  });

  it("nota normal (emissionType 1) com reconcileStatus retentável pode reprocessar", () => {
    expect(canReprocessNfce(note({ status: "authorized", emissionType: 1, reconcileStatus: "failed" }))).toBe(true);
    expect(canReprocessNfce(note({ status: "authorized", emissionType: 1, reconcileStatus: "PENDING_RECONCILE_ORIGIN" }))).toBe(true);
  });

  it("nota normal (emissionType 1) com reconcileStatus não retentável não pode reprocessar", () => {
    expect(canReprocessNfce(note({ status: "authorized", emissionType: 1, reconcileStatus: "reconciled" }))).toBe(false);
  });

  it("nota autorizada sem contingência nem reconcileStatus pendente não pode reprocessar", () => {
    expect(canReprocessNfce(note({ status: "authorized", emissionType: 1, reconcileStatus: null }))).toBe(false);
  });

  it("nota manual_review sem contingência (emissionType diferente de 9) não cai na regra de contingência", () => {
    expect(canReprocessNfce(note({ status: "manual_review", emissionType: 1, reconcileStatus: null }))).toBe(false);
  });
});
