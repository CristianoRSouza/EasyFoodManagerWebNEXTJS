import "server-only";

export const LAN_SESSION_COOKIE = "efm_session";

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function serialize(value: string, maxAgeSec: number, secure: boolean): string {
  const attributes = [`${LAN_SESSION_COOKIE}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSec}`];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export const sessionCookie = (token: string, maxAgeSec: number, secure: boolean) =>
  serialize(encodeURIComponent(token), maxAgeSec, secure);

export const expiredSessionCookie = (secure: boolean) => serialize("", 0, secure);
