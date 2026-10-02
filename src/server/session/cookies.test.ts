// @vitest-environment node
import { LAN_SESSION_COOKIE, expiredSessionCookie, normalizeRelayedCookie, readCookie, sessionCookie } from "./cookies";

describe("cookies de sessão", () => {
  it("lê um cookie entre vários", () => {
    expect(readCookie("a=1; efm_session=abc%2E1; b=2", LAN_SESSION_COOKIE)).toBe("abc.1");
    expect(readCookie(null, LAN_SESSION_COOKIE)).toBeNull();
    expect(readCookie("outro=1", LAN_SESSION_COOKIE)).toBeNull();
  });

  it("cookie malformado não derruba a leitura", () => {
    expect(readCookie("efm_session=%", LAN_SESSION_COOKIE)).toBeNull();
  });

  it("grava httpOnly, SameSite=Lax, com validade e Secure quando pedido", () => {
    expect(sessionCookie("tok", 28800, true)).toBe(
      "efm_session=tok; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800; Secure",
    );
    expect(sessionCookie("tok", 60, false)).not.toContain("Secure");
  });

  it("apagar é gravar vazio com Max-Age=0", () => {
    expect(expiredSessionCookie(false)).toBe("efm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  });
});

describe("normalizeRelayedCookie", () => {
  it("troca Path restrito por Path=/ para o proxy enxergar o cookie em todas as páginas", () => {
    expect(normalizeRelayedCookie("easyfood_session=xyz; Path=/api; HttpOnly")).toBe("easyfood_session=xyz; Path=/; HttpOnly");
  });

  it("remove Domain para o cookie ficar com o host do painel", () => {
    expect(normalizeRelayedCookie("easyfood_session=xyz; Domain=api.nuvem; Path=/; Secure")).toBe("easyfood_session=xyz; Path=/; Secure");
  });

  it("preserva os demais atributos, na ordem", () => {
    expect(normalizeRelayedCookie("easyfood_session=a=b; path=/v1; HttpOnly; SameSite=Lax; Max-Age=60; domain=.x.com; Secure")).toBe(
      "easyfood_session=a=b; Path=/; HttpOnly; SameSite=Lax; Max-Age=60; Secure",
    );
  });

  it("cookie sem Path ganha Path=/", () => {
    expect(normalizeRelayedCookie("easyfood_session=; Max-Age=0")).toBe("easyfood_session=; Max-Age=0; Path=/");
  });
});
