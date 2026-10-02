import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { NfceDetail } from "../../domain/nfce-detail";
import type { NfceItem } from "../../domain/nfce-item";
import type { NfcePayment } from "../../domain/nfce-payment";
import type { NfceStatus } from "../../domain/nfce-note";
import type { NfceRepository } from "../../application/nfce-repository";
import type { NfceDetailBundle } from "./use-nfce-detail-query";

/**
 * Testes de componente da invariante 1 (CLAUDE.md: correção manual de NFC-e não pode alterar o
 * valor total; só permitida em `manual_review`). `validateNfceManualCorrection` (núcleo do
 * módulo, testado à parte em `domain/nfce-correction.test.ts`) é mockado aqui para dirigir cada
 * cenário — o que se testa é a REAÇÃO da tela ao resultado da validação: bloquear e mostrar o
 * erro sem chamar a API, ou seguir para `saveManualCorrection` quando ela aprova.
 */
const validateMock = vi.fn();
vi.mock("../../domain/nfce-correction", async () => {
  const actual = await vi.importActual<typeof import("../../domain/nfce-correction")>("../../domain/nfce-correction");
  return { ...actual, validateNfceManualCorrection: (...args: unknown[]) => validateMock(...args) };
});

const mockToast = vi.fn();
vi.mock("@/shared/ui/use-toast", () => ({ useToast: () => ({ toast: mockToast }) }));

const fakeRepository: Partial<NfceRepository> = {
  saveManualCorrection: vi.fn(),
  saveAndReprocessManualCorrection: vi.fn(),
};
vi.mock("../use-nfce-repository", () => ({ useNfceRepository: () => fakeRepository }));

const { NfceCorrectionTab } = await import("./NfceCorrectionTab");

function makeItem(): NfceItem {
  return {
    sequence: 1,
    productCode: "1",
    ean: null,
    description: "Coxinha",
    ncm: "19059090",
    cest: null,
    cfop: "5102",
    unit: "UN",
    quantity: 1,
    unitPrice: 100,
    grossValue: 100,
    discount: null,
    freight: null,
    insurance: null,
    otherExpenses: null,
    additionalInfo: null,
    icms: {
      origin: 0,
      cstOrCsosn: "102",
      base: null,
      rate: null,
      value: null,
      stValue: null,
      fcpValue: null,
      snCreditRate: null,
      snCreditValue: null,
      csosn500: null,
    },
    pis: { cst: null, base: null, rate: null, value: null, quantityBase: null, rateInReais: null },
    cofins: { cst: null, base: null, rate: null, value: null, quantityBase: null, rateInReais: null },
    totalTaxes: null,
    scaleIndicator: null,
    reformItemTotal: null,
  };
}

function makePayment(): NfcePayment {
  return {
    sequence: 1,
    method: "17",
    methodDescription: "PIX",
    amount: 100,
    change: null,
    integrationType: null,
    integrationDescription: null,
    cardBrand: null,
    cardBrandDescription: null,
    authorizationNsu: null,
    acquirerCnpj: null,
  };
}

