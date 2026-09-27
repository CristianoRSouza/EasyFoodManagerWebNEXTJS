import { NextResponse, type NextRequest } from "next/server";
import { getGateway } from "@/server/gateway";
import { SESSION_EXPIRED } from "@/server/session/json-response";

export async function GET(request: NextRequest) {
  const user = await getGateway().currentUser(request.headers.get("cookie"));
  if (!user) return NextResponse.json(SESSION_EXPIRED, { status: 401 });
  return NextResponse.json({ user });
}
