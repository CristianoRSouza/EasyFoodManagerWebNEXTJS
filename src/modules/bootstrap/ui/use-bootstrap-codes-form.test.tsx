import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { IssueBootstrapCodeResult } from "../domain/bootstrap-code";

const issueMock = vi.fn<(input: { email: string; ttlHours?: number }) => Promise<IssueBootstrapCodeResult>>();
const toastMock = vi.fn();

vi.mock("./use-bootstrap-code-repository", () => ({
  useBootstrapCodeRepository: () => ({ issue: issueMock }),
}));
vi.mock("@/shared/ui/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));

const { useBootstrapCodesForm } = await import("./use-bootstrap-codes-form");

beforeEach(() => {
  issueMock.mockReset();
  toastMock.mockReset();
});

describe("useBootstrapCodesForm — validação de email (texto igual ao legado)", () => {
  it("email inválido: toast 'Email inválido' e não chama o repositório", async () => {
    const hook = renderHook(() => useBootstrapCodesForm());
    act(() => hook.result.current.setEmail("nao-e-email"));

    await act(async () => {
      await hook.result.current.generate();
    });

    expect(toastMock).toHaveBeenCalledWith({ title: "Email inválido", variant: "destructive" });
    expect(issueMock).not.toHaveBeenCalled();
  });
});

describe("useBootstrapCodesForm — geração", () => {
  it("sucesso: guarda code/email/expiresAt e não mostra toast de erro", async () => {
    issueMock.mockResolvedValue({
      ok: true,
      code: "EFB1.abc.def",
      email: "funcionario@empresa.com",
      storeId: "store-1",
      expiresAt: "2026-10-01T12:00:00.000Z",
    });
    const hook = renderHook(() => useBootstrapCodesForm());
    act(() => hook.result.current.setEmail("funcionario@empresa.com"));

    await act(async () => {
      await hook.result.current.generate();
    });

    expect(issueMock).toHaveBeenCalledWith({ email: "funcionario@empresa.com" });
    expect(hook.result.current.result).toEqual({
      code: "EFB1.abc.def",
      email: "funcionario@empresa.com",
      expiresAt: "2026-10-01T12:00:00.000Z",
    });
    expect(toastMock).not.toHaveBeenCalled();
    expect(hook.result.current.generating).toBe(false);
  });

  it("recusa do servidor (ok:false): toast 'Não foi possível gerar o código' com a mensagem do servidor", async () => {
    issueMock.mockResolvedValue({ ok: false, error: "Email não pertence a esta loja." });
    const hook = renderHook(() => useBootstrapCodesForm());
    act(() => hook.result.current.setEmail("funcionario@empresa.com"));

    await act(async () => {
      await hook.result.current.generate();
    });

    expect(toastMock).toHaveBeenCalledWith({
      title: "Não foi possível gerar o código",
      description: "Email não pertence a esta loja.",
      variant: "destructive",
    });
    expect(hook.result.current.result).toBeNull();
  });

  it("recusa sem mensagem: usa 'Erro desconhecido.' (texto do legado)", async () => {
    issueMock.mockResolvedValue({ ok: false });
    const hook = renderHook(() => useBootstrapCodesForm());
    act(() => hook.result.current.setEmail("funcionario@empresa.com"));

    await act(async () => {
      await hook.result.current.generate();
    });

    expect(toastMock).toHaveBeenCalledWith({
      title: "Não foi possível gerar o código",
      description: "Erro desconhecido.",
      variant: "destructive",
    });
  });

  it("ok:true mas sem code: trata como falha (mesma condição do legado, `!r.ok || !r.code`)", async () => {
    issueMock.mockResolvedValue({ ok: true });
    const hook = renderHook(() => useBootstrapCodesForm());
    act(() => hook.result.current.setEmail("funcionario@empresa.com"));

    await act(async () => {
      await hook.result.current.generate();
    });

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Não foi possível gerar o código" }));
    expect(hook.result.current.result).toBeNull();
  });

  it("exceção inesperada do repositório: toast 'Falha ao gerar o código' com a mensagem do erro", async () => {
    issueMock.mockRejectedValue(new Error("Erro imprevisto."));
    const hook = renderHook(() => useBootstrapCodesForm());
    act(() => hook.result.current.setEmail("funcionario@empresa.com"));

    await act(async () => {
      await hook.result.current.generate();
    });

    expect(toastMock).toHaveBeenCalledWith({
      title: "Falha ao gerar o código",
      description: "Erro imprevisto.",
      variant: "destructive",
    });
  });

  it("email é normalizado (trim + minúsculas) antes de chamar o repositório", async () => {
    issueMock.mockResolvedValue({ ok: true, code: "x" });
    const hook = renderHook(() => useBootstrapCodesForm());
    act(() => hook.result.current.setEmail("  Funcionario@Empresa.COM  "));

    await act(async () => {
      await hook.result.current.generate();
    });

    expect(issueMock).toHaveBeenCalledWith({ email: "funcionario@empresa.com" });
  });
});

describe("useBootstrapCodesForm — copiar", () => {
  it("copy(): grava na área de transferência e marca 'copied' por 2s", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    issueMock.mockResolvedValue({ ok: true, code: "EFB1.abc.def", email: "a@b.com", expiresAt: "" });
    const hook = renderHook(() => useBootstrapCodesForm());
    act(() => hook.result.current.setEmail("a@b.com"));
    await act(async () => {
      await hook.result.current.generate();
    });

    await act(async () => {
      await hook.result.current.copy();
    });

    expect(writeText).toHaveBeenCalledWith("EFB1.abc.def");
    expect(hook.result.current.copied).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(hook.result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it("copy() sem resultado ainda: não faz nada", async () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    const hook = renderHook(() => useBootstrapCodesForm());

    await act(async () => {
      await hook.result.current.copy();
    });

    expect(writeText).not.toHaveBeenCalled();
  });

  it("clipboard falhando: toast 'Não foi possível copiar'", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("negado"));
    Object.assign(navigator, { clipboard: { writeText } });

    issueMock.mockResolvedValue({ ok: true, code: "EFB1.abc.def", email: "a@b.com", expiresAt: "" });
    const hook = renderHook(() => useBootstrapCodesForm());
    act(() => hook.result.current.setEmail("a@b.com"));
    await act(async () => {
      await hook.result.current.generate();
    });
    toastMock.mockReset();

    await act(async () => {
      await hook.result.current.copy();
    });

    expect(toastMock).toHaveBeenCalledWith({ title: "Não foi possível copiar", variant: "destructive" });
  });
});