function makeBundle(status: NfceStatus): NfceDetailBundle {
  const detail: NfceDetail = {
    note: {
      id: "n1",
      number: 100,
      serie: 1,
      accessKey: null,
      status,
      totalValue: 100,
      discountValue: 0,
      issuedAt: "2026-04-06T12:00:00.000Z",
      authorizedAt: null,
      protocol: null,
      returnCode: null,
      returnReason: null,
      orderId: null,
      qrCode: null,
      issuerCnpj: "13971933000178",
      issuerCompanyName: "EASY SOFT",
      issuerTradeName: null,
      issuerUf: "SP",
      recipientDocument: null,
      recipientName: null,
      itemCount: 1,
      paymentMethods: ["17"],
      emissionType: 1,
      reconcileStatus: null,
      retryCount: null,
    },
    model: "65",
    emissionPurpose: 1,
    queryUrl: null,
    transactionId: null,
    identification: null,
    issuer: {
      cnpj: "13971933000178",
      companyName: "EASY SOFT",
      tradeName: null,
      stateRegistration: null,
      municipalRegistration: null,
      cnae: null,
      taxRegimeCode: 3,
      street: null,
      number: null,
      complement: null,
      neighborhood: null,
      municipality: null,
      uf: "SP",
      zipCode: null,
      phone: null,
    },
    recipient: null,
    totals: { products: 100, discount: 0, freight: 0, insurance: 0, otherExpenses: 0, note: 100, icms: 0, icmsSt: 0, ipi: 0, pis: 0, cofins: 0, fcp: 0 },
    taxReform: {
      approximateTaxes: null,
      noteTotal: null,
      base: null,
      ibs: null,
      ibsState: null,
      ibsStateDiff: null,
      ibsStateReturn: null,
      ibsCity: null,
      ibsCityDiff: null,
      ibsCityReturn: null,
      cbs: null,
      cbsDiff: null,
      cbsReturn: null,
    },
    documents: { authorizedXml: null, cancellationXml: null, signedXml: null, generatedXml: null, qrCode: null, cancellationProtocol: null, cancelledAt: null },
    recovery: {
      reconcileStatus: null,
      retryCount: null,
      lastRetryAt: null,
      nextRetryAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      manualFixRequiredAt: null,
      manualFixNote: null,
      originNoteId: null,
      replacementNoteId: null,
      emissionPath: null,
    },
    additionalInfo: null,
    taxInfo: null,
  };
  return { detail, items: [makeItem()], payments: [makePayment()], logs: [], events: [] };
}

beforeEach(() => {
  validateMock.mockReset();
  mockToast.mockReset();
  vi.mocked(fakeRepository.saveManualCorrection!).mockReset();
  vi.mocked(fakeRepository.saveAndReprocessManualCorrection!).mockReset();
});

