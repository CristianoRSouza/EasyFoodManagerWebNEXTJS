import { NextResponse, type NextRequest } from "next/server";
import { getGateway } from "@/server/gateway";

export async function GET(request: NextRequest) {
  const user = await getGateway().currentUser(request.headers.get("cookie"));
  if (!user) {
    return NextResponse.json({ code: "unauthenticated", message: "Sua sessão expirou. Entre de novo." }, { status: 401 });
  }
  return NextResponse.json({ user });
}
