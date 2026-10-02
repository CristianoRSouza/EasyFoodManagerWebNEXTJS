"use client";

import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { cn } from "@/shared/ui/cn";

interface CloudFieldWarningProps {
  /** Texto explicativo do tooltip. */
  message?: string;
  className?: string;
}

/**
 * Ícone de aviso para campos que não possuem fonte de dados na nuvem (Modo 3 / Supabase).
 *
 * Use em conjunto com {@link InfoRow} ou diretamente em formulários para sinalizar
 * que o backend cloud não fornece valor para o campo (mantemos `null` no DTO).
 */
export const CloudFieldWarning = ({
  message = "Sem dados na nuvem para este campo. Disponível apenas no modo local (Electron / Admin API).",
  className,
}: CloudFieldWarningProps) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full p-0.5 text-amber-500/90 hover:text-amber-500 cursor-help",
            className,
          )}
          aria-label="Sem dados na nuvem"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
        {message}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
