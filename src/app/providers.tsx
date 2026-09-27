"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/shared/ui/primitives/tooltip";
import { Toaster } from "@/shared/ui/primitives/toaster";
import { Toaster as Sonner } from "@/shared/ui/primitives/sonner";
import { createQueryClient } from "@/shared/http/query-client";
import { SessionExpiredListener } from "@/shared/session/session-expired-listener";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SessionExpiredListener />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
