"use client";

import { useEffect } from "react";
import { useToast } from "@/shared/ui/use-toast";

/** `/login?expired=1`: chegou aqui porque a sessão venceu no meio do uso. */
export function useExpiredSessionNotice(searchParams: URLSearchParams | null) {
  const { toast } = useToast();
  const expired = searchParams?.get("expired") === "1";
  useEffect(() => {
    if (expired) toast({ title: "Sua sessão expirou. Entre de novo.", variant: "destructive" });
  }, [expired, toast]);
}
