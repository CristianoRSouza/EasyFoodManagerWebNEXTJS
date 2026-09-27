import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getGateway } from "@/server/gateway";
import { withCookies } from "@/server/session/to-response";

const bodySchema = z.object({
  email: z.string().trim().min(1),
  newPassword: z.string().min(6).max(128),
  provisioningCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "invalid_body", message: "Dados do primeiro acesso inválidos." }, { status: 400 });
  }
  const result = await getGateway().firstAccess(parsed.data);
  if (!result.ok) return withCookies(NextResponse.json(result.error, { status: result.status }), result.setCookies);
  return withCookies(new Response(null, { status: 204 }), result.setCookies);
}
