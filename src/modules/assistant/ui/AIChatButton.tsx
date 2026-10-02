"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/primitives/tooltip";
import { AIChatPanel } from "./AIChatPanel";

/** Botão flutuante do assistente — `LEGACY/src/components/ai-chat/AIChatButton.tsx`. Só nuvem, com loja. */
export function AIChatButton() {
  const [open, setOpen] = useState(false);

  if (open) {
    return <AIChatPanel open={open} onClose={() => setOpen(false)} />;
  }

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Abrir Assistente IA"
              className={cn(
                "group relative h-14 w-14 rounded-full",
                "flex items-center justify-center",
                "transition-transform duration-300 ease-out",
                "hover:scale-105 active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              <span
                className="pointer-events-none absolute -inset-2 rounded-full opacity-70 blur-xl"
                style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.45), transparent 70%)" }}
              />
              <span
                className="pointer-events-none absolute inset-0 rounded-full animate-ai-conic-spin opacity-90"
                style={{
                  background:
                    "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--primary) / 0.15), hsl(var(--primary)), hsl(var(--primary) / 0.15), hsl(var(--primary)))",
                }}
              />
              <span className="absolute inset-[2px] rounded-full bg-gradient-to-br from-background via-card to-background animate-ai-breathe flex items-center justify-center overflow-hidden">
                <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/10 via-transparent to-primary/20" />
                <Sparkles className="relative h-5 w-5 text-primary" strokeWidth={2.2} />
              </span>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="absolute h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.7)] animate-ai-orbit" />
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={10}>
            Assistente IA
          </TooltipContent>
        </Tooltip>
      </div>
      <AIChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
