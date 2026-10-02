"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { buildPageItems } from "../domain/unified-audit-log";

interface Props {
  safePage: number;
  totalPages: number;
  setCurrentPage: (update: (page: number) => number) => void;
}

/** Paginação de `LEGACY/src/pages/AuditLogsPage.tsx` (JSX e classes copiados). */
export function AuditLogsPagination({ safePage, totalPages, setCurrentPage }: Props): ReactNode {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pb-4 sm:px-6">
      <span className="text-xs text-muted-foreground">
        Página {safePage} de {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Página anterior"
          disabled={safePage <= 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {buildPageItems(totalPages, safePage).map((item, idx) =>
          item === "ellipsis" ? (
            <span key={`e${idx}`} className="px-1 text-xs text-muted-foreground">…</span>
          ) : (
            <Button
              key={item}
              variant={item === safePage ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => setCurrentPage(() => item)}
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Próxima página"
          disabled={safePage >= totalPages}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
