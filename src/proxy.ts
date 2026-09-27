import { NextResponse, type NextRequest } from "next/server";
import { CLOUD_SESSION_COOKIE, LAN_SESSION_COOKIE } from "@/server/session/cookie-names";

export const SESSION_COOKIE_NAMES = [LAN_SESSION_COOKIE, CLOUD_SESSION_COOKIE] as const;

const PUBLIC_PATHS = ["/login", "/reset-password"];

/**
 * Conveniência, não segurança: quem não tem cookie de sessão nem chega a carregar o
 * painel. A autorização de verdade é da API, em toda chamada repassada.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  const hasSession = SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
  if (hasSession) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|easysoft-logo.png).*)"],
};
