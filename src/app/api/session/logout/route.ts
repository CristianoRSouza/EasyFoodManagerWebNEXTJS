import type { NextRequest } from "next/server";
import { getGateway } from "@/server/gateway";
import { withCookies } from "@/server/session/to-response";

export async function POST(request: NextRequest) {
  const setCookies = await getGateway().logout(request.headers.get("cookie"));
  return withCookies(new Response(null, { status: 204 }), setCookies);
}