describe("NfceCorrectionTab — invariante 1 (correção manual)", () => {
  it("fora de manual_review, a edição fica indisponível (sem botões de salvar)", () => {
    render(<NfceCorrectionTab noteId="n1" bundle={makeBundle("rejected")} status="rejected" onSaved={vi.fn()} />);

    expect(screen.getByText(/A edição manual só fica disponível para notas com status/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar correções" })).not.toBeInTheDocument();
  });

  it("total alterado: bloqueia e mostra o erro sem chamar a API", async () => {
    validateMock.mockReturnValue({ ok: false, error: "Não é permitido alterar campos que modifiquem o valor total da NFC-e." });
    render(<NfceCorrectionTab noteId="n1" bundle={makeBundle("manual_review")} status="manual_review" onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Salvar correções" }));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Validação da correção", description: "Não é permitido alterar campos que modifiquem o valor total da NFC-e." }),
    );
    expect(fakeRepository.saveManualCorrection).not.toHaveBeenCalled();
  });

  it("pagamento insuficiente: bloqueia e mostra o erro sem chamar a API", async () => {
    validateMock.mockReturnValue({
      ok: false,
      error: "Pagamentos: a soma dos valores menos o troco não pode ser menor que o total da NFC-e.",
    });
    render(<NfceCorrectionTab noteId="n1" bundle={makeBundle("manual_review")} status="manual_review" onSaved={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Salvar e reprocessar" }));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Validação da correção", description: expect.stringContaining("não pode ser menor que o total") }),
    );
    expect(fakeRepository.saveAndReprocessManualCorrection).not.toHaveBeenCalled();
  });

  // Menor 11 da revisão da Fase 3: o legado rola a tela e foca o campo com erro
  // (`focusFirstInvalidField`, `NfceDetailPage.tsx:328-333`); o Next fazia só o destaque vermelho.
  it("Menor 11 — erro de item: rola até a linha do item e foca o primeiro campo dela", async () => {
    validateMock.mockReturnValue({ ok: false, error: "Item 1: NCM deve ter 8 dígitos." });
    render(<NfceCorrectionTab noteId="n1" bundle={makeBundle("manual_review")} status="manual_review" onSaved={vi.fn()} />);

    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    const row = document.getElementById("manual-correction-item-1")!;
    const firstInput = row.querySelector("input")!;
    const focusSpy = vi.spyOn(firstInput, "focus");

    await userEvent.click(screen.getByRole("button", { name: "Salvar correções" }));

    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth", block: "center" }));
    await waitFor(() => expect(focusSpy).toHaveBeenCalled(), { timeout: 1000 });
    scrollSpy.mockRestore();
    focusSpy.mockRestore();
  });

  it("Menor 11 — erro de pagamento: rola até a linha do pagamento e foca o primeiro campo dela", async () => {
    validateMock.mockReturnValue({ ok: false, error: "Pagamento 1: valor inválido." });
    render(<NfceCorrectionTab noteId="n1" bundle={makeBundle("manual_review")} status="manual_review" onSaved={vi.fn()} />);

    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    const row = document.getElementById("manual-correction-payment-1")!;
    const firstField = row.querySelector("select, input")!;
    const focusSpy = vi.spyOn(firstField as HTMLElement, "focus");

    await userEvent.click(screen.getByRole("button", { name: "Salvar correções" }));

    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth", block: "center" }));
    await waitFor(() => expect(focusSpy).toHaveBeenCalled(), { timeout: 1000 });
    scrollSpy.mockRestore();
    focusSpy.mockRestore();
  });

  // Validação de escrita (2026-10-01): legado `NfceDetailPage.tsx#loadNote` usa o texto cru da API
  // (`String(row.valor ?? "").trim() || "0"`; troco idem, só para dinheiro) — "136.60", não "136.6".
  it("valor e troco do pagamento abrem e são enviados com o texto cru da API (igual ao legado)", async () => {
    validateMock.mockReturnValue({ ok: true });
    vi.mocked(fakeRepository.saveManualCorrection!).mockResolvedValue({ ok: true, message: "ok" });
    const bundle = makeBundle("manual_review");
    bundle.payments = [
      { ...makePayment(), method: "01", amount: 136.6, amountText: "136.60", change: 3.4, changeText: "3.40" },
    ];
    render(<NfceCorrectionTab noteId="n1" bundle={bundle} status="manual_review" onSaved={vi.fn()} />);

    expect(screen.getByDisplayValue("136.60")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3.40")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salvar correções" }));

    expect(fakeRepository.saveManualCorrection).toHaveBeenCalledWith(
      "n1",
      expect.anything(),
      expect.objectContaining({
        payments: [expect.objectContaining({ seq: 1, paymentMethod: "01", paymentValue: "136.60", changeValue: "3.40" })],
      }),
    );
  });

  it("caso válido: chama o repositório e avisa sucesso", async () => {
    validateMock.mockReturnValue({ ok: true });
    vi.mocked(fakeRepository.saveManualCorrection!).mockResolvedValue({ ok: true, message: "Correção salva com sucesso." });
    const onSaved = vi.fn();
    render(<NfceCorrectionTab noteId="n1" bundle={makeBundle("manual_review")} status="manual_review" onSaved={onSaved} />);

    await userEvent.click(screen.getByRole("button", { name: "Salvar correções" }));

    expect(fakeRepository.saveManualCorrection).toHaveBeenCalledWith(
      "n1",
      expect.objectContaining({ status: "manual_review", noteTotal: 100 }),
      expect.objectContaining({
        recipient: { cpf: "", cnpj: "", name: "", email: "" },
        items: [expect.objectContaining({ item: 1, ncm: "19059090", cfop: "5102", icmsCstCsosn: "102" })],
        payments: [expect.objectContaining({ seq: 1, paymentMethod: "17", paymentValue: "100" })],
      }),
    );
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Correção salva" }));
    expect(onSaved).toHaveBeenCalled();
  });
});
