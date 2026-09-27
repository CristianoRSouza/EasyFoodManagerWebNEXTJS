"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SESSION_EXPIRED_EVENT } from "@/shared/http/session-events";

/** Qualquer 401 do repasse limpa o cache e leva ao login. */
export function SessionExpiredListener() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onExpired = () => {
      queryClient.clear();
      router.replace("/login?expired=1");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient, router]);

  return null;
}
