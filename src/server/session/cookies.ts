import "server-only";
import { LAN_SESSION_COOKIE } from "./cookie-names";

export { LAN_SESSION_COOKIE };

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        // Cookie vem do cliente — um valor mal formado (ex.: "%") não pode virar 500; é sessão ausente.
        return null;
      }
    }
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

const DROPPED_ATTRIBUTES = new Set(["domain", "path"]);

/**
 * Ajusta um `Set-Cookie` vindo do backend para valer no painel inteiro: sem `Domain`
 * (fica com o host do Next) e com `Path=/` (o proxy precisa vê-lo em toda página).
 * Os demais atributos passam intactos, na mesma ordem.
 */
export function normalizeRelayedCookie(setCookie: string): string {
  const [nameValue = "", ...attributes] = setCookie.split(";").map((part) => part.trim());
  let hadPath = false;
  const kept: string[] = [];
  for (const attribute of attributes) {
    if (!attribute) continue;
    const key = attribute.split("=")[0]!.trim().toLowerCase();
    if (key === "path" && !hadPath) {
      hadPath = true;
      kept.push("Path=/");
    } else if (!DROPPED_ATTRIBUTES.has(key)) {
      kept.push(attribute);
    }
  }
  if (!hadPath) kept.push("Path=/");
  return [nameValue, ...kept].join("; ");
}
