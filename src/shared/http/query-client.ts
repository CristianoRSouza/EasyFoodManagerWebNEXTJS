import { QueryClient } from "@tanstack/react-query";

const MAX_RETRIES = 2;

/** 4xx não melhora repetindo (exceto 408, timeout); o resto repete até 2 vezes. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as { status?: unknown } | null | undefined)?.status;
  if (typeof status === "number" && status >= 400 && status < 500 && status !== 408) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}
