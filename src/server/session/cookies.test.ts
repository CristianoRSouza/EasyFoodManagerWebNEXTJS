// @vitest-environment node
import { LAN_SESSION_COOKIE, expiredSessionCookie, readCookie, sessionCookie } from "./cookies";

describe("cookies de sessão", () => {
  it("lê um cookie entre vários", () => {
    expect(readCookie("a=1; efm_session=abc%2E1; b=2", LAN_SESSION_COOKIE)).toBe("abc.1");
    expect(readCookie(null, LAN_SESSION_COOKIE)).toBeNull();
    expect(readCookie("outro=1", LAN_SESSION_COOKIE)).toBeNull();
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
