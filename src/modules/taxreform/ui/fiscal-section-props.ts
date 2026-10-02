import type { ReactNode } from "react";

/**
 * Props comuns a toda seção da tela Configuração fiscal: o filtro de ano é ÚNICO para a página
 * (`filterYear` mora no componente-pai, `NfceIssuerFiscalPage`) e cada seção só recebe a função de
 * checagem já fechada sobre o valor atual, mais o badge pronto para exibir no título do card.
 *
 * `refreshKey` vira a `key` do `LazyFiscalCard` de cada seção: trocar o valor remonta o card
 * (reseta o estado interno de `idle`/`loading`/`done`) e dispara o fetch de novo — mesmo mecanismo
 * do botão "Atualizar dados" do legado.
 */
export interface FiscalSectionProps {
  matchesYear: (dateFields: Array<string | null | undefined>) => boolean;
  yearBadge: ReactNode;
  refreshKey: number;
}
