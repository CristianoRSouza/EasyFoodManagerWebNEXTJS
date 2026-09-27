import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGateway } from "@/server/gateway";
import { resultToResponse } from "@/server/session/to-response";

const bodySchema = z.object({ email: z.string().trim().min(1), password: z.string().min(1) });

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "invalid_body", message: "Preencha email e senha" }, { status: 400 });
  }
  const result = await getGateway().login(parsed.data);
  return resultToResponse(result, (user) => ({ user }));
}
