// @vitest-environment node
import { readClaims } from "./jwt-claims";

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = (payload: object) => `${encode({ alg: "HS256" })}.${encode(payload)}.assinatura`;

describe("readClaims", () => {
  it("lê sub e email de um token válido no tempo", () => {
    expect(readClaims(token({ sub: "u1", email: "a@b.com", exp: 2000 }), 1000)).toEqual({ sub: "u1", email: "a@b.com" });
  });

  it("token vencido não serve", () => {
    expect(readClaims(token({ sub: "u1", email: "a@b.com", exp: 999 }), 1000)).toBeNull();
  });

  it("token malformado não serve", () => {
    expect(readClaims("lixo", 1000)).toBeNull();
    expect(readClaims(token({ email: "a@b.com", exp: 2000 }), 1000)).toBeNull();
  });
});
