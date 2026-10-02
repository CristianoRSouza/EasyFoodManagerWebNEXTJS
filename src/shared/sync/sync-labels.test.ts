import { describe, expect, it } from "vitest";
import { getSyncOpPresentation } from "./sync-op-label";
import { syncLogStatusIsError, syncLogStatusIsSuccess } from "./sync-log-status";
import {
  friendlyAction,
  friendlyBillingAction,
  friendlyDescription,
  friendlyFunction,
} from "./friendly-labels";

describe("getSyncOpPresentation", () => {
  it("vazio/nulo vira traço", () => {
    expect(getSyncOpPresentation(null)).toEqual({ short: "—", tooltip: "Operação desconhecida" });
    expect(getSyncOpPresentation("   ")).toEqual({ short: "—", tooltip: "Operação desconhecida" });
  });

  it("upsert é M", () => {
    expect(getSyncOpPresentation("UPSERT")).toEqual({ short: "M", tooltip: "Upsert (inserir ou substituir)" });
  });

  it("insert/update/delete por extenso ou por letra", () => {
    expect(getSyncOpPresentation("insert").short).toBe("I");
    expect(getSyncOpPresentation("i").tooltip).toBe("Inserção (Insert)");
    expect(getSyncOpPresentation(" U ").short).toBe("U");
    expect(getSyncOpPresentation("update").tooltip).toBe("Atualização (Update)");
    expect(getSyncOpPresentation("D").short).toBe("D");
    expect(getSyncOpPresentation("delete").tooltip).toBe("Eliminação (Delete)");
  });

  it("desconhecido: primeira letra maiúscula e o texto cru no tooltip", () => {
    expect(getSyncOpPresentation("truncate")).toEqual({ short: "T", tooltip: "truncate" });
  });
});

describe("sync-log-status", () => {
  it("sucesso aceita ok/success/sucesso, sem caixa nem espaços", () => {
    for (const s of ["ok", " OK ", "success", "Sucesso"]) expect(syncLogStatusIsSuccess(s)).toBe(true);
    for (const s of [null, undefined, "", "error", "partial"]) expect(syncLogStatusIsSuccess(s)).toBe(false);
  });

  it("erro aceita error/failed/failure/falha", () => {
    for (const s of ["error", "FAILED", "failure", " Falha"]) expect(syncLogStatusIsError(s)).toBe(true);
    for (const s of [null, undefined, "ok", "Parcial"]) expect(syncLogStatusIsError(s)).toBe(false);
  });
});

describe("friendly-labels", () => {
  it("friendlyDescription remove sufixos Stripe e traduz módulo/ação", () => {
    expect(friendlyDescription(null)).toBe("—");
    expect(friendlyDescription("Compra (Stripe cs_test_a1B2c3)")).toBe("Compra");
    expect(friendlyDescription("Compra (Stripe pi_ABCDEFGHIJKLMNOPQRSTUV)")).toBe("Compra");
    expect(friendlyDescription("Uso ai-chat/support")).toBe("Uso Assistente IA — Falar com o suporte");
    expect(friendlyDescription("x mod-x/some_action")).toBe("x mod-x — some action");
    expect(friendlyDescription("  (Stripe cs_live_abc)")).toBe("—");
  });

  it("friendlyFunction/friendlyAction/friendlyBillingAction com fallback", () => {
    expect(friendlyFunction("ai-chat")).toBe("Assistente IA");
    expect(friendlyFunction("outra")).toBe("outra");
    expect(friendlyFunction(null)).toBe("—");
    expect(friendlyAction("remove_bg")).toBe("Remover Fundo");
    expect(friendlyAction("do_thing")).toBe("do thing");
    expect(friendlyAction(null)).toBe("—");
    expect(friendlyBillingAction("trial_started")).toBe("Início Trial");
    expect(friendlyBillingAction("plan_changed")).toBe("plan changed");
    expect(friendlyBillingAction(null)).toBe("—");
  });
});
