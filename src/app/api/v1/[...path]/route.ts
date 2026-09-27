import { NextResponse, type NextRequest } from "next/server";
import { getGateway } from "@/server/gateway";

type Context = { params: Promise<{ path: string[] }> };

const INVALID_SEGMENTS = new Set(["", ".", ".."]);

async function forward(request: NextRequest, { params }: Context): Promise<Response> {
  const { path } = await params;
  if (path.some((segment) => INVALID_SEGMENTS.has(segment))) {
    return NextResponse.json({ code: "invalid_path", message: "Caminho inválido." }, { status: 400 });
  }
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
