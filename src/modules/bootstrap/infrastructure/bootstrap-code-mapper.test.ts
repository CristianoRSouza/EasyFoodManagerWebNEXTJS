import { describe, expect, it } from "vitest";
import { toIssueBootstrapCodeResult } from "./bootstrap-code-mapper";

describe("toIssueBootstrapCodeResult", () => {
  it("mapeia uma resposta de sucesso completa", () => {
    expect(
      toIssueBootstrapCodeResult({
        ok: true,
        code: "EFB1.abc.def",
        email: "funcionario@empresa.com",
        store_id: "store-1",
        expires_at: "2026-10-01T12:00:00Z",
      }),
    ).toEqual({
      ok: true,
      code: "EFB1.abc.def",
      email: "funcionario@empresa.com",
      storeId: "store-1",
      expiresAt: "2026-10-01T12:00:00Z",
      error: undefined,
    });
  });

  it("mapeia uma resposta de recusa (ok:false com error, sem code)", () => {
    expect(
      toIssueBootstrapCodeResult({
        ok: false,
        error: "Email não pertence a esta loja.",
      }),
    ).toEqual({
      ok: false,
      code: undefined,
      email: undefined,
      storeId: undefined,
      expiresAt: undefined,
      error: "Email não pertence a esta loja.",
    });
  });

  it("campos ausentes viram undefined, não string vazia/null", () => {
    expect(toIssueBootstrapCodeResult({})).toEqual({
      ok: false,
      code: undefined,
      email: undefined,
      storeId: undefined,
      expiresAt: undefined,
      error: undefined,
    });
  });
});
