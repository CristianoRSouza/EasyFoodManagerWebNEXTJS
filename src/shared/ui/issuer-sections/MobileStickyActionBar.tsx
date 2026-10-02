import type { ReactNode } from "react";

/**
 * Sticky action bar visível apenas em mobile (md:hidden).
 * Renderiza fixo no rodapé com safe-area, padronizando ações Salvar/Cancelar/Editar
 * nas páginas do Emitente NFC-e — evita rolagem excessiva para acessar botões.
 */
interface MobileStickyActionBarProps {
  children: ReactNode;
  /** Posição: rodapé (default) ou topo */
  position?: "bottom" | "top";
}

export function MobileStickyActionBar({
  children,
  position = "bottom",
}: MobileStickyActionBarProps) {
  const posClass =
    position === "bottom"
      ? "bottom-0 border-t pb-[env(safe-area-inset-bottom)]"
      : "top-0 border-b pt-[env(safe-area-inset-top)]";

  return (
    <div
      className={`md:hidden fixed left-0 right-0 ${posClass} z-40 bg-card/95 border-border shadow-lg`}
    >
      <div className="flex items-center gap-2 px-3 py-2">{children}</div>
    </div>
  );
}
