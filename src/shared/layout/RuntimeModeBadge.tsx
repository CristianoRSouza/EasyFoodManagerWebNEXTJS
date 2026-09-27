"use client";

import { CloudCog } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { useRuntime } from "@/shared/runtime/runtime-context";

export function RuntimeModeBadge() {
  const { backend, apiDisplayOrigin } = useRuntime();
  const badge =
    backend === "cloud"
      ? {
          label: "Cloud",
          detail: "EasyFoodAPI",
          className: "border-primary/30 bg-primary/10 text-primary",
          tooltip: "Modo 3 via EasyFoodAPI: o navegador fala só com a API, que fala com o banco. Sem conexão direta ao Supabase.",
        }
      : {
          label: "Admin API",
          detail: apiDisplayOrigin,
          className: "border-info/30 bg-info/10 text-info",
          tooltip: `Modo 2: Browser conectado à Admin API HTTP em ${apiDisplayOrigin}. Banco PG é acessado pelo backend local.`,
        };

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`mr-2 hidden min-w-0 max-w-[min(100%,22rem)] cursor-help items-center gap-2 rounded-full border px-2 py-1 text-xs font-medium sm:flex sm:px-3 ${badge.className}`}
          >
            <CloudCog className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="shrink-0">{badge.label}</span>
            {badge.detail && <span className="truncate opacity-80">{badge.detail}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          {badge.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
