import "server-only";
import { NextResponse } from "next/server";
import type { GatewayResult } from "./session-gateway";

export function withCookies<T extends Response>(response: T, setCookies: string[]): T {
  for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
  return response;
}

export function resultToResponse<T>(result: GatewayResult<T>, toBody: (data: T) => unknown): NextResponse {
  const response = result.ok
    ? NextResponse.json(toBody(result.data))
    : NextResponse.json(result.error, { status: result.status });
  return withCookies(response, result.setCookies);
}
