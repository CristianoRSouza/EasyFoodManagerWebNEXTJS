import { describe, expect, it } from "vitest";
import { ISSUER_ROW, ISSUER_CARD, ISSUER_GRID } from "./responsive-tokens";

describe("ISSUER_GRID", () => {
  it("expõe as quatro variantes usadas por IssuerFieldGrid", () => {
    expect(Object.keys(ISSUER_GRID).sort()).toEqual(
      ["mainSections", "threeCols", "threeColsCompact", "twoCols"].sort(),
    );
  });

  it("cada variante é uma classe grid", () => {
    for (const value of Object.values(ISSUER_GRID)) {
      expect(value).toContain("grid");
    }
  });
});

describe("ISSUER_ROW", () => {
  it("expõe as classes usadas por InfoRow/EditableInfoRow", () => {
    expect(Object.keys(ISSUER_ROW).sort()).toEqual(
      ["container", "containerReadonly", "input", "label", "value"].sort(),
    );
  });
});

describe("ISSUER_CARD", () => {
  it("expõe as classes usadas por IssuerSectionCard", () => {
    expect(Object.keys(ISSUER_CARD).sort()).toEqual(["content", "header", "root", "title"].sort());
  });
});
