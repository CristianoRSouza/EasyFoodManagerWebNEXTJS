import { describe, expect, it } from "vitest";
import { toQueryString } from "./query-string";

describe("toQueryString", () => {
  it("omite null/undefined/vazio e, por padrão, o valor de filtro \"all\"", () => {
    expect(toQueryString({ a: 1, b: null, c: undefined, d: "", e: "all", f: "x y" })).toBe("?a=1&f=x+y");
    expect(toQueryString({ a: null })).toBe("");
  });

  it("dropAll: false mantém \"all\" (termo de busca do Espelho FB↔PG)", () => {
    expect(toQueryString({ q: "all", status: null }, { dropAll: false })).toBe("?q=all");
  });
});
