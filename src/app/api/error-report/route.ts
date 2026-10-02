import type { NextRequest } from "next/server";
import { getGateway } from "@/server/gateway";
import { readErrorReportConfig } from "@/server/error-report/error-report-config";
import { ERROR_REPORT_LIMITS, handleErrorReport } from "@/server/error-report/handle-error-report";

/**
 * IP de quem chamou. O servidor do Next preenche `x-forwarded-for` com o endereço do socket quando
 * não há proxy; atrás do proxy reverso vale o primeiro da lista. É só a chave do limite por IP —
 * o limite por usuário (sessão verificada) não depende dele.
 */
function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim() || "desconhecido";
}

/** Relatório automático de erros do painel — ver `src/server/error-report/handle-error-report.ts`. */
export async function POST(request: NextRequest): Promise<Response> {
  const gateway = getGateway();
  return handleErrorReport(
    { url: request.url, headers: request.headers, body: request.body, clientIp: clientIp(request.headers) },
    { config: readErrorReportConfig(), verifiedUser: (cookie) => gateway.verifiedUser(cookie), limits: ERROR_REPORT_LIMITS },
  );
}
