import type { NextRequest } from "next/server";
import { getGateway } from "@/server/gateway";

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, { params }: Context): Promise<Response> {
  const { path } = await params;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  return getGateway().forward({
    method: request.method,
    path: `/v1/${path.map(encodeURIComponent).join("/")}`,
    search: request.nextUrl.search,
    headers: request.headers,
    body: hasBody ? await request.arrayBuffer() : null,
    cookieHeader: request.headers.get("cookie"),
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
