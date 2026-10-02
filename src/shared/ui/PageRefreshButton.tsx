"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";

type PageRefreshButtonProps = {
  onClick: () => void | Promise<unknown>;
  /** Se omitido, o componente gerencia o estado internamente com base na Promise do onClick. */
  refreshing?: boolean;
};

export function PageRefreshButton({ onClick, refreshing }: PageRefreshButtonProps) {
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const isControlled = typeof refreshing === "boolean";
  const isSpinning = isControlled ? refreshing : internalRefreshing;

  const handleClick = async () => {
    if (isSpinning) return;
    try {
      if (!isControlled) setInternalRefreshing(true);
      const result = onClick();
      if (result && typeof (result as Promise<unknown>).then === "function") {
        await result;
      } else if (!isControlled) {
        // Garante feedback visual mínimo mesmo em onClick síncrono
        await new Promise((r) => setTimeout(r, 600));
      }
    } finally {
      if (!isControlled) setInternalRefreshing(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isSpinning}>
      <RefreshCw className={`mr-2 h-4 w-4 ${isSpinning ? "animate-spin" : ""}`} />
      {isSpinning ? "Atualizando..." : "Atualizar dados"}
    </Button>
  );
}
