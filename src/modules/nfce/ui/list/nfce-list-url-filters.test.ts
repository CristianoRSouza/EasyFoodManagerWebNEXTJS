import { describe, expect, it } from "vitest";
import { parseNfceListUrlFilters } from "./nfce-list-url-filters";

describe("parseNfceListUrlFilters", () => {
  it("usa 'all' e '' quando a URL não tem filtro nenhum", () => {
    expect(parseNfceListUrlFilters(new URLSearchParams())).toEqual({ status: "all", reconcileStatus: "" });
  });

  it("lê ?status=manual_review (link 'Correção manual' do Dashboard)", () => {
    expect(parseNfceListUrlFilters(new URLSearchParams("status=manual_review"))).toEqual({
      status: "manual_review",
      reconcileStatus: "",
    });
  });

  it("lê ?status=all&reconcileStatus=failed (link 'Reconciliação falhou' do Dashboard)", () => {
    expect(parseNfceListUrlFilters(new URLSearchParams("status=all&reconcileStatus=failed"))).toEqual({
      status: "all",
      reconcileStatus: "failed",
    });
  });

  it("lê ?status=unusable (link 'Contingência pendente' do Dashboard)", () => {
    expect(parseNfceListUrlFilters(new URLSearchParams("status=unusable"))).toEqual({
      status: "unusable",
      reconcileStatus: "",
    });
  });
});
