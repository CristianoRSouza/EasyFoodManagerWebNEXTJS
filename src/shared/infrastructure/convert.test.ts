import { asBoolean, asBooleanOrNull, asJsonObject, asNumber, asNumberOrNull, asText } from "./convert";

describe("asText", () => {
  it("mantém texto não vazio como veio", () => {
    expect(asText("Coxinha")).toBe("Coxinha");
    expect(asText(" 0.00 ")).toBe(" 0.00 ");
  });

  it("converte número finito em texto (PG devolve integer como número)", () => {
    expect(asText(42)).toBe("42");
    expect(asText(0)).toBe("0");
  });

  it("vazio, só espaços, não finito ou outro tipo vira null", () => {
    for (const value of ["", "   ", Number.NaN, Number.POSITIVE_INFINITY, null, undefined, true, {}, []]) {
      expect(asText(value)).toBeNull();
    }
  });
});

describe("asNumber", () => {
  it("aceita número e texto numérico (PG devolve numeric como texto)", () => {
    expect(asNumber(8.5)).toBe(8.5);
    expect(asNumber("8.50")).toBe(8.5);
    expect(asNumber(" 12 ")).toBe(12);
  });

  it("devolve o fallback (padrão 0) quando não dá para converter", () => {
    expect(asNumber("abc")).toBe(0);
    expect(asNumber("")).toBe(0);
    expect(asNumber(null)).toBe(0);
    expect(asNumber(Number.NaN)).toBe(0);
    expect(asNumber(undefined, 1)).toBe(1);
    expect(asNumber("x", 1)).toBe(1);
  });
});

describe("asNumberOrNull", () => {
  it("null/undefined viram null; o resto passa por asNumber", () => {
    expect(asNumberOrNull(null)).toBeNull();
    expect(asNumberOrNull(undefined)).toBeNull();
    expect(asNumberOrNull("0.00")).toBe(0);
    expect(asNumberOrNull("abc")).toBe(0);
  });
});

describe("asBoolean / asBooleanOrNull", () => {
  it("aceita booleano e os textos do PG (`true`/`t`)", () => {
    expect(asBoolean(true)).toBe(true);
    expect(asBoolean("true")).toBe(true);
    expect(asBoolean("t")).toBe(true);
    expect(asBoolean("f")).toBe(false);
    expect(asBoolean(1)).toBe(false);
  });

  it("asBooleanOrNull preserva a ausência", () => {
    expect(asBooleanOrNull(null)).toBeNull();
    expect(asBooleanOrNull(undefined)).toBeNull();
    expect(asBooleanOrNull(false)).toBe(false);
  });
});

describe("asJsonObject", () => {
  it("aceita objeto como veio e texto JSON decodificado", () => {
    const snapshot = { storedAt: "2026-01-15T10:22:05Z" };
    expect(asJsonObject(snapshot)).toBe(snapshot);
    expect(asJsonObject('{"storedAt":"x"}')).toEqual({ storedAt: "x" });
  });

  it("ausente, texto inválido, JSON que não é objeto ou outro tipo vira null", () => {
    for (const value of [null, undefined, "{nope", '"texto"', "42", "null", 42, true]) {
      expect(asJsonObject(value)).toBeNull();
    }
  });
});
